import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { inviteMemberSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest, checkApiRateLimit } from "@zenwork/middleware";
import { getMembers, getInvitations, inviteMember } from "@/lib/services";
import { sendInvitationEmail } from "@/lib/email";

async function getOrgWithRole(slug: string, userId: string) {
  return prisma.organization.findFirst({
    where: {
      slug,
      memberships: { some: { userId, isActive: true } },
      deletedAt: null,
    },
    include: {
      memberships: {
        where: { userId, isActive: true },
        select: { role: true },
      },
    },
  });
}

export async function GET(
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
    const org = await getOrgWithRole(slug, payload.sub);
    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const [members, invitations] = await Promise.all([
      getMembers(org.id),
      getInvitations(org.id),
    ]);

    return NextResponse.json({ success: true, data: { members, invitations, myRole: org.memberships[0]?.role } });
  } catch (error) {
    console.error("Get members error:", error);
    return NextResponse.json({ error: "Error obteniendo miembros" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkApiRateLimit(`invite:${ip}`);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit excedido" }, { status: 429 });
    }

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
      return NextResponse.json({ error: "Sin permisos para invitar miembros" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(inviteMemberSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.errors }, { status: 400 });
    }

    // Un Admin no puede invitar a otro Admin
    if (myRole === "ADMIN" && validation.data.role === "ADMIN") {
      return NextResponse.json({ error: "Solo el OWNER puede invitar administradores" }, { status: 403 });
    }

    try {
      const invitation = await inviteMember(org.id, payload.sub, validation.data.email, validation.data.role || "MEMBER");

      // Notificación + email al invitado (fire-and-forget, no bloquea la respuesta)
      void notifyAndEmailInvite(org, payload.sub, invitation);

      return NextResponse.json({ success: true, data: invitation }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Error al invitar" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Invite member error:", error);
    return NextResponse.json({ error: "Error al invitar miembro" }, { status: 500 });
  }
}

async function notifyAndEmailInvite(
  org: { id: string; name: string },
  inviterId: string,
  invitation: { id: string; email: string; role: string }
) {
  try {
    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { name: true },
    });

    const targetUser = await prisma.user.findFirst({
      where: { email: invitation.email.toLowerCase() },
      select: { id: true },
    });

    if (targetUser) {
      await prisma.notification.create({
        data: {
          organizationId: org.id,
          userId: targetUser.id,
          type: "invite",
          title: "Nueva invitación",
          message: `${inviter?.name || "Alguien"} te invitó a ${org.name} como ${invitation.role}.`,
          data: JSON.stringify({ invitationId: invitation.id }),
        },
      });
    }

    // Apunta al home: ahí es donde el invitado ve y acepta sus invitaciones
    // pendientes (no puede acceder a la página de la organización todavía).
    const inviteUrl = `${process.env.ZENWORK_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"}/`;
    await sendInvitationEmail({
      to: invitation.email,
      orgName: org.name,
      inviterName: inviter?.name || "Un miembro del equipo",
      role: invitation.role,
      inviteUrl,
    });
  } catch (error) {
    console.error("Error en notifyAndEmailInvite:", error);
  }
}