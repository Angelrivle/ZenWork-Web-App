import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, generateAccessToken, generateRefreshToken, storeRefreshToken, setAuthCookies } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { loginSchema } from "@zenwork/shared";
import { checkLoginRateLimit, validateRequest } from "@zenwork/middleware";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    // Rate limiting para login
    const rateLimit = await checkLoginRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos de login. Intenta más tarde." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter || 60),
          },
        }
      );
    }

    const body = await request.json();

    // Validar input
    const validation = validateRequest(loginSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.errors },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash) {
      // No revelar si el email existe o no
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "Cuenta desactivada" },
        { status: 403 }
      );
    }

    // Verificar contraseña
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // Verificar si 2FA está habilitado
    const twoFactorConfig = await prisma.twoFactorConfig.findUnique({
      where: { userId: user.id },
    });

    if (twoFactorConfig?.enabled) {
      // Retornar token temporal para verificación 2FA
      const tempToken = await generateAccessToken(user.id, user.email);

      return NextResponse.json({
        requires2FA: true,
        tempToken,
        message: "Se requiere verificación de dos factores",
      });
    }

    // Generar tokens
    const accessToken = await generateAccessToken(user.id, user.email);
    const refreshToken = await generateRefreshToken();
    await storeRefreshToken(user.id, refreshToken);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "auth.login",
        resourceType: "user",
        resourceId: user.id,
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    // Obtener organizaciones del usuario
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

    // Set cookies
    const cookieStore = response.cookies;
    setAuthCookies(
      (name, value, options) => cookieStore.set(name, value, options),
      accessToken,
      refreshToken
    );

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
