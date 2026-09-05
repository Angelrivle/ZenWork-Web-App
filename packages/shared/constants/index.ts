// ============================================================
// ORG ROLES
// ============================================================

export const ORG_ROLE_PERMISSIONS = {
  OWNER: [
    "org:manage",
    "org:delete",
    "org:billing",
    "org:members:manage",
    "org:members:invite",
    "org:settings:manage",
    "project:create",
    "project:manage",
    "project:delete",
    "issue:create",
    "issue:manage",
    "issue:delete",
    "board:create",
    "board:manage",
    "board:delete",
    "document:create",
    "document:manage",
    "document:delete",
    "webhook:create",
    "webhook:manage",
    "audit:read",
  ],
  ADMIN: [
    "org:members:manage",
    "org:members:invite",
    "org:settings:manage",
    "project:create",
    "project:manage",
    "issue:create",
    "issue:manage",
    "board:create",
    "board:manage",
    "document:create",
    "document:manage",
    "webhook:create",
    "webhook:manage",
  ],
  MEMBER: [
    "project:read",
    "issue:create",
    "issue:manage:own",
    "board:read",
    "board:cards:manage",
    "document:create",
    "document:manage:own",
  ],
  GUEST: [
    "project:read",
    "issue:read",
    "board:read",
    "document:read",
  ],
} as const;

export type Permission = (typeof ORG_ROLE_PERMISSIONS)[keyof typeof ORG_ROLE_PERMISSIONS][number];

// ============================================================
// WEBHOOK EVENTS
// ============================================================

export const WEBHOOK_EVENTS = [
  "issue.created",
  "issue.updated",
  "issue.deleted",
  "issue.assigned",
  "comment.created",
  "board.card.created",
  "board.card.moved",
  "board.card.deleted",
  "document.created",
  "document.updated",
  "document.published",
  "member.joined",
  "member.left",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

// ============================================================
// RATE LIMITS
// ============================================================

export const RATE_LIMITS = {
  LOGIN: { points: 5, duration: 60 }, // 5 intentos por minuto
  REGISTER: { points: 3, duration: 3600 }, // 3 registros por hora
  API_GENERAL: { points: 100, duration: 60 }, // 100 requests por minuto
  WEBHOOK_INCOMING: { points: 30, duration: 60 }, // 30 por minuto
  PASSWORD_RESET: { points: 3, duration: 3600 }, // 3 por hora
  INVITATION: { points: 10, duration: 3600 }, // 10 por hora
} as const;

// ============================================================
// JWT CONFIG
// ============================================================

export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: 15 * 60, // 15 minutos en segundos
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60, // 7 días en segundos
  REFRESH_TOKEN_ROTATION_EXPIRY: 30 * 24 * 60 * 60, // 30 días para rotación completa
  ISSUER: "zenwork",
  ALGORITHM: "HS256",
} as const;

// ============================================================
// COOKIE NAMES
// ============================================================

export const COOKIE_NAMES = {
  SESSION: "zenwork_session",
  REFRESH_TOKEN: "zenwork_refresh_token",
  CSRF: "zenwork_csrf",
} as const;

// ============================================================
// 2FA CONFIG
// ============================================================

export const TWO_FACTOR_CONFIG = {
  ISSUER: "ZenWork",
  DIGITS: 6,
  PERIOD: 30, // segundos
  WINDOW: 1, // tolerancia de ventanas
  BACKUP_CODES_COUNT: 10,
} as const;

// ============================================================
// PAGINATION DEFAULTS
// ============================================================

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ============================================================
// ISSUE TYPE DEFAULTS
// ============================================================

export const DEFAULT_ISSUE_TYPES = [
  { name: "Bug", icon: "bug", color: "#ef4444", isDefault: true },
  { name: "Tarea", icon: "check-square", color: "#3b82f6", isDefault: false },
  { name: "Historia", icon: "book-open", color: "#10b981", isDefault: false },
  { name: "Épica", icon: "layers", color: "#8b5cf6", isDefault: false },
] as const;

// ============================================================
// ISSUE STATUS DEFAULTS
// ============================================================

export const DEFAULT_ISSUE_STATUSES = [
  { name: "Por hacer", color: "#6b7280", category: "TODO" as const, isDefault: true },
  { name: "En progreso", color: "#f59e0b", category: "IN_PROGRESS" as const, isDefault: false },
  { name: "En revisión", color: "#8b5cf6", category: "IN_PROGRESS" as const, isDefault: false },
  { name: "Completado", color: "#10b981", category: "DONE" as const, isDefault: false },
] as const;

// ============================================================
// BOARD DEFAULT COLUMNS
// ============================================================

export const DEFAULT_BOARD_COLUMNS = [
  { name: "Por hacer", color: "#6b7280" },
  { name: "En progreso", color: "#f59e0b" },
  { name: "Hecho", color: "#10b981" },
] as const;

// ============================================================
// NOTIFICATION TEMPLATES
// ============================================================

export const NOTIFICATION_TEMPLATES = {
  ISSUE_CREATED: {
    title: "Nuevo issue creado",
    getMessage: (issueTitle: string, projectName: string) =>
      `Se creó el issue "${issueTitle}" en el proyecto ${projectName}`,
  },
  ISSUE_ASSIGNED: {
    title: "Issue asignado",
    getMessage: (issueTitle: string, assignerName: string) =>
      `${assignerName} te asignó el issue "${issueTitle}"`,
  },
  COMMENT_CREATED: {
    title: "Nuevo comentario",
    getMessage: (issueTitle: string, authorName: string) =>
      `${authorName} comentó en "${issueTitle}"`,
  },
  MENTION: {
    title: "Te mencionaron",
    getMessage: (authorName: string, context: string) =>
      `${authorName} te mencionó en ${context}`,
  },
  INVITATION: {
    title: "Invitación a organización",
    getMessage: (orgName: string, inviterName: string) =>
      `${inviterName} te invitó a unirse a "${orgName}"`,
  },
} as const;

// ============================================================
// EMAIL TEMPLATES (para Resend/SendGrid)
// ============================================================

export const EMAIL_CONFIG = {
  FROM_NAME: "ZenWork",
  FROM_EMAIL: "notificaciones@zenwork.com",
  SUPPORT_EMAIL: "soporte@zenwork.com",
} as const;
