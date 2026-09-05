import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";
import { changeMemberRole, removeMember } from "@/lib/services";

const VALID_ROLES = ["OWNER", "ADMIN", "MEMBER", "GUEST"];

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  try {
    const { slug, userId: targetUserId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);
    if (payload.sub === targetUserId) {
      return NextResponse.json({ error: "No puedes cambiar tu propio rol" }, { status: 400 });
    }

    const org = await getOrgWithRole(slug, payload.sub);
    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const myRole = org.memberships[0]?.role || "GUEST";
    if (myRole !== "OWNER" && myRole !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos para modificar roles" }, { status: 403 });
    }

    const body = await request.json();
    const role = body?.role as string;
    if (!role || !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const target = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: targetUserId, organizationId: org.id } },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) {
      return NextResponse.json({ error: "El usuario no pertenece a esta organización" }, { status: 404 });
    }

    // Reglas: solo OWNER administra OWNERS; ADMIN solo gestiona MEMBER/GUEST
    if (target.role === "OWNER") {
      return NextResponse.json({ error: "No puedes cambiar el rol del propietario" }, { status: 403 });
    }
    if (myRole === "ADMIN" && (role === "OWNER" || role === "ADMIN")) {
      return NextResponse.json({ error: "Solo el OWNER puede asignar roles de administración" }, { status: 403 });
    }

    // No remover el último OWNER al degradar al propietario (target nunca es OWNER aquí,
    // pero si el current user fuera OWNER bajando a otro a OWNER estaría bien).
    const updated = await changeMemberRole(org.id, targetUserId, role as any);

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: payload.sub,
        action: "member.role_changed",
        resourceType: "membership",
        resourceId: targetUserId,
        oldValues: JSON.stringify({ role: target.role }),
        newValues: JSON.stringify({ role }),
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Change role error:", error);
    return NextResponse.json({ error: "Error cambiando el rol" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> }
) {
  try {
    const { slug, userId: targetUserId } = await params;
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
      return NextResponse.json({ error: "Sin permisos para eliminar miembros" }, { status: 403 });
    }

    if (payload.sub === targetUserId) {
      return NextResponse.json(
        { error: "No puedes eliminarte a ti mismo. Contacta al propietario de la organización." },
        { status: 400 }
      );
    }

    const target = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: targetUserId, organizationId: org.id } },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "El usuario no pertenece a esta organización" }, { status: 404 });
    }

    if (target.role === "OWNER") {
      return NextResponse.json(
        { error: "No puedes eliminar al propietario de la organización" },
        { status: 403 }
      );
    }
    if (myRole === "ADMIN" && targetUserId !== payload.sub) {
      // Admin puede eliminar MEMBER/GUEST pero no ADMIN
      if (target.role === "ADMIN") {
        return NextResponse.json({ error: "Solo el OWNER puede eliminar administradores" }, { status: 403 });
      }
    }

    // Verificar que quede al menos un OWNER (el que ejecuta debe ser OWNER si el target era ADMIN)
    if (target.role === "ADMIN" && myRole === "OWNER") {
      const owners = await prisma.membership.count({
        where: { organizationId: org.id, role: "OWNER", isActive: true },
      });
      if (owners <= 1) {
        return NextResponse.json({ error: "No puede quedarse la organización sin propietario" }, { status: 400 });
      }
    }

    await removeMember(org.id, targetUserId);

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        userId: payload.sub,
        action: "member.removed",
        resourceType: "membership",
        resourceId: targetUserId,
        oldValues: JSON.stringify({ role: target.role }),
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json({ error: "Error eliminando miembro" }, { status: 500 });
  }
}