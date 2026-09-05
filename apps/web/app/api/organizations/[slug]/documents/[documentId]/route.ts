import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { updateDocumentSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest } from "@zenwork/middleware";
import { updateDocument } from "@/lib/services";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; documentId: string }> }
) {
  try {
    const { slug, documentId } = await params;
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organization: {
          slug,
          memberships: { some: { userId: payload.sub, isActive: true } },
        },
        deletedAt: null,
      },
      include: {
        children: {
          select: { id: true, title: true, slug: true, icon: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: document });
  } catch (error) {
    console.error("Get document error:", error);
    return NextResponse.json(
      { error: "Error obteniendo documento" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; documentId: string }> }
) {
  try {
    const { slug, documentId } = await params;

    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organization: {
          slug,
          memberships: { some: { userId: payload.sub, isActive: true } },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Documento no encontrado" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = validateRequest(updateDocumentSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.errors },
        { status: 400 }
      );
    }

    const updatedDocument = await updateDocument(documentId, validation.data);

    // Registrar edit
    await prisma.documentEdit.create({
      data: {
        documentId,
        userId: payload.sub,
        content: JSON.stringify(validation.data.content || {}),
      },
    });

    return NextResponse.json({ success: true, data: updatedDocument });
  } catch (error) {
    console.error("Update document error:", error);
    return NextResponse.json(
      { error: "Error actualizando documento" },
      { status: 500 }
    );
  }
}
