import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { createIssueTypeSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest } from "@zenwork/middleware";

async function getProjectWithRole(slug: string, projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      organization: {
        slug,
        memberships: { some: { userId, isActive: true } },
      },
    },
    include: {
      organization: {
        select: {
          memberships: {
            where: { userId, isActive: true },
            select: { role: true },
          },
        },
      },
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string }> }
) {
  try {
    const { slug, projectId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const payload = await verifyAccessToken(sessionToken);
    const project = await getProjectWithRole(slug, projectId, payload.sub);
    if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

    const types = await prisma.issueType.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ success: true, data: types });
  } catch (error) {
    console.error("Get issue types error:", error);
    return NextResponse.json({ error: "Error obteniendo tipos de issue" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string }> }
) {
  try {
    const { slug, projectId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const payload = await verifyAccessToken(sessionToken);
    const project = await getProjectWithRole(slug, projectId, payload.sub);
    if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

    const myRole = project.organization.memberships[0]?.role || "GUEST";
    if (myRole !== "OWNER" && myRole !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos para modificar el proyecto" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(createIssueTypeSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.errors }, { status: 400 });
    }

    const count = await prisma.issueType.count({ where: { projectId } });
    try {
      const created = await prisma.issueType.create({
        data: {
          projectId,
          name: validation.data.name,
          color: validation.data.color || "#6366f1",
          icon: validation.data.icon || "circle",
          sortOrder: count,
        },
      });
      return NextResponse.json({ success: true, data: created }, { status: 201 });
    } catch (error: any) {
      if (error?.code === "P2002") {
        return NextResponse.json({ error: "Ya existe un tipo con este nombre" }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Create issue type error:", error);
    return NextResponse.json({ error: "Error creando el tipo de issue" }, { status: 500 });
  }
}