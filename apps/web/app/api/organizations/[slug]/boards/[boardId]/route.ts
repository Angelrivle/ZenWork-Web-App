import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";
import { getBoard } from "@/lib/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; boardId: string }> }
) {
  try {
    const { slug, boardId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);

    // Verificar acceso al tablero
    const boardAccess = await prisma.board.findFirst({
      where: {
        id: boardId,
        organization: {
          slug,
          memberships: { some: { userId: payload.sub, isActive: true } },
        },
        deletedAt: null,
      },
    });

    if (!boardAccess) {
      return NextResponse.json(
        { error: "Tablero no encontrado" },
        { status: 404 }
      );
    }

    const board = await getBoard(boardId);
    return NextResponse.json({ success: true, data: board });
  } catch (error) {
    console.error("Get board error:", error);
    return NextResponse.json(
      { error: "Error obteniendo tablero" },
      { status: 500 }
    );
  }
}
