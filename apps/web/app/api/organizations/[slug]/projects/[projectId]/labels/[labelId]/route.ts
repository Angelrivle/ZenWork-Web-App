import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { updateLabelSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest } from "@zenwork/middleware";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string; labelId: string }> }
) {
  try {
    const { slug, projectId, labelId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const payload = await verifyAccessToken(sessionToken);

    const label = await prisma.label.findFirst({
      where: { id: labelId, projectId },
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
    if (!label || label.project.organization.slug !== slug) {
      return NextResponse.json({ error: "Etiqueta no encontrada" }, { status: 404 });
    }

    const myRole = label.project.organization.memberships[0]?.role || "GUEST";
    if (myRole !== "OWNER" && myRole !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(updateLabelSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.errors }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (validation.data.name !== undefined) data.name = validation.data.name;
    if (validation.data.color !== undefined) data.color = validation.data.color;

    try {
      const updated = await prisma.label.update({ where: { id: labelId }, data });
      return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
      if (error?.code === "P2002") {
        return NextResponse.json({ error: "Ya existe una etiqueta con este nombre" }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Update label error:", error);
    return NextResponse.json({ error: "Error actualizando la etiqueta" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string; labelId: string }> }
) {
  try {
    const { slug, projectId, labelId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const payload = await verifyAccessToken(sessionToken);

    const label = await prisma.label.findFirst({
      where: { id: labelId, projectId },
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
    if (!label || label.project.organization.slug !== slug) {
      return NextResponse.json({ error: "Etiqueta no encontrada" }, { status: 404 });
    }

    const myRole = label.project.organization.memberships[0]?.role || "GUEST";
    if (myRole !== "OWNER" && myRole !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    await prisma.label.delete({ where: { id: labelId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete label error:", error);
    return NextResponse.json({ error: "Error eliminando la etiqueta" }, { status: 500 });
  }
}