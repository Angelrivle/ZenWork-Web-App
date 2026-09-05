import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { createBoardSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest, checkApiRateLimit } from "@zenwork/middleware";
import { createBoard, getBoard } from "@/lib/services";

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

    const boards = await prisma.board.findMany({
      where: {
        organization: {
          slug,
          memberships: { some: { userId: payload.sub, isActive: true } },
        },
        deletedAt: null,
      },
      include: {
        _count: { select: { columns: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: boards });
  } catch (error) {
    console.error("Get boards error:", error);
    return NextResponse.json(
      { error: "Error obteniendo tableros" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkApiRateLimit(`board:${ip}`);
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

    const org = await prisma.organization.findFirst({
      where: {
        slug,
        memberships: {
          some: { userId: payload.sub, isActive: true, role: { in: ["OWNER", "ADMIN", "MEMBER"] } },
        },
      },
    });

    if (!org) {
      return NextResponse.json(
        { error: "Sin permisos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(createBoardSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.errors },
        { status: 400 }
      );
    }

    const board = await createBoard(org.id, validation.data);
    return NextResponse.json(
      { success: true, data: board },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create board error:", error);
    return NextResponse.json(
      { error: "Error creando tablero" },
      { status: 500 }
    );
  }
}
