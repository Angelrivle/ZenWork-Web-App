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
  // Remover script tags y eventos inline
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/expression\(/gi, "");
}

// ============================================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================================

import CryptoJS from "crypto-js";

export function signWebhookPayload(payload: string, secret: string): string {
  return CryptoJS.HmacSHA256(payload, secret).toString();
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = signWebhookPayload(payload, secret);
  return CryptoJS.enc.Hex.stringify(CryptoJS.enc.Hex.parse(signature)) === expected;
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
