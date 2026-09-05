import { prisma, parseJSON, serializeJSON, parseStringArray, transaction } from "@zenwork/db/adapter";
import { sendEmail, invitationEmailTemplate } from "./email";
import { sendDiscordWebhook, DiscordNotification } from "./discord";
import { signWebhookPayload } from "@zenwork/middleware";
import type { WebhookEvent } from "@zenwork/shared";

// ============================================================
// QUEUE SYSTEM (Redis/BullMQ or Memory fallback)
// ============================================================

// Detectar si Redis está disponible
const USE_REDIS = Boolean(process.env.ZENWORK_REDIS_URL);

// Cola en memoria (fallback local)
interface QueueJob {
  queue: string;
  data: Record<string, unknown>;
}

const memoryQueues: Record<string, Array<Record<string, unknown>>> = {
  notifications: [],
  webhooks: [],
};

let notificationQueue: any = null;
let webhookQueue: any = null;
let notificationWorker: any = null;
let webhookWorker: any = null;

async function setupQueues() {
  if (!USE_REDIS) {
    console.log("⚠️  ZENWORK_REDIS_URL no configurado. Event hub en modo memoria.");
    return;
  }

  try {
    // webpackIgnore: igual que en @zenwork/middleware, evita que Next.js
    // intente empaquetar estos paquetes (usan imports "node:*" no
    // soportados por webpack) en el bundle serverless.
    const bullmq = await import(/* webpackIgnore: true */ "bullmq");
    const Redis = (await import(/* webpackIgnore: true */ "ioredis")).default;

    // USE_REDIS ya garantizó que la env var está seteada.
    const connection = new Redis(process.env.ZENWORK_REDIS_URL!, {
      maxRetriesPerRequest: 3,
    });

    notificationQueue = new bullmq.Queue("notifications", { connection });
    webhookQueue = new bullmq.Queue("webhooks", { connection });

    return;
  } catch (error) {
    console.warn("⚠️  Error inicializando Redis/BullMQ. Modo memoria activo.");
    USE_REDIS_PROXY = false;
  }
}

// Variable para actualizar si falla la inicialización
let USE_REDIS_PROXY = USE_REDIS;

async function addToQueue(queue: string, data: Record<string, unknown>) {
  if (USE_REDIS_PROXY && notificationQueue && queue === "notifications") {
    await notificationQueue.add("job", data);
    return;
  }
  if (USE_REDIS_PROXY && webhookQueue && queue === "webhooks") {
    await webhookQueue.add("deliver", data);
    return;
  }

  // Fallback a memoria
  memoryQueues[queue] = memoryQueues[queue] || [];
  memoryQueues[queue].push(data);

  // Procesar inmediatamente (modo local)
  if (queue === "notifications") {
    processNotification(data).catch((err) => console.error("Notification error:", err));
  } else if (queue === "webhooks") {
    processWebhookDelivery(data).catch((err) => console.error("Webhook error:", err));
  }
}

// ============================================================
// NOTIFICATION PROCESSING
// ============================================================

async function processNotification(data: Record<string, unknown>) {
  const { type, userId, organizationId, payload, title, message, emailHtml } = data as any;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) return;

  try {
    await sendEmail({
      to: user.email,
      subject: title || "Notificación de ZenWork",
      html: emailHtml || `<p>${message || ""}</p>`,
    });
  } catch (error) {
    console.error("Email send failed:", error);
  }

  // Guardar notificación en BD
  await prisma.notification.create({
    data: {
      userId,
      organizationId,
      type: type as string,
      title: title || "Notificación",
      message: message || "",
      data: serializeJSON(payload || {}),
    },
  }).catch((err) => console.error("Notification DB error:", err));
}

// ============================================================
// WEBHOOK DELIVERY PROCESSING
// ============================================================

// Backoff exponencial: 1min, 5min, 30min, 2h, 6h (según el intento que falló).
const RETRY_BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3600_000, 6 * 3600_000];

async function processWebhookDelivery(data: Record<string, unknown>) {
  const { webhookId, event, payload } = data as any;

  const webhook = await prisma.webhook.findUnique({
    where: { id: webhookId },
  });

  if (!webhook || !webhook.isActive) return;

  // Verificar suscripción al evento
  const subscribedEvents = parseStringArray(webhook.events);
  if (!subscribedEvents.includes(event)) return;

  // Registrar intento
  const delivery = await prisma.webhookDelivery.create({
    data: {
      webhookId,
      event,
      payload: serializeJSON(payload),
      status: "PENDING",
    },
  });

  await attemptDelivery(delivery.id, webhook.url, webhook.secret, event, payload);
}

// Envía (o reintenta) una entrega puntual y decide, según el resultado, si
// queda como SUCCESS, se agenda un reintento (PENDING + nextRetryAt) o pasa
// a FAILED terminal (dead letter) al agotar maxAttempts.
async function attemptDelivery(
  deliveryId: string,
  url: string,
  secret: string,
  event: string,
  payload: unknown
) {
  const payloadString = JSON.stringify(payload);
  const signature = signWebhookPayload(payloadString, secret);

  const current = await prisma.webhookDelivery.findUnique({ where: { id: deliveryId } });
  if (!current) return;

  const attemptNumber = current.attempts + 1;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ZenWork-Signature": signature,
        "X-ZenWork-Event": event,
        "X-ZenWork-Delivery": deliveryId,
        "User-Agent": "ZenWork-Webhook/1.0",
      },
      body: payloadString,
    });

    if (response.ok) {
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: "SUCCESS",
          response: serializeJSON({ status: response.status, ok: true }),
          deliveredAt: new Date(),
          attempts: attemptNumber,
          nextRetryAt: null,
        },
      });
      return;
    }

    await scheduleRetryOrFail(
      deliveryId,
      attemptNumber,
      current.maxAttempts,
      serializeJSON({ status: response.status, ok: false })
    );
    console.error(`Webhook delivery failed: ${url} -> ${response.status}`);
  } catch (error) {
    const message = (error as Error).message;
    await scheduleRetryOrFail(
      deliveryId,
      attemptNumber,
      current.maxAttempts,
      serializeJSON({ error: message })
    );
    console.error(`Webhook delivery error: ${message}`);
  }
}

async function scheduleRetryOrFail(
  deliveryId: string,
  attemptNumber: number,
  maxAttempts: number,
  response: string
) {
  if (attemptNumber >= maxAttempts) {
    // Dead letter: se agotaron los reintentos.
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: "FAILED", response, attempts: attemptNumber, nextRetryAt: null },
    });
    return;
  }

  const backoffIndex = Math.min(attemptNumber - 1, RETRY_BACKOFF_MS.length - 1);
  const backoff = RETRY_BACKOFF_MS[backoffIndex] ?? 60_000;
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: "PENDING",
      response,
      attempts: attemptNumber,
      nextRetryAt: new Date(Date.now() + backoff),
    },
  });
}

// Llamado periódicamente por el worker: busca entregas pendientes cuyo
// nextRetryAt ya pasó y reintenta el envío.
export async function retryPendingWebhookDeliveries(): Promise<void> {
  const due = await prisma.webhookDelivery.findMany({
    where: {
      status: "PENDING",
      nextRetryAt: { lte: new Date() },
    },
    include: { webhook: true },
    take: 100,
  });

  for (const delivery of due) {
    if (!delivery.webhook.isActive) continue;
    try {
      await attemptDelivery(
        delivery.id,
        delivery.webhook.url,
        delivery.webhook.secret,
        delivery.event,
        parseJSON(delivery.payload)
      );
    } catch (error) {
      console.error("Retry webhook delivery error:", error);
    }
  }
}

// Iniciar colas (cuando se importa el módulo)
setupQueues();

// ============================================================
// EVENT BUS
// ============================================================

export interface EventBusEvent {
  type: WebhookEvent;
  organizationId: string;
  payload: Record<string, unknown>;
  userId?: string;
}

export async function emitEvent(event: EventBusEvent): Promise<void> {
  // Guardar evento en BD (para auditoría e historial)
  await prisma.event.create({
    data: {
      type: event.type,
      payload: serializeJSON(event.payload),
      source: "api",
    },
  });

  // Enviar notificaciones a usuarios afectados
  const affectedUsers = await getAffectedUsers(event);
  for (const userId of affectedUsers) {
    await addToQueue("notifications", {
      type: event.type,
      userId,
      organizationId: event.organizationId,
      payload: event.payload,
      title: getNotificationTitle(event.type),
      message: getNotificationMessage(event.type, event.payload),
    });
  }

  await dispatchWebhooks(event.organizationId, event.type, event.payload);
}

// Envía el evento a los webhooks salientes configurados por el usuario para
// esa organización (los que estén suscritos a este tipo de evento). Se
// expone aparte de emitEvent para poder dispararlos desde rutas que ya
// generan sus propias notificaciones in-app y no quieren duplicarlas.
export async function dispatchWebhooks(
  organizationId: string,
  eventType: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      organizationId,
      isActive: true,
    },
  });

  for (const webhook of webhooks) {
    const subscribed = parseStringArray(webhook.events);
    if (!subscribed.includes(eventType)) continue;

    await addToQueue("webhooks", {
      webhookId: webhook.id,
      event: eventType,
      payload: {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload,
      },
    });
  }
}

// ============================================================
// HELPERS
// ============================================================

async function getAffectedUsers(event: EventBusEvent): Promise<string[]> {
  switch (event.type) {
    case "issue.assigned":
      return event.payload.assigneeId
        ? [event.payload.assigneeId as string]
        : [];
    case "issue.created":
    case "comment.created":
      return event.payload.creatorId
        ? [event.payload.creatorId as string]
        : [];
    case "member.joined":
      return event.payload.userId
        ? [event.payload.userId as string]
        : [];
    default:
      const members = await prisma.membership.findMany({
        where: { organizationId: event.organizationId, isActive: true },
      });
      return members.map((m) => m.userId);
  }
}

function getNotificationTitle(type: WebhookEvent): string {
  const titles: Record<string, string> = {
    "issue.created": "Nuevo issue creado",
    "issue.updated": "Issue actualizado",
    "issue.deleted": "Issue eliminado",
    "issue.assigned": "Issue asignado",
    "comment.created": "Nuevo comentario",
    "board.card.created": "Nueva tarjeta",
    "board.card.moved": "Tarjeta movida",
    "board.card.deleted": "Tarjeta eliminada",
    "document.created": "Nuevo documento",
    "document.updated": "Documento actualizado",
    "document.published": "Documento publicado",
    "member.joined": "Nuevo miembro",
    "member.left": "Miembro salió",
  };
  return titles[type] || "Notificación de ZenWork";
}

function getNotificationMessage(type: WebhookEvent, payload: Record<string, unknown>): string {
  const title = (payload as any).title || "elemento";
  const project = (payload as any).projectName || "";
  switch (type) {
    case "issue.created":
      return `Se creó el issue "${title}" en ${project}`;
    case "issue.assigned":
      return `Te asignaron el issue "${title}"`;
    case "comment.created":
      return `Nuevo comentario en "${title}"`;
    default:
      return `Nueva actividad en ZenWork: ${title}`;
  }
}

// ============================================================
// CLEANUP STALE JOBS
// ============================================================

export async function cleanupStaleJobs(): Promise<void> {
  try {
    await prisma.webhookDelivery.updateMany({
      where: {
        status: "PENDING",
        createdAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      data: { status: "FAILED" },
    });
  } catch (error) {
    console.error("Cleanup error:", error);
  }
}
