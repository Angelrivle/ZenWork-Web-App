import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { moveCardSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest } from "@zenwork/middleware";
import { moveCard } from "@/lib/services";
import { dispatchWebhooks } from "@zenwork/integrations";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; boardId: string; cardId: string }> }
) {
  try {
    const { slug, boardId, cardId } = await params;

    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);

    // Verificar acceso
    const card = await prisma.boardCard.findFirst({
      where: {
        id: cardId,
        column: {
          board: {
            id: boardId,
            organization: {
              slug,
              memberships: { some: { userId: payload.sub, isActive: true } },
            },
          },
        },
      },
      include: {
        column: {
          select: {
            board: {
              select: {
                organizationId: true,
                organization: {
                  select: { memberships: { where: { userId: payload.sub }, select: { role: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada" },
        { status: 404 }
      );
    }

    const myRole = card.column.board.organization.memberships[0]?.role || "GUEST";
    if (myRole === "GUEST") {
      return NextResponse.json({ error: "Sin permisos para mover tarjetas" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(moveCardSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.errors },
        { status: 400 }
      );
    }

    // Prevenir IDOR/BOLA: verificar que la columna destino pertenezca a este tablero
    const targetCol = await prisma.boardColumn.findFirst({
      where: { id: validation.data.columnId, boardId },
    });
    if (!targetCol) {
      return NextResponse.json(
        { error: "La columna destino no pertenece a este tablero" },
        { status: 400 }
      );
    }

    const updatedCard = await moveCard(
      cardId,
      validation.data.columnId,
      validation.data.position
    );

    void dispatchWebhooks(card.column.board.organizationId, "board.card.moved", {
      cardId,
      boardId,
      columnId: validation.data.columnId,
      title: updatedCard.title,
    }).catch((err) => console.error("dispatchWebhooks board.card.moved error:", err));

    return NextResponse.json({ success: true, data: updatedCard });
  } catch (error) {
    console.error("Move card error:", error);
    return NextResponse.json(
      { error: "Error moviendo tarjeta" },
      { status: 500 }
    );
  }
}
