import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";
import { getPendingInvitationsForEmail } from "@/lib/services";

// Invitaciones pendientes del usuario autenticado, sin importar la
// organización: a diferencia de /api/organizations/[slug]/notifications,
// esta ruta NO exige pertenencia previa a ninguna organización, porque
// justamente sirve para que alguien recién invitado pueda descubrir su
// invitación antes de ser miembro.
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);

    const user = await prisma.user.findFirst({
      where: { id: payload.sub },
      select: { email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const invitations = await getPendingInvitationsForEmail(user.email);

    return NextResponse.json({
      success: true,
      data: invitations.map((i) => ({
        id: i.id,
        role: i.role,
        organizationSlug: i.organization.slug,
        organizationName: i.organization.name,
        invitedBy: i.invitedBy?.name || "Alguien",
        createdAt: i.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get pending invitations error:", error);
    return NextResponse.json({ error: "Error obteniendo invitaciones" }, { status: 500 });
  }
}
