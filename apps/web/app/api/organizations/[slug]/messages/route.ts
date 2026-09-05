import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { createMessageSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest, checkApiRateLimit } from "@zenwork/middleware";
import { createMessage, getMessages } from "@/lib/services";
import { chatRoom, publishMessage } from "@/lib/realtime";

async function getUserAndOrg(slug: string, userId: string) {
  const org = await prisma.organization.findFirst({
    where: {
      slug,
      memberships: { some: { userId, isActive: true } },
      deletedAt: null,
    },
    select: { id: true },
  });
  return org;
}

async function assertProjectAccess(orgId: string, projectId: string | null) {
  if (!projectId) return;
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId: orgId,
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!project) {
    throw new ApiError("Proyecto no encontrado", 404);
  }
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

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

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit")) || 100));
    const projectId = searchParams.get("projectId") || null;

    const org = await getUserAndOrg(slug, payload.sub);
    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    await assertProjectAccess(org.id, projectId);

    const messages = await getMessages(org.id, limit, projectId || undefined);
    return NextResponse.json({ success: true, data: messages });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Get messages error:", error);
    return NextResponse.json({ error: "Error obteniendo mensajes" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkApiRateLimit(`chat:${ip}`);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit excedido" }, { status: 429 });
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
          some: { userId: payload.sub, isActive: true, role: { in: ["OWNER", "ADMIN", "MEMBER"] } },
        },
      },
      select: { id: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(createMessageSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: "Datos inválidos", details: validation.errors }, { status: 400 });
    }

    const projectId = typeof body?.projectId === "string" ? body.projectId : undefined;
    await assertProjectAccess(org.id, projectId || null);

    const message = await createMessage(
      org.id,
      payload.sub,
      validation.data.content,
      validation.data.parentId,
      projectId
    );

    publishMessage(chatRoom(org.id, projectId), message);

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Create message error:", error);
    return NextResponse.json({ error: "Error enviando mensaje" }, { status: 500 });
  }
}