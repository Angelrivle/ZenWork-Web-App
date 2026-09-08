import { NextRequest, NextResponse } from "next/server";
import { generateAccessToken, generateRefreshToken, storeRefreshToken, verifyTwoFactorToken, verifyBackupCode, setAuthCookies, verifyTwoFactorTempToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { twoFactorVerifySchema } from "@zenwork/shared";
import { validateRequest } from "@zenwork/middleware";
import CryptoJS from "crypto-js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const tempToken = request.headers.get("x-2fa-token");

    if (!tempToken) {
      return NextResponse.json(
        { error: "Token temporal no proporcionado" },
        { status: 400 }
      );
    }

    // Decodificar y verificar el token temporal para obtener userId
    let userId: string;
    try {
      const payload = await verifyTwoFactorTempToken(tempToken);
      userId = payload.sub;
    } catch {
      return NextResponse.json(
        { error: "Token temporal inválido o expirado" },
        { status: 401 }
      );
    }

    const validation = validateRequest(twoFactorVerifySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Código inválido", details: validation.errors },
        { status: 400 }
      );
    }

    const { token } = validation.data;

    // Obtener configuración 2FA del usuario
    const twoFactorConfig = await prisma.twoFactorConfig.findUnique({
      where: { userId },
    });

    if (!twoFactorConfig || !twoFactorConfig.enabled) {
      return NextResponse.json(
        { error: "2FA no está habilitado" },
        { status: 400 }
      );
    }

    // Desencriptar secret
    const decryptedSecret = CryptoJS.AES.decrypt(
      twoFactorConfig.secret,
      process.env.ZENWORK_2FA_SECRET_KEY || "dev-2fa-key"
    ).toString(CryptoJS.enc.Utf8);

    // Verificar código TOTP
    const isValidToken = verifyTwoFactorToken(decryptedSecret, token);

    // Si no es TOTP válido, intentar con código de respaldo
    let isBackupCode = false;
    if (!isValidToken) {
      const isValidBackup = await verifyBackupCode(userId, token);
      if (!isValidBackup) {
        return NextResponse.json(
          { error: "Código inválido" },
          { status: 401 }
        );
      }
      isBackupCode = true;
    }

    // Generar tokens de sesión completos
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const accessToken = await generateAccessToken(user.id, user.email);
    const refreshToken = await generateRefreshToken();
    await storeRefreshToken(user.id, refreshToken);

    // Obtener organizaciones
    const memberships = await prisma.membership.findMany({
      where: { userId: user.id, isActive: true },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    const response = NextResponse.json({
      success: true,
      message: isBackupCode
        ? "Autenticado con código de respaldo"
        : "Autenticación verificada",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
      organizations: memberships.map((m) => ({
        ...m.organization,
        role: m.role,
      })),
    });

    setAuthCookies(
      (name, value, options) => response.cookies.set(name, value, options),
      accessToken,
      refreshToken
    );

    return response;
  } catch (error) {
    console.error("2FA verify error:", error);
    return NextResponse.json(
      { error: "Error verificando 2FA" },
      { status: 500 }
    );
  }
}
