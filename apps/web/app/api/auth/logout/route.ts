import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, verifyAccessTokenAllowExpired } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
  if (sessionToken) {
    try {
      // Un access token expirado (caso normal si el usuario tardó en salir)
      // no debe impedir revocar sus refresh tokens.
      const payload = await verifyAccessTokenAllowExpired(sessionToken);
      await prisma.refreshToken.updateMany({
        where: { userId: payload.sub, revoked: false },
        data: { revoked: true },
      });
      await prisma.auditLog.create({
        data: {
          userId: payload.sub,
          action: "auth.logout",
          resourceType: "user",
          resourceId: payload.sub,
          ipAddress: request.headers.get("x-forwarded-for") || undefined,
          userAgent: request.headers.get("user-agent") || undefined,
        },
      });
    } catch {
      // token inválido: solo limpiar cookies
    }
  }

  clearAuthCookies((name) => response.cookies.delete(name));
  return response;
}