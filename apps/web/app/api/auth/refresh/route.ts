import { NextRequest, NextResponse } from "next/server";
import {
  generateAccessToken,
  generateRefreshToken,
  validateRefreshToken,
  rotateRefreshToken,
  verifyAccessTokenAllowExpired,
  setAuthCookies,
} from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get(COOKIE_NAMES.REFRESH_TOKEN)?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token no proporcionado" },
        { status: 401 }
      );
    }

    // Obtener el token de sesión actual para extraer el userId
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json(
        { error: "Sesión no válida" },
        { status: 401 }
      );
    }

    let payload;
    try {
      // El caso normal de uso: el access token ya expiró (por eso se llama a
      // /refresh) pero su firma sigue siendo válida.
      payload = await verifyAccessTokenAllowExpired(sessionToken);
    } catch {
      return NextResponse.json(
        { error: "Sesión no válida" },
        { status: 401 }
      );
    }

    const userId = payload.sub;

    // Validar refresh token
    const { valid, tokenId } = await validateRefreshToken(refreshToken, userId);
    if (!valid || !tokenId) {
      return NextResponse.json(
        { error: "Refresh token inválido o expirado" },
        { status: 401 }
      );
    }

    // Rotar refresh token (invalidar el viejo, crear uno nuevo)
    const newRefreshToken = await rotateRefreshToken(tokenId, userId);

    // Generar nuevo access token
    const newAccessToken = await generateAccessToken(
      userId,
      payload.email,
      payload.orgId,
      payload.roles
    );

    const response = NextResponse.json({
      success: true,
      message: "Token renovado exitosamente",
    });

    // Set new cookies
    setAuthCookies(
      (name, value, options) => response.cookies.set(name, value, options),
      newAccessToken,
      newRefreshToken
    );

    return response;
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
