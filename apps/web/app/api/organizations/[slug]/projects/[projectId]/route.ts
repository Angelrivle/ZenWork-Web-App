import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { updateProjectSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest } from "@zenwork/middleware";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string }> }
) {
  try {
    const { slug, projectId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
        organization: {
          slug,
          memberships: {
            some: { userId: payload.sub, isActive: true, role: { in: ["OWNER", "ADMIN", "MEMBER"] } },
          },
        },
      },
      include: {
        organization: {
          select: {
            memberships: {
              where: { userId: payload.sub, isActive: true },
              select: { role: true },
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
    }

    const myRole = project.organization.memberships[0]?.role;
    if (myRole !== "OWNER" && myRole !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos para modificar el proyecto" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(updateProjectSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.errors }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (validation.data.name !== undefined) data.name = validation.data.name;
    if (validation.data.key !== undefined) data.key = validation.data.key;
    if (validation.data.description !== undefined) data.description = validation.data.description;
    if (validation.data.status !== undefined) data.status = validation.data.status;

    try {
      const updated = await prisma.project.update({
        where: { id: projectId },
        data,
      });
      return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
      if (error?.code === "P2002") {
        return NextResponse.json(
          { error: "Ya existe un proyecto con esta key en la organización" },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json({ error: "Error actualizando el proyecto" }, { status: 500 });
  }
}