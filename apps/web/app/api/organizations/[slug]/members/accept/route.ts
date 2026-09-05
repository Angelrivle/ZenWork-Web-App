import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";
import { acceptInvitation } from "@/lib/services";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);

    const user = await prisma.user.findFirst({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const org = await prisma.organization.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const body: { invitationId?: string } = await request.json();
    if (typeof body.invitationId !== "string" || !body.invitationId) {
      return NextResponse.json({ error: "Falta la invitación" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: body.invitationId, organizationId: org.id },
      select: { status: true },
    });
    if (!invitation) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    try {
      const membership = await acceptInvitation(body.invitationId, user.id, user.email);
      return NextResponse.json({ success: true, data: { role: membership.role } }, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Error al aceptar la invitación" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Accept invitation error:", error);
    return NextResponse.json({ error: "Error al aceptar la invitación" }, { status: 500 });
  }
}