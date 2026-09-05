import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { createProjectSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest, checkApiRateLimit } from "@zenwork/middleware";
import { createProject, getProjects } from "@/lib/services";

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

    // Verificar membresía
    const org = await prisma.organization.findFirst({
      where: {
        slug,
        memberships: { some: { userId: payload.sub, isActive: true } },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Organización no encontrada" },
        { status: 404 }
      );
    }

    const projects = await getProjects(org.id);
    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error("Get projects error:", error);
    return NextResponse.json(
      { error: "Error obteniendo proyectos" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkApiRateLimit(`project:${ip}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit excedido" },
        { status: 429 }
      );
    }

    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);

    const org = await prisma.organization.findFirst({
      where: {
        slug,
        memberships: {
          some: {
            userId: payload.sub,
            isActive: true,
            role: { in: ["OWNER", "ADMIN"] },
          },
        },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Sin permisos para crear proyectos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(createProjectSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.errors },
        { status: 400 }
      );
    }

    const project = await createProject(org.id, validation.data);
    return NextResponse.json(
      { success: true, data: project },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Error creando proyecto" },
      { status: 500 }
    );
  }
}
