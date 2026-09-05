import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { updateBoardCardSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest } from "@zenwork/middleware";
import { updateCard, softDeleteCard, getCard } from "@/lib/services";
import { dispatchWebhooks } from "@zenwork/integrations";

// Verifica que el usuario tenga acceso al tablero que contiene la tarjeta,
// y devuelve su rol y la organización (null si no tiene acceso).
async function assertCardAccess(
  slug: string,
  boardId: string,
  cardId: string,
  userId: string
): Promise<{ role: string; organizationId: string } | null> {
  const boardAccess = await prisma.board.findFirst({
    where: {
      id: boardId,
      organization: {
        slug,
        memberships: { some: { userId, isActive: true } },
      },
      deletedAt: null,
    },
    include: {
      organization: {
        select: { id: true, memberships: { where: { userId }, select: { role: true } } },
      },
    },
  });

  if (!boardAccess) return null;

  const card = await prisma.boardCard.findFirst({
    where: { id: cardId, column: { boardId } },
    select: { id: true },
  });
  if (!card) return null;

  return {
    role: boardAccess.organization.memberships[0]?.role || "GUEST",
    organizationId: boardAccess.organization.id,
  };
}

export async function GET(
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

    if (!(await assertCardAccess(slug, boardId, cardId, payload.sub))) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada" },
        { status: 404 }
      );
    }

    const card = await getCard(cardId);
    return NextResponse.json({ success: true, data: card });
  } catch (error) {
    console.error("Get card error:", error);
    return NextResponse.json(
      { error: "Error obteniendo tarjeta" },
      { status: 500 }
    );
  }
}

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

    const access = await assertCardAccess(slug, boardId, cardId, payload.sub);
    if (!access) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada" },
        { status: 404 }
      );
    }
    if (access.role === "GUEST") {
      return NextResponse.json({ error: "Sin permisos para editar tarjetas" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(updateBoardCardSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.errors },
        { status: 400 }
      );
    }

    const card = await updateCard(cardId, {
      title: validation.data.title,
      description: validation.data.description,
      assigneeId: validation.data.assigneeId,
      dueDate: validation.data.dueDate ? new Date(validation.data.dueDate) : validation.data.dueDate === null ? null : undefined,
      columnId: validation.data.columnId,
    });

    return NextResponse.json({ success: true, data: card });
  } catch (error) {
    console.error("Update card error:", error);
    return NextResponse.json(
      { error: "Error actualizando tarjeta" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const access = await assertCardAccess(slug, boardId, cardId, payload.sub);
    if (!access) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada" },
        { status: 404 }
      );
    }
    if (access.role === "GUEST") {
      return NextResponse.json({ error: "Sin permisos para eliminar tarjetas" }, { status: 403 });
    }

    await softDeleteCard(cardId);

    void dispatchWebhooks(access.organizationId, "board.card.deleted", {
      cardId,
      boardId,
    }).catch((err) => console.error("dispatchWebhooks board.card.deleted error:", err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete card error:", error);
    return NextResponse.json(
      { error: "Error eliminando tarjeta" },
      { status: 500 }
    );
  }
}