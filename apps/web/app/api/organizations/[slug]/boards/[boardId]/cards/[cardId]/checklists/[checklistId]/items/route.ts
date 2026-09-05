import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";
import { addChecklistItem } from "@/lib/services";
import { z } from "zod";

const addItemBody = z.object({
  text: z.string().min(1).max(500),
});

async function assertChecklistAccess(slug: string, boardId: string, checklistId: string, userId: string) {
  const checklist = await prisma.cardChecklist.findFirst({
    where: {
      id: checklistId,
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
    select: { id: true },
  });

  return !!checklist;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; boardId: string; checklistId: string }> }
) {
  try {
    const { slug, boardId, checklistId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);

    if (!(await assertChecklistAccess(slug, boardId, checklistId, payload.sub))) {
      return NextResponse.json(
        { error: "Lista de tareas no encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = addItemBody.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const item = await addChecklistItem(checklistId, validation.data.text);
    return NextResponse.json(
      { success: true, data: item },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add checklist item error:", error);
    return NextResponse.json(
      { error: "Error agregando tarea" },
      { status: 500 }
    );
  }
}