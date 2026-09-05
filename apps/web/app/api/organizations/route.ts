import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { createOrganizationSchema, COOKIE_NAMES, paginationSchema } from "@zenwork/shared";
import { validateRequest, checkApiRateLimit } from "@zenwork/middleware";
import { createOrganization, getOrganizations } from "@/lib/services";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const payload = await verifyAccessToken(sessionToken);
    const organizations = await getOrganizations(payload.sub);

    return NextResponse.json({ success: true, data: organizations });
  } catch (error) {
    console.error("Get organizations error:", error);
    return NextResponse.json(
      { error: "Error obteniendo organizaciones" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkApiRateLimit(`org:${ip}`);
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
    const body = await request.json();

    const validation = validateRequest(createOrganizationSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.errors },
        { status: 400 }
      );
    }

    const organization = await createOrganization(payload.sub, validation.data);

    return NextResponse.json(
      { success: true, data: organization },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create organization error:", error);
    return NextResponse.json(
      { error: "Error creando organización" },
      { status: 500 }
    );
  }
}
