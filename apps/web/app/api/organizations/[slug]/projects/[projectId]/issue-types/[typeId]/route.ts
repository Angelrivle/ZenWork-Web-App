import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { updateIssueTypeSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest } from "@zenwork/middleware";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string; typeId: string }> }
) {
  try {
    const { slug, projectId, typeId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const payload = await verifyAccessToken(sessionToken);

    const type = await prisma.issueType.findFirst({
      where: { id: typeId, projectId },
      include: {
        project: {
          select: {
            organization: {
              select: {
                slug: true,
                memberships: {
                  where: { userId: payload.sub, isActive: true },
                  select: { role: true },
                },
              },
            },
          },
        },
      },
    });
    if (!type || type.project.organization.slug !== slug) {
      return NextResponse.json({ error: "Tipo no encontrado" }, { status: 404 });
    }

    const myRole = type.project.organization.memberships[0]?.role || "GUEST";
    if (myRole !== "OWNER" && myRole !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(updateIssueTypeSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.errors }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (validation.data.name !== undefined) data.name = validation.data.name;
    if (validation.data.color !== undefined) data.color = validation.data.color;
    if (validation.data.icon !== undefined) data.icon = validation.data.icon;

    try {
      const updated = await prisma.issueType.update({ where: { id: typeId }, data });
      return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
      if (error?.code === "P2002") {
        return NextResponse.json({ error: "Ya existe un tipo con este nombre" }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Update issue type error:", error);
    return NextResponse.json({ error: "Error actualizando el tipo" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string; typeId: string }> }
) {
  try {
    const { slug, projectId, typeId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const payload = await verifyAccessToken(sessionToken);

    const type = await prisma.issueType.findFirst({
      where: { id: typeId, projectId },
      include: {
        project: {
          select: {
            organization: {
              select: {
                slug: true,
                memberships: {
                  where: { userId: payload.sub, isActive: true },
                  select: { role: true },
                },
              },
            },
          },
        },
      },
    });
    if (!type || type.project.organization.slug !== slug) {
      return NextResponse.json({ error: "Tipo no encontrado" }, { status: 404 });
    }

    const myRole = type.project.organization.memberships[0]?.role || "GUEST";
    if (myRole !== "OWNER" && myRole !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    if (type.isDefault) {
      return NextResponse.json({ error: "No se puede eliminar el tipo por defecto" }, { status: 400 });
    }

    const used = await prisma.issue.count({ where: { typeId, deletedAt: null } });
    if (used > 0) {
      return NextResponse.json({ error: "Hay issues que usan este tipo. Asegúralos a otro primero." }, { status: 400 });
    }

    await prisma.issueType.delete({ where: { id: typeId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete issue type error:", error);
    return NextResponse.json({ error: "Error eliminando el tipo" }, { status: 500 });
  }
}