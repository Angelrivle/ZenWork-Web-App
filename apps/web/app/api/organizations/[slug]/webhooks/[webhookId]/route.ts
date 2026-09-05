import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";

async function getOrgWithRole(slug: string, userId: string) {
  return prisma.organization.findFirst({
    where: {
      slug,
      memberships: { some: { userId, isActive: true } },
      deletedAt: null,
    },
    include: {
      memberships: { where: { userId, isActive: true }, select: { role: true } },
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; webhookId: string }> }
) {
  try {
    const { slug, webhookId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);
    const org = await getOrgWithRole(slug, payload.sub);
    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const myRole = org.memberships[0]?.role || "GUEST";
    if (myRole !== "OWNER" && myRole !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos para eliminar webhooks" }, { status: 403 });
    }

    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, organizationId: org.id },
      select: { id: true },
    });
    if (!webhook) {
      return NextResponse.json({ error: "Webhook no encontrado" }, { status: 404 });
    }

    await prisma.webhook.delete({ where: { id: webhookId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete webhook error:", error);
    return NextResponse.json({ error: "Error eliminando webhook" }, { status: 500 });
  }
}
