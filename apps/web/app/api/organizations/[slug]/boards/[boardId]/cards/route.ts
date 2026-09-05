import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { createBoardCardSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest, checkApiRateLimit } from "@zenwork/middleware";
import { createCard } from "@/lib/services";
import { dispatchWebhooks } from "@zenwork/integrations";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; boardId: string }> }
) {
  try {
    const { slug, boardId } = await params;

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkApiRateLimit(`card:${ip}`);
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

    const boardAccess = await prisma.board.findFirst({
      where: {
        id: boardId,
        organization: {
          slug,
          memberships: {
            some: { userId: payload.sub, isActive: true, role: { in: ["OWNER", "ADMIN", "MEMBER"] } },
          },
        },
        deletedAt: null,
      },
      select: { id: true, organizationId: true },
    });

    if (!boardAccess) {
      return NextResponse.json(
        { error: "Tablero no encontrado o sin permisos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(createBoardCardSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.errors },
        { status: 400 }
      );
    }

    // Verificar que la columna pertenezca al tablero
    const column = await prisma.boardColumn.findFirst({
      where: { id: validation.data.columnId, boardId },
      select: { id: true },
    });

    if (!column) {
      return NextResponse.json(
        { error: "Columna no encontrada" },
        { status: 400 }
      );
    }

    const card = await createCard(column.id, {
      title: validation.data.title,
      description: validation.data.description,
      issueId: validation.data.issueId,
      assigneeId: validation.data.assigneeId,
      dueDate: validation.data.dueDate ? new Date(validation.data.dueDate) : undefined,
    });

    void dispatchWebhooks(boardAccess.organizationId, "board.card.created", {
      cardId: card.id,
      boardId,
      title: card.title,
    }).catch((err) => console.error("dispatchWebhooks board.card.created error:", err));

    return NextResponse.json({ success: true, data: card }, { status: 201 });
  } catch (error) {
    console.error("Create card error:", error);
    return NextResponse.json(
      { error: "Error creando tarjeta" },
      { status: 500 }
    );
  }
}