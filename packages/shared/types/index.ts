// Tipos compartidos entre frontend y backend
export type OrgRole = "OWNER" | "ADMIN" | "MEMBER" | "GUEST";

export type ProjectStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

export type IssuePriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "BLOCKER";

export type StatusCategory = "TODO" | "IN_PROGRESS" | "DONE";

export type IssueRelationType = "BLOCKS" | "BLOCKED_BY" | "RELATES_TO" | "DUPLICATES";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export type NotificationType =
  | "ISSUE_CREATED"
  | "ISSUE_UPDATED"
  | "ISSUE_ASSIGNED"
  | "COMMENT_CREATED"
  | "MENTION"
  | "DEADLINE_APPROACHING"
  | "INVITATION"
  | "SYSTEM";

export type WebhookStatus = "PENDING" | "SUCCESS" | "FAILED" | "DEAD_LETTER";

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// JWT Payload
export interface JWTPayload {
  sub: string; // userId
  email: string;
  orgId?: string;
  roles: OrgRole[];
  purpose?: string;
  iat: number;
  exp: number;
}

export interface TwoFactorTempPayload {
  sub: string; // userId
  email: string;
  purpose: "2fa_pending";
  iat: number;
  exp: number;
}

// Session
export interface ZenWorkSession {
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
    role: OrgRole;
  };
}

// Issue with relations
export interface IssueWithRelations {
  id: string;
  number: number;
  title: string;
  description?: string;
  priority: IssuePriority;
  storyPoints?: number;
  dueDate?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  type: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
  };
  status: {
    id: string;
    name: string;
    color: string;
    category: StatusCategory;
  };
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  creator: {
    id: string;
    name: string;
    avatar?: string;
  };
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

// Board with columns and cards
export interface BoardWithRelations {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  columns: Array<{
    id: string;
    name: string;
    color?: string;
    position: number;
    limit?: number;
    cards: Array<{
      id: string;
      title: string;
      description?: string;
      position: number;
      dueDate?: string;
      assignee?: {
        id: string;
        name: string;
        avatar?: string;
      };
      labels: Array<{
        name: string;
        color: string;
      }>;
    }>;
  }>;
}

// Document with content
export interface DocumentWithContent {
  id: string;
  title: string;
  slug: string;
  content: Record<string, unknown>;
  icon?: string;
  cover?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  children?: DocumentWithContent[];
}
