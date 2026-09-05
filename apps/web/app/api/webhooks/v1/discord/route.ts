import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@zenwork/db";
import { checkWebhookRateLimit, verifyWebhookSignature } from "@zenwork/middleware";

// Webhook entrante de Discord
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkWebhookRateLimit(`discord:${ip}`);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit" }, { status: 429 });
    }

    const body = await request.json();
    const signature = request.headers.get("x-signature-ed25519");

    // Verificar firma de Discord (si está configurada)
    // Discord usa ed25519, no HMAC-SHA256
    // Por ahora solo registramos el evento

    // Idempotencia: verificar si ya procesamos este evento
    const eventId = body.id;
    if (eventId) {
      const recentEvents = await prisma.event.findMany({
        where: {
          type: `discord.${body.type}`,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        select: { payload: true },
      });

      const existing = recentEvents.some((e) => {
        try {
          const parsed = JSON.parse(e.payload || "{}");
          return parsed.id === eventId;
        } catch {
          return false;
        }
      });

      if (existing) {
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    // Procesar según tipo de evento
    switch (body.type) {
      case "PING":
        return NextResponse.json({ challenge: body.challenge });

      case "INTERACTION_CREATE":
        // Manejar slash commands de ZenWork
        if (body.data?.name === "zenwork") {
          return handleZenWorkCommand(body);
        }
        break;

      default:
        console.log("Unhandled Discord event:", body.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Discord webhook error:", error);
    return NextResponse.json({ error: "Error procesando webhook" }, { status: 500 });
  }
}

async function handleZenWorkCommand(interaction: Record<string, unknown>) {
  // Implementar lógica de slash commands
  return NextResponse.json({
    type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
    data: {
      content: "Comando de ZenWork procesado",
      flags: 64, // EPHEMERAL
    },
  });
}
