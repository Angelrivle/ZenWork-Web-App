import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { updateIssueStatusSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest } from "@zenwork/middleware";

async function getStatusWithContext(statusId: string, userId: string) {
  return prisma.issueStatus.findFirst({
    where: { id: statusId },
    include: {
      project: {
        select: {
          organization: {
            select: {
              slug: true,
              memberships: {
                where: { userId, isActive: true },
                select: { role: true },
              },
            },
          },
        },
      },
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string; statusId: string }> }
) {
  try {
    const { slug, projectId, statusId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const payload = await verifyAccessToken(sessionToken);

    const status = await prisma.issueStatus.findFirst({ where: { id: statusId, projectId } });
    if (!status) return NextResponse.json({ error: "Estado no encontrado" }, { status: 404 });

    const ctx = await getStatusWithContext(statusId, payload.sub);
    if (!ctx || ctx.project.organization.slug !== slug) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const myRole = ctx.project.organization.memberships[0]?.role || "GUEST";
    if (myRole !== "OWNER" && myRole !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(updateIssueStatusSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.errors }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (validation.data.name !== undefined) data.name = validation.data.name;
    if (validation.data.category !== undefined) data.category = validation.data.category;
    if (validation.data.color !== undefined) data.color = validation.data.color;
    if (validation.data.order !== undefined) data.sortOrder = validation.data.order;

    try {
      const updated = await prisma.issueStatus.update({ where: { id: statusId }, data });
      return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
      if (error?.code === "P2002") {
        return NextResponse.json({ error: "Ya existe un estado con este nombre" }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Update status error:", error);
    return NextResponse.json({ error: "Error actualizando el estado" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string; statusId: string }> }
) {
  try {
    const { slug, projectId, statusId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const payload = await verifyAccessToken(sessionToken);

    const status = await prisma.issueStatus.findFirst({ where: { id: statusId, projectId } });
    if (!status) return NextResponse.json({ error: "Estado no encontrado" }, { status: 404 });

    const ctx = await getStatusWithContext(statusId, payload.sub);
    if (!ctx || ctx.project.organization.slug !== slug) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }

    const myRole = ctx.project.organization.memberships[0]?.role || "GUEST";
    if (myRole !== "OWNER" && myRole !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    if (status.isDefault) {
      return NextResponse.json({ error: "No se puede eliminar el estado por defecto" }, { status: 400 });
    }

    const used = await prisma.issue.count({ where: { statusId, deletedAt: null } });
    if (used > 0) {
      return NextResponse.json({ error: "Hay issues en este estado. Cambia su estado primero." }, { status: 400 });
    }

    await prisma.issueStatus.delete({ where: { id: statusId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete status error:", error);
    return NextResponse.json({ error: "Error eliminando el estado" }, { status: 500 });
  }
}