import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { createCommentSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest } from "@zenwork/middleware";
import { createComment, getComments, createNotification } from "@/lib/services";
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
    });

    if (!issue) {
      return NextResponse.json(
        { error: "Issue no encontrado" },
        { status: 404 }
      );
    }

    const comments = await getComments(issueId);
    return NextResponse.json({ success: true, data: comments });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json(
      { error: "Error obteniendo comentarios" },
      { status: 500 }
    );
  }
}

export async function POST(
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
      include: {
        project: { select: { organizationId: true, key: true } },
      },
    });

    if (!issue) {
      return NextResponse.json(
        { error: "Issue no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(createCommentSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.errors },
        { status: 400 }
      );
    }

    const comment = await createComment(issueId, payload.sub, validation.data.content);

    // Notificar al responsable y al creador del issue (si no son quien comenta).
    const notifyIds = new Set(
      [issue.assigneeId, issue.creatorId].filter(
        (id): id is string => !!id && id !== payload.sub
      )
    );
    for (const userId of notifyIds) {
      await createNotification(
        issue.project.organizationId,
        userId,
        "issue_comment",
        "Nuevo comentario",
        `${issue.project.key}-${issue.number}: ${issue.title}`,
        { issueId, projectId, commentId: comment.id }
      );
    }

    // Registrar en audit log
    await prisma.auditLog.create({
      data: {
        organizationId: issue.project.organizationId,
        userId: payload.sub,
        action: "comment.created",
        resourceType: "comment",
        resourceId: comment.id,
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
      },
    });

    void dispatchWebhooks(issue.project.organizationId, "comment.created", {
      issueId,
      projectId,
      commentId: comment.id,
      title: issue.title,
    }).catch((err) => console.error("dispatchWebhooks comment.created error:", err));

    return NextResponse.json(
      { success: true, data: comment },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json(
      { error: "Error creando comentario" },
      { status: 500 }
    );
  }
}
