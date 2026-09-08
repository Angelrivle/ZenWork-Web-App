import { RATE_LIMITS } from "@zenwork/shared";

// ============================================================
// RATE LIMITER
// Distribuido con Redis (sorted set = ventana deslizante) cuando
// ZENWORK_REDIS_URL está configurada; si no, cae a un store en memoria del
// propio proceso (suficiente para dev, pero NO sirve entre réplicas/
// instancias serverless — de ahí la necesidad de Redis en producción).
// ============================================================

interface RateLimitConfig {
  points: number; // Máximo de peticiones
  duration: number; // Ventana en segundos
  keyPrefix?: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// ---------------- Redis (opcional) ----------------

let redisClient: any = null;
let redisInitAttempted = false;

async function getRedisClient(): Promise<any | null> {
  if (!process.env.ZENWORK_REDIS_URL) return null;
  if (redisClient) return redisClient;
  if (redisInitAttempted) return null; // ya falló antes, no reintentar en cada request

  redisInitAttempted = true;
  try {
    // webpackIgnore evita que Next.js intente empaquetar ioredis en el
    // bundle serverless (falla porque usa imports "node:*" que webpack no
    // sabe resolver) — se resuelve como require normal en runtime Node.
    const Redis = (await import(/* webpackIgnore: true */ "ioredis")).default;
    const client = new Redis(process.env.ZENWORK_REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: false,
    });
    client.on("error", (err: Error) => {
      console.error("[rate-limit] Redis error:", err.message);
    });
    redisClient = client;
    return redisClient;
  } catch (error) {
    console.warn("[rate-limit] No se pudo inicializar Redis, usando memoria:", (error as Error).message);
    return null;
  }
}

async function checkRateLimitRedis(
  client: any,
  storeKey: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = config.duration * 1000;
  const redisKey = `ratelimit:${storeKey}`;
  const member = `${now}-${Math.random().toString(36).slice(2)}`;

  // Ventana deslizante con un sorted set: score = timestamp, se podan los
  // miembros más viejos que la ventana antes de contar.
  const results = await client
    .multi()
    .zremrangebyscore(redisKey, 0, now - windowMs)
    .zadd(redisKey, now, member)
    .zcard(redisKey)
    .pexpire(redisKey, windowMs)
    .exec();

  const count = results?.[2]?.[1] as number;
  const remaining = Math.max(0, config.points - count);
  const resetAt = now + windowMs;

  if (count > config.points) {
    // El miembro más viejo que sigue en la ventana define cuándo libera cupo.
    const oldest = await client.zrange(redisKey, 0, 0, "WITHSCORES");
    const oldestTs = oldest?.[1] ? Number(oldest[1]) : now;
    const retryAfter = Math.max(1, Math.ceil((oldestTs + windowMs - now) / 1000));
    return { allowed: false, remaining: 0, resetAt, retryAfter };
  }

  return { allowed: true, remaining, resetAt };
}

// ---------------- Memoria (fallback local) ----------------

// Estado en memoria - Map<key, number[] timestamps>
const memoryStore = new Map<string, number[]>();

// Limpiar store de memoria periódicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of memoryStore.entries()) {
    const filtered = timestamps.filter((t) => now - t < 3600 * 1000);
    if (filtered.length === 0) memoryStore.delete(key);
    else memoryStore.set(key, filtered);
  }
}, 60 * 1000).unref?.();

function checkRateLimitMemory(
  storeKey: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.duration * 1000;

  // Limpiar entradas expiradas
  const timestamps = (memoryStore.get(storeKey) || []).filter(
    (t) => now - t < windowMs
  );

  // Agregar petición actual
  timestamps.push(now);
  memoryStore.set(storeKey, timestamps);

  const count = timestamps.length;
  const remaining = Math.max(0, config.points - count);
  const resetAt = timestamps[0] ? timestamps[0] + windowMs : now + windowMs;

  if (count > config.points) {
    const oldest = timestamps[0] ?? now;
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, resetAt, retryAfter };
  }

  return { allowed: true, remaining, resetAt };
}

export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const storeKey = `${config.keyPrefix || "rl"}:${key}`;

  const client = await getRedisClient();
  if (client) {
    try {
      return await checkRateLimitRedis(client, storeKey, config);
    } catch (error) {
      console.error("[rate-limit] Fallo en Redis, usando memoria como fallback:", (error as Error).message);
    }
  }

  return checkRateLimitMemory(storeKey, config);
}

// ============================================================
// SPECIFIC RATE LIMITERS
// ============================================================

export async function checkLoginRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  return checkRateLimit(`login:${identifier}`, RATE_LIMITS.LOGIN);
}

export async function checkApiRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  return checkRateLimit(`api:${identifier}`, RATE_LIMITS.API_GENERAL);
}

export async function checkWebhookRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  return checkRateLimit(`webhook:${identifier}`, RATE_LIMITS.WEBHOOK_INCOMING);
}

export async function checkRegisterRateLimit(
  identifier: string
): Promise<RateLimitResult> {
  return checkRateLimit(`register:${identifier}`, RATE_LIMITS.REGISTER);
}

// ============================================================
// HELMET HEADERS
// ============================================================

export function getSecurityHeaders() {
  return {
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https: wss:; frame-ancestors 'none';",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "Strict-Transport-Security":
      "max-age=63072000; includeSubDomains; preload",
  };
}

// ============================================================
// CSRF UTILITIES
// ============================================================

export function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

export function validateCsrfToken(token: string, sessionToken: string): boolean {
  return token === sessionToken;
}

// ============================================================
// INPUT SANITIZATION
// ============================================================

export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  let clean = html;

  // 1. Eliminar tags potencialmente ejecutables o peligrosos
  const dangerousTags = [
    "script", "iframe", "object", "embed", "applet", "base", "meta",
    "link", "form", "svg", "style", "input", "textarea", "button", "frame", "frameset"
  ];

  for (const tag of dangerousTags) {
    const regex = new RegExp(`</?${tag}\\b[^>]*>`, "gi");
    // Repetir para desarmar tags anidados como <scr<script>ipt>
    while (regex.test(clean)) {
      clean = clean.replace(regex, "");
    }
  }

  // 2. Eliminar cualquier manejador de eventos inline (onclick, onerror, onload, etc.)
  // sin importar espacios ni formato de comillas o atributos booleanos
  clean = clean.replace(/\son\w+(\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+))?/gi, "");

  // 3. Desarmar protocolos peligrosos en atributos (javascript:, vbscript:, etc.)
  clean = clean.replace(
    /(href|src|action|data)\s*=\s*["']?\s*(?:javascript|vbscript|data(?!\/image)):[^"'\s>]*["']?/gi,
    ""
  );

  return clean;
}

// ============================================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================================

import CryptoJS from "crypto-js";

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function signWebhookPayload(payload: string, secret: string): string {
  return CryptoJS.HmacSHA256(payload, secret).toString();
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expected = signWebhookPayload(payload, secret);
    return timingSafeEqualStrings(expected, signature);
  } catch {
    return false;
  }
}

// ============================================================
// ANTI-SSRF WEBHOOK URL VALIDATION
// ============================================================

export function isSafeWebhookUrl(urlString: string): { safe: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { safe: false, reason: "URL mal formada" };
  }

  // Protocolo: en producción solo HTTPS
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    return { safe: false, reason: "En producción solo se permiten webhooks con HTTPS" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, reason: "Protocolo no soportado (solo HTTP/HTTPS)" };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Nombres de host bloqueados (loopback, metadata)
  const blockedHostnames = [
    "localhost",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
    "169.254.169.254",
    "metadata.google.internal",
    "instance-data",
  ];

  if (blockedHostnames.includes(hostname)) {
    return { safe: false, reason: "No se permiten URLs a hosts locales o de metadatos" };
  }

  // Comprobar si es IPv4 directa y validar rangos privados
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (match && match[1] && match[2] && match[3] && match[4]) {
    const oct1 = Number(match[1]);
    const oct2 = Number(match[2]);
    const oct3 = Number(match[3]);
    const oct4 = Number(match[4]);
    if (oct1 > 255 || oct2 > 255 || oct3 > 255 || oct4 > 255) {
      return { safe: false, reason: "Dirección IP inválida" };
    }

    // 127.0.0.0/8 (Loopback)
    if (oct1 === 127) {
      return { safe: false, reason: "No se permiten direcciones de loopback" };
    }
    // 10.0.0.0/8 (Privada)
    if (oct1 === 10) {
      return { safe: false, reason: "No se permiten IPs privadas (10.0.0.0/8)" };
    }
    // 172.16.0.0/12 (Privada)
    if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) {
      return { safe: false, reason: "No se permiten IPs privadas (172.16.0.0/12)" };
    }
    // 192.168.0.0/16 (Privada)
    if (oct1 === 192 && oct2 === 168) {
      return { safe: false, reason: "No se permiten IPs privadas (192.168.0.0/16)" };
    }
    // 169.254.0.0/16 (Link-local / Cloud Metadata)
    if (oct1 === 169 && oct2 === 254) {
      return { safe: false, reason: "No se permiten IPs de enlace local o metadatos (169.254.0.0/16)" };
    }
    // 0.0.0.0/8
    if (oct1 === 0) {
      return { safe: false, reason: "Dirección IP no enrutable" };
    }
  }

  return { safe: true };
}

// ============================================================
// REQUEST VALIDATION WITH ZOD
// ============================================================

import { ZodSchema } from "zod";

export function validateRequest<T>(
  schema: ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}
