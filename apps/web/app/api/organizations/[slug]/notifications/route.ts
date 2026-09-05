import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";

async function getUser(slug: string, userId: string) {
  const org = await prisma.organization.findFirst({
    where: {
      slug,
      memberships: { some: { userId, isActive: true } },
      deletedAt: null,
    },
    select: { id: true },
  });
  if (!org) return null;
  return org;
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
    const org = await getUser(slug, payload.sub);
    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        organizationId: org.id,
        userId: payload.sub,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const data = {
      notifications: notifications.map((n) => {
        let parsedData: Record<string, unknown> = {};
        try {
          parsedData = JSON.parse(n.data || "{}");
        } catch {
          parsedData = {};
        }
        return {
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          data: parsedData,
          readAt: n.readAt,
          createdAt: n.createdAt,
        };
      }),
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ error: "Error obteniendo notificaciones" }, { status: 500 });
  }
}

export async function PATCH(
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
    const org = await getUser(slug, payload.sub);
    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const body: { ids?: string[] } = await request.json();
    const ids = Array.isArray(body.ids) && body.ids.length > 0 ? body.ids : undefined;

    const result = await prisma.notification.updateMany({
      where: {
        organizationId: org.id,
        userId: payload.sub,
        readAt: null,
        ...(ids ? { id: { in: ids } } : {}),
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true, data: { updated: result.count } });
  } catch (error) {
    console.error("Mark notifications error:", error);
    return NextResponse.json({ error: "Error actualizando notificaciones" }, { status: 500 });
  }
}