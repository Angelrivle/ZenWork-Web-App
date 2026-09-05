import path from "node:path";
import { PrismaClient } from "../generated/client";

// ============================================================
// DATABASE CONFIGURATION
// ============================================================

// ============================================================
// DATABASE PROVIDER SWITCHER
// ============================================================
// SQLite     -> Desarrollo / pruebas locales (default, sin servidor)
// PostgreSQL -> Producción relacional (recomendado para este schema)
// MySQL      -> Producción relacional
//
// NOTA sobre MongoDB: Nuestro schema Prisma es RELACIONAL (28 modelos con
// FKs/joins). Prisma NO soporta migrar un schema relacional a MongoDB (usa
// modelo de documentos). Para MongoDB se necesitaría una capa de datos
// separada (Mongoose/Firebase), algo incompatible con este switcher.
// Redis NO es una base de datos primaria: se usa para colas/cache vía
// ZENWORK_REDIS_URL (no como proveedor de datos).
export type DBProvider = "sqlite" | "postgresql" | "mysql";

export interface DBConfig {
  provider: DBProvider;
  url: string;
  isLocal: boolean;
}

/**
 * Detecta el provider de BD basado en la variable de entorno.
 * En local: SQLite (sin Docker, sin servidor externo)
 * En producción: PostgreSQL o MySQL (configurable via env)
 */
export function getDBConfig(): DBConfig {
  const provider = (process.env.ZENWORK_DB_PROVIDER || "sqlite") as DBProvider;
  const url = process.env.ZENWORK_DATABASE_URL || getLocalSQLiteURL();
  const isLocal = provider === "sqlite";

  return { provider, url, isLocal };
}

/**
 * URL por defecto para SQLite en local, calculada como ruta ABSOLUTA a
 * partir de `__dirname` (packages/db/src en dev, packages/db/dist en build).
 * Un `datasources.db.url` de SQLite pasado explícitamente a `new
 * PrismaClient()` se resuelve relativo al `process.cwd()` del proceso que
 * lo instancia (no al schema.prisma) — con una ruta relativa, el mismo
 * código apuntaría a bases de datos DISTINTAS según si lo ejecuta el
 * servidor Next.js (cwd apps/web), el worker (cwd apps/worker) o un script
 * suelto. Resolver con __dirname evita ese problema sin depender de que
 * cada entrypoint cargue el mismo .env.
 */
function getLocalSQLiteURL(): string {
  const absolutePath = path.resolve(__dirname, "..", "..", "zenwork-local.db");
  return `file:${absolutePath}`;
}

// ============================================================
// PRISMA CLIENT SINGLETON
// ============================================================

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const config = getDBConfig();

  return new PrismaClient({
    log:
      config.isLocal
        ? ["error", "warn"]
        : ["error"],
    datasources: {
      db: {
        url: config.url,
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { PrismaClient };

// ============================================================
// JSON HELPERS (SQLite no soporta JSONB)
// ============================================================

/**
 * Parsea un campo JSON de la BD.
 * En SQLite los campos JSON son strings, en PostgreSQL/MySQL son objetos.
 */
export function parseJSON<T>(value: unknown): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return {} as T;
    }
  }
  return (value as T) || ({} as T);
}

/**
 * Serializa un objeto a JSON string para BDs que no soportan JSONB.
 */
export function serializeJSON(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value || {});
}

/**
 * Helper para convertir arrays de strings (como events en Webhook)
 * ya que SQLite no soporta arrays nativos.
 */
export function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function serializeStringArray(value: string[]): string {
  return JSON.stringify(value);
}

// ============================================================
// PROVIDER DETECTION HELPERS
// ============================================================

export function isSQLite(): boolean {
  return getDBConfig().provider === "sqlite";
}

export function isPostgreSQL(): boolean {
  return getDBConfig().provider === "postgresql";
}

export function isMySQL(): boolean {
  return getDBConfig().provider === "mysql";
}

// Re-export types
export type * from "../generated/client";
