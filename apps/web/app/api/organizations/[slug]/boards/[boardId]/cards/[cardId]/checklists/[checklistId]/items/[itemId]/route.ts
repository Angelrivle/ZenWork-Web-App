import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";
import { toggleChecklistItem } from "@/lib/services";
import { z } from "zod";

const toggleItemBody = z.object({
  isChecked: z.boolean(),
});

async function assertItemAccess(
  slug: string,
  boardId: string,
  checklistId: string,
  itemId: string,
  userId: string
) {
  const item = await prisma.cardChecklistItem.findFirst({
    where: {
      id: itemId,
      checklistId,
      checklist: {
        card: {
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
      },
    },
    select: { id: true },
  });

  return !!item;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; boardId: string; checklistId: string; itemId: string }> }
) {
  try {
    const { slug, boardId, checklistId, itemId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);

    if (!(await assertItemAccess(slug, boardId, checklistId, itemId, payload.sub))) {
      return NextResponse.json(
        { error: "Tarea no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = toggleItemBody.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const item = await toggleChecklistItem(itemId, validation.data.isChecked);
    return NextResponse.json({ success: true, data: item });
  } catch (error) {
    console.error("Toggle checklist item error:", error);
    return NextResponse.json(
      { error: "Error actualizando tarea" },
      { status: 500 }
    );
  }
}