import { EventEmitter } from "node:events";

// Event bus en memoria para tiempo real (chat + presencia) dentro de UNA
// sola instancia del proceso Next.js. Reemplaza el polling de 4s del chat
// por push real vía Server-Sent Events (SSE), que no requiere un servidor
// custom (a diferencia de Socket.IO/WebSockets puros) y funciona con las
// API routes normales de Next.
//
// Limitación conocida: al ser en memoria, no funciona entre múltiples
// instancias/réplicas (igual que el resto del "modo memoria" del proyecto
// para colas/rate-limit). Para multi-instancia habría que publicar estos
// eventos a través de Redis pub/sub en vez del EventEmitter local.
//
// Patrón singleton global (como el cliente Prisma) para sobrevivir al
// hot-reload de Next en desarrollo.
const globalForRealtime = globalThis as unknown as {
  __zenworkBus?: EventEmitter;
  __zenworkPresence?: Map<string, Map<string, PresenceEntry>>;
};

export const bus = globalForRealtime.__zenworkBus ?? new EventEmitter();
if (!globalForRealtime.__zenworkBus) {
  bus.setMaxListeners(0);
  globalForRealtime.__zenworkBus = bus;
}

interface PresenceEntry {
  userId: string;
  name: string;
  lastSeen: number;
}

// room -> userId -> presencia
const presence = globalForRealtime.__zenworkPresence ?? new Map<string, Map<string, PresenceEntry>>();
if (!globalForRealtime.__zenworkPresence) {
  globalForRealtime.__zenworkPresence = presence;
}

const PRESENCE_TTL_MS = 20_000;

export function chatRoom(organizationId: string, projectId?: string | null) {
  return projectId ? `chat:${organizationId}:${projectId}` : `chat:${organizationId}`;
}

export function publishMessage(room: string, message: unknown) {
  bus.emit(room, { type: "message", data: message });
}

export function markPresent(room: string, userId: string, name: string) {
  let roomMap = presence.get(room);
  if (!roomMap) {
    roomMap = new Map();
    presence.set(room, roomMap);
  }
  roomMap.set(userId, { userId, name, lastSeen: Date.now() });
  bus.emit(room, { type: "presence", data: listPresent(room) });
}

export function markAbsent(room: string, userId: string) {
  const roomMap = presence.get(room);
  if (!roomMap) return;
  roomMap.delete(userId);
  bus.emit(room, { type: "presence", data: listPresent(room) });
}

export function listPresent(room: string): string[] {
  const roomMap = presence.get(room);
  if (!roomMap) return [];
  const now = Date.now();
  const ids: string[] = [];
  for (const [userId, entry] of roomMap) {
    if (now - entry.lastSeen > PRESENCE_TTL_MS) {
      roomMap.delete(userId);
      continue;
    }
    ids.push(userId);
  }
  return ids;
}
