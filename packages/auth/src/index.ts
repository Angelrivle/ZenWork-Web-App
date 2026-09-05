import { prisma } from "@zenwork/db";
import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import { hash, verify } from "argon2";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import CryptoJS from "crypto-js";
import {
  JWT_CONFIG,
  TWO_FACTOR_CONFIG,
  COOKIE_NAMES,
} from "@zenwork/shared";
import type { OrgRole, JWTPayload } from "@zenwork/shared";

// ============================================================
// PASSWORD UTILITIES (Argon2id)
// ============================================================

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    type: 2, // Argon2id
    memoryCost: 65536, // 64MB
    timeCost: 3, // 3 iteraciones
    parallelism: 4, // 4 threads
  });
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return verify(hash, password);
}

// ============================================================
// JWT UTILITIES
// ============================================================

const accessSecret = new TextEncoder().encode(
  process.env.ZENWORK_JWT_SECRET || "dev-jwt-secret"
);
const refreshSecret = new TextEncoder().encode(
  process.env.ZENWORK_JWT_REFRESH_SECRET || "dev-refresh-secret"
);

export async function generateAccessToken(
  userId: string,
  email: string,
  orgId?: string,
  roles?: OrgRole[]
): Promise<string> {
  const payload: JWTPayload = {
    sub: userId,
    email,
    orgId,
    roles: roles || [],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
  };

  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: JWT_CONFIG.ALGORITHM })
    .setIssuer(JWT_CONFIG.ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${JWT_CONFIG.ACCESS_TOKEN_EXPIRY}s`)
    .sign(accessSecret);
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, accessSecret, {
    issuer: JWT_CONFIG.ISSUER,
  });
  return payload as unknown as JWTPayload;
}

// Igual que verifyAccessToken, pero acepta un token con la firma válida
// aunque haya expirado. Solo debe usarse para el flujo de /api/auth/refresh:
// ahí el access token SIEMPRE está expirado (es el caso de uso normal), así
// que exigir que siga vigente para poder renovarlo hacía el refresh
// inalcanzable. La firma se sigue verificando igual, así que no debilita la
// seguridad: un token alterado o de otro emisor sigue siendo rechazado.
export async function verifyAccessTokenAllowExpired(
  token: string
): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, accessSecret, {
      issuer: JWT_CONFIG.ISSUER,
    });
    return payload as unknown as JWTPayload;
  } catch (error) {
    if (error instanceof joseErrors.JWTExpired) {
      return error.payload as unknown as JWTPayload;
    }
    throw error;
  }
}

export async function generateRefreshToken(): Promise<string> {
  return nanoid(64); // Token aleatorio de 64 caracteres
}

export async function storeRefreshToken(
  userId: string,
  token: string
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 días

  await prisma.refreshToken.create({
    data: {
      userId,
      token: await hash(token),
      expiresAt,
    },
  });
}

export async function validateRefreshToken(
  token: string,
  userId: string
): Promise<{ valid: boolean; tokenId?: string }> {
  const tokens = await prisma.refreshToken.findMany({
    where: { userId, revoked: false },
  });

  for (const storedToken of tokens) {
    const isValid = await verify(storedToken.token, token);
    if (isValid) {
      if (new Date() > storedToken.expiresAt) {
        await prisma.refreshToken.update({
          where: { id: storedToken.id },
          data: { revoked: true },
        });
        return { valid: false };
      }
      return { valid: true, tokenId: storedToken.id };
    }
  }

  return { valid: false };
}

export async function rotateRefreshToken(
  oldTokenId: string,
  userId: string
): Promise<string> {
  // Revocar el token antiguo
  await prisma.refreshToken.update({
    where: { id: oldTokenId },
    data: { revoked: true },
  });

  // Generar y almacenar nuevo token
  const newToken = await generateRefreshToken();
  await storeRefreshToken(userId, newToken);

  return newToken;
}

// ============================================================
// 2FA (TOTP)
// ============================================================

export async function generateTwoFactorSecret(
  email: string
): Promise<{ secret: string; otpauthUrl: string; qrCodeDataUrl: string }> {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(email, TWO_FACTOR_CONFIG.ISSUER, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return { secret, otpauthUrl, qrCodeDataUrl };
}

export function verifyTwoFactorToken(
  secret: string,
  token: string
): boolean {
  return authenticator.verify({ token, secret });
}

export async function enableTwoFactor(
  userId: string,
  secret: string,
  token: string
): Promise<{ backupCodes: string[] }> {
  // Verificar que el token es válido
  if (!verifyTwoFactorToken(secret, token)) {
    throw new Error("Código TOTP inválido");
  }

  // Encriptar el secret para almacenarlo
  const encryptedSecret = CryptoJS.AES.encrypt(
    secret,
    process.env.ZENWORK_2FA_SECRET_KEY || "dev-2fa-key"
  ).toString();

  // Guardar configuración 2FA
  await prisma.twoFactorConfig.upsert({
    where: { userId },
    update: {
      secret: encryptedSecret,
      enabled: true,
    },
    create: {
      userId,
      secret: encryptedSecret,
      enabled: true,
    },
  });

  // Generar códigos de respaldo
  const backupCodes = await generateBackupCodes(userId);

  return { backupCodes };
}

export async function generateBackupCodes(
  userId: string
): Promise<string[]> {
  const codes: string[] = [];
  const codeHashes: string[] = [];

  for (let i = 0; i < TWO_FACTOR_CONFIG.BACKUP_CODES_COUNT; i++) {
    const code = nanoid(8).toUpperCase(); // Código de 8 caracteres
    codes.push(code);
    codeHashes.push(await hash(code));
  }

  // Eliminar códigos anteriores
  await prisma.twoFactorBackupCode.deleteMany({
    where: { userId },
  });

  // Guardar nuevos códigos hasheados
  await prisma.twoFactorBackupCode.createMany({
    data: codeHashes.map((codeHash) => ({
      userId,
      codeHash,
    })),
  });

  return codes;
}

export async function verifyBackupCode(
  userId: string,
  code: string
): Promise<boolean> {
  const backupCodes = await prisma.twoFactorBackupCode.findMany({
    where: { userId, used: false },
  });

  for (const backupCode of backupCodes) {
    const isValid = await verify(backupCode.codeHash, code);
    if (isValid) {
      await prisma.twoFactorBackupCode.update({
        where: { id: backupCode.id },
        data: { used: true, usedAt: new Date() },
      });
      return true;
    }
  }

  return false;
}

// ============================================================
// INVITATION UTILITIES
// ============================================================

export async function createInvitation(
  email: string,
  organizationId: string,
  role: OrgRole,
  invitedById: string
): Promise<{ token: string; expiresAt: Date }> {
  const token = nanoid(64);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

  await prisma.invitation.create({
    data: {
      email,
      organizationId,
      role,
      token,
      invitedById,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ organizationId: string; role: OrgRole }> {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    throw new Error("Invitación no encontrada");
  }

  if (invitation.status !== "PENDING") {
    throw new Error("Invitación ya fue procesada");
  }

  if (new Date() > invitation.expiresAt) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("Invitación expirada");
  }

  // Crear membresía y actualizar invitación en transacción
  const result = await prisma.$transaction(async (tx) => {
    const membership = await tx.membership.create({
      data: {
        userId,
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    return membership;
  });

  return {
    organizationId: result.organizationId,
    role: result.role as OrgRole,
  };
}

// ============================================================
// COOKIE UTILITIES
// ============================================================

export function setAuthCookies(
  setCookie: (name: string, value: string, options: Record<string, unknown>) => void,
  accessToken: string,
  refreshToken: string
) {
  setCookie(COOKIE_NAMES.SESSION, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: JWT_CONFIG.ACCESS_TOKEN_EXPIRY,
  });

  setCookie(COOKIE_NAMES.REFRESH_TOKEN, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: JWT_CONFIG.REFRESH_TOKEN_EXPIRY,
  });
}

export function clearAuthCookies(
  deleteCookie: (name: string, options: Record<string, unknown>) => void
) {
  deleteCookie(COOKIE_NAMES.SESSION, { path: "/" });
  deleteCookie(COOKIE_NAMES.REFRESH_TOKEN, { path: "/" });
}
