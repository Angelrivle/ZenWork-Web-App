import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";
import { revokeInvitation } from "@/lib/services";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; invitationId: string }> }
) {
  try {
    const { slug, invitationId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);
    const org = await prisma.organization.findFirst({
      where: {
        slug,
        memberships: { some: { userId: payload.sub, isActive: true, role: { in: ["OWNER", "ADMIN"] } } },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, organizationId: org.id, status: "PENDING" },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    await revokeInvitation(invitationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke invitation error:", error);
    return NextResponse.json({ error: "Error al revocar la invitación" }, { status: 500 });
  }
}