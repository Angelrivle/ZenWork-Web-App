import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@zenwork/db";
import { checkWebhookRateLimit, verifyWebhookSignature } from "@zenwork/middleware";

// Webhook entrante genérico (para GitHub u otros)
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimit = await checkWebhookRateLimit(`generic:${ip}`);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Rate limit" }, { status: 429 });
    }

    const body = await request.text();
    const signature = request.headers.get("x-zenwork-signature");

    // Verificar firma HMAC-SHA256. Si hay un secreto configurado, la firma
    // es obligatoria: omitirla no debe saltarse la verificación.
    const webhookSecret = process.env.ZENWORK_WEBHOOK_SECRET;
    if (webhookSecret) {
      if (!signature || !verifyWebhookSignature(body, signature, webhookSecret)) {
        return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);

    // Registrar evento
    await prisma.event.create({
      data: {
        type: "webhook.incoming",
        payload: JSON.stringify(payload),
        source: "webhook",
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Generic webhook error:", error);
    return NextResponse.json({ error: "Error procesando webhook" }, { status: 500 });
  }
}
