import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { updateIssueSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest } from "@zenwork/middleware";
import { updateIssue, createNotification } from "@/lib/services";
import { dispatchWebhooks } from "@zenwork/integrations";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string; issueId: string }> }
) {
  try {
    const { slug, projectId, issueId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);

    const issue = await prisma.issue.findFirst({
      where: {
        id: issueId,
        projectId,
        project: {
          organization: {
            slug,
            memberships: { some: { userId: payload.sub, isActive: true } },
          },
        },
        deletedAt: null,
      },
      include: {
        type: true,
        status: true,
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        labels: {
          include: { label: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        parent: {
          select: { id: true, number: true, title: true },
        },
        subtasks: {
          select: { id: true, number: true, title: true, status: true },
        },
      },
    });

    if (!issue) {
      return NextResponse.json(
        { error: "Issue no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: issue });
  } catch (error) {
    console.error("Get issue error:", error);
    return NextResponse.json(
      { error: "Error obteniendo issue" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; projectId: string; issueId: string }> }
) {
  try {
    const { slug, projectId, issueId } = await params;

    const ip = request.headers.get("x-forwarded-for") || "unknown";

    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);

    // Verificar acceso
    const issue = await prisma.issue.findFirst({
      where: {
        id: issueId,
        projectId,
        project: {
          organization: {
            slug,
            memberships: { some: { userId: payload.sub, isActive: true } },
          },
        },
      },
      include: { project: { select: { organizationId: true, key: true, name: true } } },
    });

    if (!issue) {
      return NextResponse.json(
        { error: "Issue no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(updateIssueSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.errors },
        { status: 400 }
      );
    }

    // Convertir dueDate de string a Date
    const updateData: Parameters<typeof updateIssue>[1] = {
      title: validation.data.title,
      description: validation.data.description,
      statusId: validation.data.statusId,
      priority: validation.data.priority,
      assigneeId: validation.data.assigneeId,
      storyPoints: validation.data.storyPoints,
      metadata: validation.data.metadata,
      ...(validation.data.dueDate !== undefined && {
        dueDate: validation.data.dueDate
          ? new Date(validation.data.dueDate)
          : null,
      }),
    };

    const updatedIssue = await updateIssue(issueId, updateData);

    // Notificar al nuevo responsable cuando cambia la asignación (y no es
    // el propio usuario que hace el cambio).
    if (
      validation.data.assigneeId !== undefined &&
      validation.data.assigneeId &&
      validation.data.assigneeId !== issue.assigneeId &&
      validation.data.assigneeId !== payload.sub
    ) {
      await createNotification(
        issue.project.organizationId,
        validation.data.assigneeId,
        "issue_assigned",
        "Te asignaron un issue",
        `${issue.project.key}-${issue.number}: ${validation.data.title ?? issue.title}`,
        { issueId, projectId }
      );

      void dispatchWebhooks(issue.project.organizationId, "issue.assigned", {
        issueId,
        projectId,
        assigneeId: validation.data.assigneeId,
        title: validation.data.title ?? issue.title,
      }).catch((err) => console.error("dispatchWebhooks issue.assigned error:", err));
    }

    void dispatchWebhooks(issue.project.organizationId, "issue.updated", {
      issueId,
      projectId,
      title: validation.data.title ?? issue.title,
    }).catch((err) => console.error("dispatchWebhooks issue.updated error:", err));

    // Registrar cambio en audit log
    await prisma.auditLog.create({
      data: {
        organizationId: issue.project.organizationId,
        userId: payload.sub,
        action: "issue.updated",
        resourceType: "issue",
        resourceId: issueId,
        oldValues: JSON.stringify(issue),
        newValues: JSON.stringify(updatedIssue),
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    return NextResponse.json({ success: true, data: updatedIssue });
  } catch (error) {
    console.error("Update issue error:", error);
    return NextResponse.json(
      { error: "Error actualizando issue" },
      { status: 500 }
    );
  }
}
