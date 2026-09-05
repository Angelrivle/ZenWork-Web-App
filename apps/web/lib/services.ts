import { prisma, parseJSON, serializeJSON, serializeStringArray, transaction } from "@zenwork/db/adapter";
import type { OrgRole } from "@zenwork/shared";

// ============================================================
// ORGANIZATION SERVICE
// ============================================================

export async function createOrganization(
  ownerId: string,
  data: { name: string; slug: string; description?: string }
) {
  return transaction((tx) => createOrganizationBody(tx, ownerId, data));
}

// Cuerpo reutilizable que recibe el `tx` activo (para evitar transacciones anidadas).
export async function createOrganizationBody(
  tx: typeof prisma,
  ownerId: string,
  data: { name: string; slug: string; description?: string }
) {
    // Crear organización
    const org = await tx.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        ownerId,
      },
    });

    // Crear membresía del owner
    await tx.membership.create({
      data: {
        userId: ownerId,
        organizationId: org.id,
        role: "OWNER" as OrgRole,
      },
    });

    // Crear proyecto de bienvenida "Mi primer proyecto en ZenWork"
    const project = await tx.project.create({
      data: {
        name: "Mi primer proyecto en ZenWork",
        key: "ZEN",
        description: "Proyecto de ejemplo para explorar ZenWork",
        organizationId: org.id,
      },
    });

    // Crear tipos de issue por defecto
    await tx.issueType.createMany({
      data: [
        { projectId: project.id, name: "Bug", icon: "bug", color: "#ef4444", isDefault: true },
        { projectId: project.id, name: "Tarea", icon: "check-square", color: "#3b82f6" },
        { projectId: project.id, name: "Historia", icon: "book-open", color: "#10b981" },
        { projectId: project.id, name: "Épica", icon: "layers", color: "#8b5cf6" },
      ],
    });

    // Crear estados por defecto
    await tx.issueStatus.createMany({
      data: [
        { projectId: project.id, name: "Por hacer", color: "#6b7280", category: "TODO", isDefault: true },
        { projectId: project.id, name: "En progreso", color: "#f59e0b", category: "IN_PROGRESS" },
        { projectId: project.id, name: "Completado", color: "#10b981", category: "DONE" },
      ],
    });

    // Crear tablero por defecto
    const board = await tx.board.create({
      data: {
        name: "Tablero principal",
        organizationId: org.id,
        projectId: project.id,
      },
    });

    // Crear columnas del tablero
    await tx.boardColumn.createMany({
      data: [
        { boardId: board.id, name: "Por hacer", color: "#6b7280", position: 1 },
        { boardId: board.id, name: "En progreso", color: "#f59e0b", position: 2 },
        { boardId: board.id, name: "Hecho", color: "#10b981", position: 3 },
      ],
    });

    // Crear documento de bienvenida
    await tx.document.create({
      data: {
        title: "Bienvenido a ZenWork",
        slug: "bienvenido",
        content: serializeJSON({
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 1 },
              content: [{ type: "text", text: "¡Bienvenido a ZenWork! 🎉" }],
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "ZenWork es tu plataforma de colaboración y productividad. Aquí puedes gestionar proyectos, tableros Kanban y documentos colaborativos.",
                },
              ],
            },
          ],
        }),
        organizationId: org.id,
        projectId: project.id,
      },
    });

    return { organization: org, project, board };
}

export async function getOrganizations(userId: string) {
  const orgs = await prisma.organization.findMany({
    where: {
      memberships: {
        some: { userId, isActive: true },
      },
      deletedAt: null,
    },
    include: {
      memberships: {
        where: { userId },
        select: { role: true },
      },
      _count: {
        select: { projects: true, memberships: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orgs;
}

export async function getOrganizationBySlug(slug: string, userId: string) {
  return prisma.organization.findFirst({
    where: {
      slug,
      memberships: {
        some: { userId, isActive: true },
      },
      deletedAt: null,
    },
    include: {
      memberships: {
        where: { userId },
        select: { role: true },
      },
      projects: {
        where: { deletedAt: null },
        select: { id: true, name: true, key: true },
      },
      _count: {
        select: { projects: true, memberships: true },
      },
    },
  });
}

// Contexto ligero para el layout compartido de organización
export async function getOrgContext(slug: string, userId: string) {
  const org = await prisma.organization.findFirst({
    where: {
      slug,
      memberships: {
        some: { userId, isActive: true },
      },
      deletedAt: null,
    },
    include: {
      memberships: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!org) return null;

  const organizations = await getOrganizations(userId);

  return {
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      role: org.memberships[0]?.role || "MEMBER",
    },
    organizations: organizations.map((o) => ({
      slug: o.slug,
      name: o.name,
    })),
  };
}

// ============================================================
// PROJECT SERVICE
// ============================================================

export async function createProject(
  organizationId: string,
  data: { name: string; key: string; description?: string }
) {
  return transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: data.name,
        key: data.key.toUpperCase(),
        description: data.description,
        organizationId,
      },
    });

    // Crear tipos y estados por defecto
    await tx.issueType.createMany({
      data: [
        { projectId: project.id, name: "Bug", icon: "bug", color: "#ef4444", isDefault: true },
        { projectId: project.id, name: "Tarea", icon: "check-square", color: "#3b82f6" },
        { projectId: project.id, name: "Historia", icon: "book-open", color: "#10b981" },
        { projectId: project.id, name: "Épica", icon: "layers", color: "#8b5cf6" },
      ],
    });

    await tx.issueStatus.createMany({
      data: [
        { projectId: project.id, name: "Por hacer", color: "#6b7280", category: "TODO", isDefault: true },
        { projectId: project.id, name: "En progreso", color: "#f59e0b", category: "IN_PROGRESS" },
        { projectId: project.id, name: "Completado", color: "#10b981", category: "DONE" },
      ],
    });

    return project;
  });
}

export async function getProjects(organizationId: string) {
  return prisma.project.findMany({
    where: {
      organizationId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: { issues: true, boards: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Proyecto con tipos de issue, estados y miembros asignables
export async function getProjectDetail(projectId: string, organizationId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, organizationId, deletedAt: null },
    include: {
      issueTypes: { orderBy: { sortOrder: "asc" } },
      issueStatuses: { orderBy: { sortOrder: "asc" } },
      labels: true,
      _count: { select: { issues: true, boards: true, documents: true } },
    },
  });
}

export async function getMembers(organizationId: string) {
  const members = await prisma.membership.findMany({
    where: { organizationId, isActive: true },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    avatar: m.user.avatar,
    role: m.role,
  }));
}

export async function getBoards(organizationId: string, projectId?: string) {
  const boards = await prisma.board.findMany({
    where: {
      organizationId,
      projectId: projectId ?? undefined,
      deletedAt: null,
    },
    include: {
      columns: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          name: true,
          _count: { select: { cards: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return boards;
}

// ============================================================
// ISSUE SERVICE
// ============================================================

export async function createIssue(
  projectId: string,
  creatorId: string,
  data: {
    title: string;
    description?: string;
    typeId: string;
    statusId: string;
    priority?: string;
    assigneeId?: string;
    storyPoints?: number;
    dueDate?: Date;
    metadata?: Record<string, unknown>;
    parentIssueId?: string;
  }
) {
  return transaction(async (tx) => {
    // Obtener siguiente número secuencial
    const lastIssue = await tx.issue.findFirst({
      where: { projectId },
      orderBy: { number: "desc" },
      select: { number: true },
    });

    const issue = await tx.issue.create({
      data: {
        projectId,
        number: (lastIssue?.number || 0) + 1,
        title: data.title,
        description: data.description,
        typeId: data.typeId,
        statusId: data.statusId,
        priority: data.priority || "MEDIUM",
        assigneeId: data.assigneeId,
        creatorId,
        storyPoints: data.storyPoints,
        dueDate: data.dueDate,
        metadata: serializeJSON(data.metadata || {}),
        parentId: data.parentIssueId,
      },
      include: {
        type: true,
        status: true,
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return { ...issue, metadata: parseJSON(issue.metadata) };
  });
}

export async function getIssues(
  projectId: string,
  filters?: {
    statusId?: string;
    assigneeId?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    projectId,
    deletedAt: null,
  };

  if (filters?.statusId) where.statusId = filters.statusId;
  if (filters?.assigneeId) where.assigneeId = filters.assigneeId;
  if (filters?.priority) where.priority = filters.priority;
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search } },
      { description: { contains: filters.search } },
    ];
  }

  const [rawIssues, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      include: {
        type: true,
        status: true,
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        labels: {
          include: { label: true },
        },
      },
      orderBy: [{ number: "desc" }],
      skip,
      take: limit,
    }),
    prisma.issue.count({ where }),
  ]);

  const issues = rawIssues.map((issue) => ({
    ...issue,
    metadata: parseJSON(issue.metadata),
  }));

  return {
    issues,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function updateIssue(
  issueId: string,
  data: {
    title?: string;
    description?: string;
    statusId?: string;
    priority?: string;
    assigneeId?: string | null;
    storyPoints?: number | null;
    dueDate?: Date | null;
    metadata?: Record<string, unknown>;
  }
) {
  const updateData: Record<string, unknown> = { ...data };
  if (updateData.metadata) {
    updateData.metadata = serializeJSON(data.metadata);
  }

  const issue = await prisma.issue.update({
    where: { id: issueId },
    data: updateData,
    include: {
      type: true,
      status: true,
      assignee: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  return { ...issue, metadata: parseJSON(issue.metadata) };
}

// ============================================================
// BOARD SERVICE
// ============================================================

export async function createBoard(
  organizationId: string,
  data: { name: string; description?: string; projectId?: string }
) {
  return transaction(async (tx) => {
    const board = await tx.board.create({
      data: {
        name: data.name,
        description: data.description,
        organizationId,
        projectId: data.projectId,
      },
    });

    // Crear columnas por defecto
    await tx.boardColumn.createMany({
      data: [
        { boardId: board.id, name: "Por hacer", color: "#6b7280", position: 1 },
        { boardId: board.id, name: "En progreso", color: "#f59e0b", position: 2 },
        { boardId: board.id, name: "Hecho", color: "#10b981", position: 3 },
      ],
    });

    return board;
  });
}

export async function getBoard(boardId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { position: "asc" },
        include: {
          cards: {
            where: { deletedAt: null },
            orderBy: { position: "asc" },
            include: {
              assignee: {
                select: { id: true, name: true, avatar: true },
              },
              labels: true,
              checklists: {
                include: { items: true },
              },
            },
          },
        },
      },
    },
  });

  if (!board) return null;

  return {
    ...board,
    settings: parseJSON(board.settings),
    columns: board.columns.map((col) => ({
      ...col,
      cards: col.cards.map((card) => ({
        ...card,
        metadata: parseJSON(card.metadata),
      })),
    })),
  };
}

// Posición fraccional: si el llamador no especifica una posición exacta
// (p. ej. para insertar entre dos tarjetas), se agrega al final de la
// columna destino sumando un hueco (1000) a la posición máxima existente.
// A diferencia de la implementación anterior, esto NUNCA reindexa las
// tarjetas hermanas: cada movimiento es una sola escritura.
export async function moveCard(
  cardId: string,
  targetColumnId: string,
  position?: number
) {
  return transaction(async (tx) => {
    let finalPosition = position;

    if (finalPosition === undefined) {
      const last = await tx.boardCard.findFirst({
        where: { columnId: targetColumnId, id: { not: cardId }, deletedAt: null },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      finalPosition = (last?.position ?? 0) + 1000;
    }

    return tx.boardCard.update({
      where: { id: cardId },
      data: {
        columnId: targetColumnId,
        position: finalPosition,
      },
    });
  });
}

// ============================================================
// CARD SERVICE (CRUD + Checklists)
// ============================================================

export async function createCard(
  columnId: string,
  data: {
    title: string;
    description?: string;
    issueId?: string;
    assigneeId?: string;
    dueDate?: Date;
  }
) {
  return transaction(async (tx) => {
    // Siguiente posición dentro de la columna
    const lastCard = await tx.boardCard.findFirst({
      where: { columnId, deletedAt: null },
      orderBy: { position: "desc" },
    });

    const card = await tx.boardCard.create({
      data: {
        columnId,
        title: data.title,
        description: data.description,
        issueId: data.issueId,
        assigneeId: data.assigneeId,
        dueDate: data.dueDate,
        position: (lastCard?.position || 0) + 1000,
      },
      include: {
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        checklists: { include: { items: true } },
        labels: true,
      },
    });

    return { ...card, metadata: parseJSON(card.metadata) };
  });
}

export async function updateCard(
  cardId: string,
  data: {
    title?: string;
    description?: string | null;
    assigneeId?: string | null;
    dueDate?: Date | null;
    columnId?: string;
  }
) {
  const card = await prisma.boardCard.update({
    where: { id: cardId },
    data,
    include: {
      assignee: {
        select: { id: true, name: true, avatar: true },
      },
      checklists: { include: { items: true } },
      labels: true,
    },
  });

  return { ...card, metadata: parseJSON(card.metadata) };
}

export async function softDeleteCard(cardId: string) {
  await prisma.boardCard.update({
    where: { id: cardId },
    data: { deletedAt: new Date() },
  });
  return { success: true };
}

export async function createChecklist(cardId: string, title: string) {
  return prisma.cardChecklist.create({
    data: { cardId, title },
    include: { items: true },
  });
}

export async function addChecklistItem(checklistId: string, text: string) {
  return transaction(async (tx) => {
    const lastItem = await tx.cardChecklistItem.findFirst({
      where: { checklistId },
      orderBy: { position: "desc" },
    });

    return tx.cardChecklistItem.create({
      data: {
        checklistId,
        text,
        position: (lastItem?.position || 0) + 1,
      },
    });
  });
}

export async function toggleChecklistItem(itemId: string, isChecked: boolean) {
  return prisma.cardChecklistItem.update({
    where: { id: itemId },
    data: { isChecked },
  });
}

export async function getCard(cardId: string) {
  const card = await prisma.boardCard.findFirst({
    where: { id: cardId, deletedAt: null },
    include: {
      column: { select: { id: true, name: true, boardId: true } },
      assignee: {
        select: { id: true, name: true, avatar: true },
      },
      checklists: {
        include: { items: { orderBy: { position: "asc" } } },
      },
      labels: true,
    },
  });

  if (!card) return null;
  return { ...card, metadata: parseJSON(card.metadata) };
}

// ============================================================
// CHAT SERVICE
// ============================================================

export async function createMessage(
  organizationId: string,
  authorId: string,
  content: string,
  parentId?: string,
  projectId?: string
) {
  return prisma.message.create({
    data: {
      organizationId,
      projectId,
      authorId,
      content,
      parentId,
    },
    include: {
      author: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });
}

export async function getMessages(organizationId: string, limit = 100, projectId?: string) {
  const messages = await prisma.message.findMany({
    where: { organizationId, projectId: projectId || null, deletedAt: null },
    include: {
      author: {
        select: { id: true, name: true, avatar: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return messages.reverse();
}

// ============================================================
// DOCUMENT SERVICE
// ============================================================

export async function createDocument(
  organizationId: string,
  data: {
    title: string;
    slug: string;
    projectId?: string;
    parentId?: string;
    icon?: string;
  }
) {
  const doc = await prisma.document.create({
    data: {
      title: data.title,
      slug: data.slug,
      organizationId,
      projectId: data.projectId,
      parentId: data.parentId,
      icon: data.icon,
      content: serializeJSON({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: data.title }],
          },
        ],
      }),
    },
  });

  return { ...doc, content: parseJSON(doc.content) };
}

export async function getDocuments(organizationId: string, projectId?: string) {
  const docs = await prisma.document.findMany({
    where: {
      organizationId,
      projectId: projectId || undefined,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  return docs.map((doc) => ({
    ...doc,
    content: parseJSON(doc.content),
  }));
}

export async function getDocument(documentId: string) {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, deletedAt: null },
    include: {
      children: {
        select: { id: true, title: true, slug: true, icon: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!doc) return null;
  return { ...doc, content: parseJSON(doc.content) };
}

export async function updateDocument(
  documentId: string,
  data: {
    title?: string;
    content?: Record<string, unknown>;
    isPublished?: boolean;
  }
) {
  const updateData: Record<string, unknown> = { ...data };
  if (updateData.content) {
    updateData.content = serializeJSON(data.content);
  }

  const doc = await prisma.document.update({
    where: { id: documentId },
    data: updateData,
  });

  return { ...doc, content: parseJSON(doc.content) };
}

// ============================================================
// COMMENT SERVICE
// ============================================================

export async function createComment(
  issueId: string,
  authorId: string,
  content: string
) {
  return prisma.issueComment.create({
    data: {
      issueId,
      authorId,
      content,
    },
    include: {
      author: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });
}

export async function getComments(issueId: string) {
  return prisma.issueComment.findMany({
    where: { issueId },
    include: {
      author: {
        select: { id: true, name: true, avatar: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

// ============================================================
// INVITATION SERVICE
// ============================================================

export async function inviteMember(
  organizationId: string,
  invitedById: string,
  email: string,
  role: OrgRole = "MEMBER"
) {
  // Verificar que no exista una invitación pendiente
  const existing = await prisma.invitation.findFirst({
    where: {
      email,
      organizationId,
      status: "PENDING",
    },
  });

  if (existing) {
    throw new Error("Ya existe una invitación pendiente para este email");
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  return prisma.invitation.create({
    data: {
      email,
      organizationId,
      role,
      invitedById,
      token,
      expiresAt,
    },
  });
}

export async function acceptInvitation(
  invitationId: string,
  userId: string,
  email: string
) {
  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      status: "PENDING",
      email: email.toLowerCase(),
      acceptedAt: null,
    },
  });

  if (!invitation) {
    throw new Error("Invitación no encontrada o ya utilizada");
  }

  if (invitation.expiresAt < new Date()) {
    throw new Error("La invitación ha expirado");
  }

  const existing = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId: invitation.organizationId,
      },
    },
  });

  if (existing) {
    throw new Error("Ya sos miembro de esta organización");
  }

  return prisma.$transaction(async (tx) => {
    await tx.invitation.update({
      where: { id: invitationId },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    return tx.membership.create({
      data: {
        userId,
        organizationId: invitation.organizationId,
        role: invitation.role,
      },
    });
  });
}

// ============================================================
// MEMBERSHIP MANAGEMENT
// ============================================================

export async function getInvitations(organizationId: string) {
  return prisma.invitation.findMany({
    where: { organizationId, status: "PENDING" },
    include: {
      invitedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Invitaciones pendientes de un usuario a través de TODAS las organizaciones,
// independientemente de si ya es miembro de alguna. No requiere pertenencia
// previa: es lo único que permite a un usuario recién invitado descubrir su
// invitación (no puede acceder a las páginas de una organización a la que
// todavía no pertenece).
export async function getPendingInvitationsForEmail(email: string) {
  return prisma.invitation.findMany({
    where: {
      email: email.toLowerCase(),
      status: "PENDING",
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      invitedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function changeMemberRole(
  organizationId: string,
  targetUserId: string,
  role: OrgRole
) {
  return prisma.membership.update({
    where: { userId_organizationId: { userId: targetUserId, organizationId } },
    data: { role },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
    },
  });
}

export async function removeMember(organizationId: string, targetUserId: string) {
  return prisma.membership.delete({
    where: { userId_organizationId: { userId: targetUserId, organizationId } },
  });
}

export async function revokeInvitation(invitationId: string) {
  return prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "REVOKED" },
  });
}

// ============================================================
// NOTIFICATION SERVICE
// ============================================================

export async function createNotification(
  organizationId: string,
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: Record<string, unknown>
) {
  return prisma.notification.create({
    data: {
      organizationId,
      userId,
      type,
      title,
      message,
      data: serializeJSON(data || {}),
    },
  });
}

export async function getUnreadNotificationCount(
  organizationId: string,
  userId: string
) {
  return prisma.notification.count({
    where: { organizationId, userId, readAt: null },
  });
}
