import { NextRequest, NextResponse } from "next/server";
import { generateTwoFactorSecret, enableTwoFactor } from "@zenwork/auth";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES, twoFactorEnableSchema } from "@zenwork/shared";
import { validateRequest } from "@zenwork/middleware";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);
    const userId = payload.sub;

    const body = await request.json();

    // Validar input
    const validation = validateRequest(twoFactorEnableSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.errors },
        { status: 400 }
      );
    }

    const { secret, token } = validation.data;

    // Habilitar 2FA y generar códigos de respaldo
    const { backupCodes } = await enableTwoFactor(userId, secret, token);

    return NextResponse.json({
      success: true,
      message: "Autenticación de dos factores habilitada",
      backupCodes,
      warning: "Guarda estos códigos de respaldo en un lugar seguro. Solo se muestran una vez.",
    });
  } catch (error) {
    console.error("2FA enable error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Error habilitando 2FA" },
      { status: 400 }
    );
  }
}
