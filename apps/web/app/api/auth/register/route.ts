import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { registerSchema } from "@zenwork/shared";
import { checkRegisterRateLimit, validateRequest } from "@zenwork/middleware";
import { createOrganizationBody } from "@/lib/services";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkRegisterRateLimit(ip);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta más tarde." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter || 60),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const body = await request.json();

    // Validar input
    const validation = validateRequest(registerSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.errors },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 409 }
      );
    }

    // Hash de contraseña con Argon2id
    const passwordHash = await hashPassword(password);

    // Crear usuario y organización por defecto en transacción
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
        },
      });

      // Crear organización de bienvenida (misma transacción, sin anidar)
      const organization = await createOrganizationBody(
        tx as unknown as typeof prisma,
        user.id,
        {
          name: `${name}'s Workspace`,
          slug: `${name.toLowerCase().replace(/\s+/g, "-")}-workspace`,
        }
      );

      return { user, organization };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Usuario registrado exitosamente",
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
