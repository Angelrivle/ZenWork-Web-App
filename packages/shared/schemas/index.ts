import { z } from "zod";

// ============================================================
// AUTH SCHEMAS
// ============================================================

export const registerSchema = z.object({
  email: z.string().email("Email inválido").max(320).transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
      "Debe contener mayúscula, minúscula, número y carácter especial"
    ),
  name: z.string().min(2, "Nombre muy corto").max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Contraseña requerida"),
});

export const twoFactorVerifySchema = z.object({
  token: z.string().length(6, "El código TOTP debe tener 6 dígitos"),
});

export const twoFactorEnableSchema = z.object({
  secret: z.string(),
  token: z.string().length(6),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/,
      "Debe contener mayúscula, minúscula, número y carácter especial"
    ),
});

// ============================================================
// ORGANIZATION SCHEMAS
// ============================================================

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug solo puede contener minúsculas, números y guiones"
    ),
  description: z.string().max(1000).optional(),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional(),
  logo: z.string().url().optional(),
});

// ============================================================
// PROJECT SCHEMAS
// ============================================================

export const createProjectSchema = z.object({
  name: z.string().min(2).max(200),
  key: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z][A-Z0-9]*$/, "Key debe empezar con mayúscula, solo alfanumérico"),
  description: z.string().max(2000).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  key: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z][A-Z0-9]*$/, "Key debe empezar con mayúscula, solo alfanumérico")
    .optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

// ============================================================
// PROJECT CONFIG SCHEMAS (tipos, estados, etiquetas)
// ============================================================

export const createIssueTypeSchema = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser hexadecimal")
    .optional(),
  icon: z.string().max(30).optional(),
});

export const updateIssueTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser hexadecimal")
    .nullable()
    .optional(),
  icon: z.string().max(30).nullable().optional(),
});

export const createIssueStatusSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["TODO", "IN_PROGRESS", "DONE", "ARCHIVED"]),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser hexadecimal")
    .optional(),
  order: z.number().int().min(0).optional(),
});

export const updateIssueStatusSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.enum(["TODO", "IN_PROGRESS", "DONE", "ARCHIVED"]).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser hexadecimal")
    .nullable()
    .optional(),
  order: z.number().int().min(0).optional(),
});

export const createLabelSchema = z.object({
  name: z.string().min(1).max(50),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser hexadecimal")
    .optional(),
});

export const updateLabelSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser hexadecimal")
    .optional(),
});

// ============================================================
// ISSUE SCHEMAS
// ============================================================

// Las IDs de ZenWork son CUIDs (no UUIDs). `z.string().min(1)` permite
// cualquier string no vacío y funciona con ambos.
const id = z.string().min(1);

export const createIssueSchema = z.object({
  projectId: id.optional(), // opcional: la ruta lo toma del parámetro de URL
  title: z.string().min(1).max(500),
  description: z.string().max(50000).optional(),
  typeId: id,
  statusId: id,
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL", "BLOCKER"]).optional(),
  assigneeId: id.optional(),
  storyPoints: z.number().min(0).max(100).optional(),
  dueDate: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
  parentIssueId: id.optional(),
});

export const updateIssueSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(50000).optional(),
  typeId: id.optional(),
  statusId: id.optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL", "BLOCKER"]).optional(),
  assigneeId: id.nullable().optional(),
  storyPoints: z.number().min(0).max(100).nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================
// BOARD SCHEMAS
// ============================================================

export const createBoardSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  projectId: id.optional(),
});

export const createBoardColumnSchema = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser hexadecimal")
    .optional(),
  limit: z.number().int().min(1).optional(),
});

export const updateBoardColumnSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Color debe ser hexadecimal")
    .optional(),
});

export const createBoardCardSchema = z.object({
  columnId: id,
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  issueId: id.optional(),
  assigneeId: id.optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateBoardCardSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(5000).nullable().optional(),
  assigneeId: id.nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  columnId: id.optional(),
});

export const moveCardSchema = z.object({
  columnId: id,
  // Opcional: si se omite, el servidor calcula la posición fraccional
  // (al final de la columna) sin reindexar el resto de las tarjetas.
  position: z.number().optional(),
});

export const createChecklistSchema = z.object({
  cardId: id,
  title: z.string().min(1).max(200),
});

export const createChecklistItemSchema = z.object({
  checklistId: id,
  text: z.string().min(1).max(500),
});

export const updateChecklistItemSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  isChecked: z.boolean().optional(),
});

// ============================================================
// DOCUMENT SCHEMAS
// ============================================================

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  slug: z
    .string()
    .min(1)
    .max(500)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido"),
  projectId: id.optional(),
  parentId: id.optional(),
  icon: z.string().max(50).optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.record(z.unknown()).optional(),
  isPublished: z.boolean().optional(),
  icon: z.string().max(50).optional(),
  cover: z.string().url().optional(),
});

// ============================================================
// CHAT SCHEMAS
// ============================================================

export const createMessageSchema = z.object({
  content: z.string().min(1, "El mensaje no puede estar vacío").max(10000),
  parentId: id.optional(),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

// ============================================================
// COMMENT SCHEMAS
// ============================================================

export const createCommentSchema = z.object({
  content: z.string().min(1).max(10000),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================================
// INVITATION SCHEMAS
// ============================================================

export const inviteMemberSchema = z.object({
  email: z.string().email("Email inválido").transform((v) => v.toLowerCase()),
  role: z.enum(["ADMIN", "MEMBER", "GUEST"]).optional(),
});

// ============================================================
// WEBHOOK SCHEMAS
// ============================================================

export const createWebhookSchema = z.object({
  url: z.string().url("URL inválida"),
  events: z.array(z.string()).min(1, "Selecciona al menos un evento"),
  secret: z.string().min(16).max(255).optional(),
});

// ============================================================
// COMMON SCHEMAS
// ============================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1, "ID inválido"),
});

// ============================================================
// PROFILE SCHEMAS
// ============================================================

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  avatar: z.string().url().optional(),
  timezone: z.string().max(50).optional(),
  language: z.string().max(10).optional(),
  preferences: z
    .object({
      emailNotifications: z.boolean().optional(),
      discordNotifications: z.boolean().optional(),
    })
    .optional(),
});
