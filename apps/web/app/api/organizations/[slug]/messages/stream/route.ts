import { NextRequest } from "next/server";
import { verifyAccessToken } from "@zenwork/auth";
import { prisma } from "@zenwork/db";
import { COOKIE_NAMES } from "@zenwork/shared";
import { bus, chatRoom, listPresent, markAbsent, markPresent } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 15_000;
const PRESENCE_REFRESH_MS = 10_000;

// Server-Sent Events: reemplaza el polling de 4s del chat por push real.
// Mientras la conexión sigue abierta, el cliente cuenta como "en línea" de
// verdad (presencia real, no la lista simulada de antes).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sessionToken = request.cookies.get(COOKIE_NAMES.SESSION)?.value;
  if (!sessionToken) {
    return new Response("No autenticado", { status: 401 });
  }

  let userId: string;
  try {
    const payload = await verifyAccessToken(sessionToken);
    userId = payload.sub;
  } catch {
    return new Response("Sesión inválida", { status: 401 });
  }

  const org = await prisma.organization.findFirst({
    where: { slug, memberships: { some: { userId, isActive: true } } },
    select: { id: true },
  });
  if (!org) {
    return new Response("Organización no encontrada", { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId") || undefined;
  const room = chatRoom(org.id, projectId);

  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let presenceTimer: ReturnType<typeof setInterval> | undefined;
  let listener: ((event: { type: string; data: unknown }) => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      }

      listener = (event) => send(event.type, event.data);
      bus.on(room, listener);

      markPresent(room, userId, user?.name || "Alguien");
      send("presence", listPresent(room));

      heartbeatTimer = setInterval(() => {
        controller.enqueue(encoder.encode(`: ping\n\n`));
      }, HEARTBEAT_MS);

      presenceTimer = setInterval(() => {
        markPresent(room, userId, user?.name || "Alguien");
      }, PRESENCE_REFRESH_MS);
    },
    cancel() {
      if (listener) bus.off(room, listener);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (presenceTimer) clearInterval(presenceTimer);
      markAbsent(room, userId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
