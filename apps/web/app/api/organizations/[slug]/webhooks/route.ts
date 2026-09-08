import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { createWebhookSchema, COOKIE_NAMES } from "@zenwork/shared";
import { validateRequest, isSafeWebhookUrl } from "@zenwork/middleware";
import { randomBytes } from "crypto";

async function getOrgWithRole(slug: string, userId: string) {
  return prisma.organization.findFirst({
    where: {
      slug,
      memberships: { some: { userId, isActive: true } },
      deletedAt: null,
    },
    include: {
      memberships: { where: { userId, isActive: true }, select: { role: true } },
    },
  });
}

// Webhooks salientes configurados por el usuario para esta organización.
// Solo OWNER/ADMIN pueden verlos y administrarlos: la URL + secreto permiten
// recibir eventos internos, así que es equivalente a otorgar acceso a datos
// de la organización.
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
    const org = await getOrgWithRole(slug, payload.sub);
    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const myRole = org.memberships[0]?.role || "GUEST";
    if (myRole !== "OWNER" && myRole !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos para ver webhooks" }, { status: 403 });
    }

    const webhooks = await prisma.webhook.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
    });

    // Nunca devolver el secreto completo una vez creado.
    const data = webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: JSON.parse(w.events || "[]"),
      isActive: w.isActive,
      secretPreview: `${w.secret.slice(0, 4)}••••••••`,
      createdAt: w.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Get webhooks error:", error);
    return NextResponse.json({ error: "Error obteniendo webhooks" }, { status: 500 });
  }
}

export async function POST(
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
    const org = await getOrgWithRole(slug, payload.sub);
    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const myRole = org.memberships[0]?.role || "GUEST";
    if (myRole !== "OWNER" && myRole !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos para crear webhooks" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateRequest(createWebhookSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.errors },
        { status: 400 }
      );
    }

    const safety = isSafeWebhookUrl(validation.data.url);
    if (!safety.safe) {
      return NextResponse.json(
        { error: `URL rechazada por seguridad: ${safety.reason}` },
        { status: 400 }
      );
    }

    // El secreto se devuelve UNA sola vez (al crear); luego solo se expone
    // una vista previa. Si el usuario no manda uno, se genera automáticamente.
    const secret = validation.data.secret || randomBytes(24).toString("hex");

    const webhook = await prisma.webhook.create({
      data: {
        organizationId: org.id,
        userId: payload.sub,
        url: validation.data.url,
        secret,
        events: JSON.stringify(validation.data.events),
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: webhook.id,
          url: webhook.url,
          events: validation.data.events,
          secret, // única vez que se devuelve en texto plano
          isActive: webhook.isActive,
          createdAt: webhook.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create webhook error:", error);
    return NextResponse.json({ error: "Error creando webhook" }, { status: 500 });
  }
}
