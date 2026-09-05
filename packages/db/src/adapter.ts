/**
 * ZenWork Database Adapter
 * Abstracts differences between SQLite (dev) and PostgreSQL/MySQL (prod)
 */

import {
  prisma,
  parseJSON,
  serializeJSON,
  parseStringArray,
  serializeStringArray,
  isSQLite,
  isPostgreSQL,
  isMySQL,
  getDBConfig,
} from "./index";

// Re-export helpers for use in services
export {
  parseJSON,
  serializeJSON,
  parseStringArray,
  serializeStringArray,
  isSQLite,
  isPostgreSQL,
  isMySQL,
  getDBConfig,
  prisma,
};

// ============================================================
// WEBHOOK EVENTS - SQLite usa string separado por comas
// ============================================================

export function parseEvents(events: unknown): string[] {
  if (Array.isArray(events)) return events;
  return parseStringArray(events);
}

export function serializeEvents(events: string[]): string {
  return serializeStringArray(events);
}

// ============================================================
// JSON FIELDS - SQLite almacena como string
// ============================================================

export function parseSettings(settings: unknown): Record<string, unknown> {
  return parseJSON<Record<string, unknown>>(settings);
}

export function serializeSettings(settings: Record<string, unknown>): string {
  return serializeJSON(settings);
}

// ============================================================
// TRANSACTION HELPER
// ============================================================

export async function transaction<T>(
  fn: (tx: typeof prisma) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => fn(tx as unknown as typeof prisma));
}

// ============================================================
// PAGINATION HELPER
// ============================================================

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function getPaginationParams(options: PaginationOptions) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ============================================================
// SOFT DELETE HELPER
// ============================================================

export async function softDelete(
  model: string,
  id: string
): Promise<void> {
  const now = new Date();
  await (prisma as any)[model].update({
    where: { id },
    data: { deletedAt: now },
  });
}

// ============================================================
// SEARCH HELPER (compatibilidad entre providers)
// ============================================================

export function buildSearchWhere(
  fields: string[],
  search?: string
): Record<string, unknown> | undefined {
  if (!search || search.trim() === "") return undefined;

  // SQLite y PostgreSQL/MySQL manejan LIKE de forma similar
  const searchPattern = `%${search}%`;

  if (fields.length === 1) {
    const key = fields[0] as string;
    return { [key]: { contains: searchPattern } };
  }

  return {
    OR: fields.map((field) => ({
      [field]: { contains: searchPattern },
    })),
  } as Record<string, unknown>;
}
