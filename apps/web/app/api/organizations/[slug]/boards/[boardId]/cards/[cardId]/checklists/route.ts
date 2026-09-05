import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";
import { createChecklist } from "@/lib/services";
import { z } from "zod";

const createChecklistBody = z.object({
  title: z.string().min(1).max(200),
});

async function assertCardAccess(slug: string, boardId: string, cardId: string, userId: string) {
  const card = await prisma.boardCard.findFirst({
    where: {
      id: cardId,
      column: {
        boardId,
        board: {
          organization: {
            slug,
            memberships: { some: { userId, isActive: true } },
          },
        },
      },
    },
    select: { id: true },
  });

  return !!card;
}

export async function POST(
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

    const body = await request.json();
    const validation = createChecklistBody.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const checklist = await createChecklist(cardId, validation.data.title);
    return NextResponse.json(
      { success: true, data: checklist },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create checklist error:", error);
    return NextResponse.json(
      { error: "Error creando lista de tareas" },
      { status: 500 }
    );
  }
}