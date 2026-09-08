import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        timezone: true,
        language: true,
        createdAt: true,
        accounts: {
          select: {
            id: true,
            provider: true,
            providerEmail: true,
            createdAt: true,
          },
        },
        twoFactorConfig: {
          select: {
            enabled: true,
          },
        },
        memberships: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Get user profile error:", error);
    return NextResponse.json({ error: "Error obteniendo perfil" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);
    const body = await request.json();

    const { name, timezone, language, avatar } = body;

    const updatedUser = await prisma.user.update({
      where: { id: payload.sub },
      data: {
        ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
        ...(typeof timezone === "string" ? { timezone } : {}),
        ...(typeof language === "string" ? { language } : {}),
        ...(typeof avatar === "string" ? { avatar } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        timezone: true,
        language: true,
      },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Update user profile error:", error);
    return NextResponse.json({ error: "Error actualizando perfil" }, { status: 500 });
  }
}
