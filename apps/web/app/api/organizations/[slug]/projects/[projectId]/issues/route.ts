import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { createIssueSchema, COOKIE_NAMES, paginationSchema } from "@zenwork/shared";
import { validateRequest, checkApiRateLimit } from "@zenwork/middleware";
import { createIssue, getIssues } from "@/lib/services";
import { dispatchWebhooks } from "@zenwork/integrations";

export async function GET(
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

    // Verificar acceso al proyecto
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organization: {
          slug,
          memberships: { some: { userId: payload.sub, isActive: true } },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    // Extraer filtros de query params
    const url = new URL(request.url);
    const filters = {
      statusId: url.searchParams.get("statusId") || undefined,
      assigneeId: url.searchParams.get("assigneeId") || undefined,
      priority: url.searchParams.get("priority") || undefined,
      search: url.searchParams.get("search") || undefined,
      page: parseInt(url.searchParams.get("page") || "1"),
      limit: parseInt(url.searchParams.get("limit") || "20"),
    };

    const result = await getIssues(projectId, filters);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Get issues error:", error);
    return NextResponse.json(
      { error: "Error obteniendo issues" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string }> }
) {
  try {
    const { slug, projectId } = await params;

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkApiRateLimit(`issue:${ip}`);
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

    // Verificar acceso al proyecto y rol
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organization: {
          slug,
          memberships: { some: { userId: payload.sub, isActive: true } },
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
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    const myRole = project.organization.memberships[0]?.role || "GUEST";
    if (myRole === "GUEST") {
      return NextResponse.json(
        { error: "Sin permisos para crear issues (rol invitado)" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(createIssueSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.errors },
        { status: 400 }
      );
    }

    // Validar pertenencia de typeId y statusId a este proyecto
    const [validType, validStatus] = await Promise.all([
      prisma.issueType.findFirst({ where: { id: validation.data.typeId, projectId } }),
      prisma.issueStatus.findFirst({ where: { id: validation.data.statusId, projectId } }),
    ]);

    if (!validType) {
      return NextResponse.json(
        { error: "El tipo de issue especificado no pertenece a este proyecto" },
        { status: 400 }
      );
    }

    if (!validStatus) {
      return NextResponse.json(
        { error: "El estado de issue especificado no pertenece a este proyecto" },
        { status: 400 }
      );
    }

    // Convertir dueDate de string a Date
    const createData: Parameters<typeof createIssue>[2] = {
      title: validation.data.title,
      description: validation.data.description,
      typeId: validation.data.typeId,
      statusId: validation.data.statusId,
      priority: validation.data.priority,
      assigneeId: validation.data.assigneeId,
      storyPoints: validation.data.storyPoints,
      metadata: validation.data.metadata,
      parentIssueId: validation.data.parentIssueId,
      ...(validation.data.dueDate !== undefined && {
        dueDate: validation.data.dueDate ? new Date(validation.data.dueDate) : undefined,
      }),
    };

    const issue = await createIssue(projectId, payload.sub, createData);

    void dispatchWebhooks(project.organizationId, "issue.created", {
      issueId: issue.id,
      projectId,
      title: issue.title,
      projectName: project.name,
    }).catch((err) => console.error("dispatchWebhooks issue.created error:", err));

    return NextResponse.json(
      { success: true, data: issue },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create issue error:", error);
    return NextResponse.json(
      { error: "Error creando issue" },
      { status: 500 }
    );
  }
}
