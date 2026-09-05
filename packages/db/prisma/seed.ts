import { PrismaClient } from "./../generated/client";
import { hash } from "argon2";

const prisma = new PrismaClient();

function serializeJSON(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value || {});
}

async function main() {
  console.log("🌱 Seeding database...");

  // Crear usuario admin de demo
  const adminPassword = await hash("Admin123!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@zenwork.com" },
    update: {},
    create: {
      email: "admin@zenwork.com",
      name: "Admin ZenWork",
      passwordHash: adminPassword,
      emailVerified: new Date(),
    },
  });

  console.log("✅ Admin user created:", admin.email);

  // Crear organización demo
  const org = await prisma.organization.upsert({
    where: { slug: "zenwork-demo" },
    update: {},
    create: {
      name: "ZenWork Demo",
      slug: "zenwork-demo",
      description: "Organización de demostración de ZenWork",
      ownerId: admin.id,
    },
  });

  console.log("✅ Organization created:", org.name);

  // Crear membresía
  const existingMembership = await prisma.membership.findFirst({
    where: {
      userId: admin.id,
      organizationId: org.id,
    },
  });

  if (!existingMembership) {
    await prisma.membership.create({
      data: {
        userId: admin.id,
        organizationId: org.id,
        role: "OWNER",
      },
    });
  }

  // Crear proyecto demo
  const existingProject = await prisma.project.findFirst({
    where: {
      organizationId: org.id,
      key: "ZEN",
    },
  });

  let project = existingProject;
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: "ZenWork Platform",
        key: "ZEN",
        description: "Desarrollo de la plataforma ZenWork",
        organizationId: org.id,
      },
    });
  }

  console.log("✅ Project created:", project.name);

  // Obtener types existentes
  const existingTypes = await prisma.issueType.findMany({
    where: { projectId: project.id },
  });

  const typeNames = existingTypes.map((t) => t.name);
  const neededTypes = [
    { name: "Bug", icon: "bug", color: "#ef4444", isDefault: true },
    { name: "Tarea", icon: "check-square", color: "#3b82f6", isDefault: false },
    { name: "Historia", icon: "book-open", color: "#10b981", isDefault: false },
    { name: "Épica", icon: "layers", color: "#8b5cf6", isDefault: false },
  ];

  for (const t of neededTypes) {
    if (!typeNames.includes(t.name)) {
      await prisma.issueType.create({
        data: { ...t, projectId: project.id },
      });
    }
  }

  // Obtener type IDs
  const issueTypes = await prisma.issueType.findMany({
    where: { projectId: project.id },
  });

  // Estados
  const existingStatuses = await prisma.issueStatus.findMany({
    where: { projectId: project.id },
  });

  const statusNames = existingStatuses.map((s) => s.name);
  const neededStatuses = [
    { name: "Por hacer", color: "#6b7280", category: "TODO", isDefault: true },
    { name: "En progreso", color: "#f59e0b", category: "IN_PROGRESS", isDefault: false },
    { name: "En revisión", color: "#8b5cf6", category: "IN_PROGRESS", isDefault: false },
    { name: "Completado", color: "#10b981", category: "DONE", isDefault: false },
  ];

  for (const s of neededStatuses) {
    if (!statusNames.includes(s.name)) {
      await prisma.issueStatus.create({
        data: { ...s, projectId: project.id },
      });
    }
  }

  const statuses = await prisma.issueStatus.findMany({
    where: { projectId: project.id },
  });

  // Etiquetas (si no existen)
  const existingLabels = await prisma.label.findMany({
    where: { projectId: project.id },
  });

  const labelNames = existingLabels.map((l) => l.name);
  const neededLabels = [
    { name: "Frontend", color: "#3b82f6" },
    { name: "Backend", color: "#10b981" },
    { name: "Urgente", color: "#ef4444" },
    { name: "Documentación", color: "#f59e0b" },
  ];

  const labels: any[] = [];
  for (const l of neededLabels) {
    if (!labelNames.includes(l.name)) {
      labels.push(await prisma.label.create({
        data: { ...l, projectId: project.id },
      }));
    } else {
      labels.push(existingLabels.find((e) => e.name === l.name));
    }
  }

  // Issues demo (solo si no hay issues)
  const existingIssues = await prisma.issue.count({
    where: { projectId: project.id },
  });

  if (existingIssues === 0) {
    const bugType = issueTypes.find((t) => t.name === "Bug")!;
    const taskType = issueTypes.find((t) => t.name === "Tarea")!;
    const storyType = issueTypes.find((t) => t.name === "Historia")!;
    const todoStatus = statuses.find((s) => s.name === "Por hacer")!;
    const inProgressStatus = statuses.find((s) => s.name === "En progreso")!;
    const reviewStatus = statuses.find((s) => s.name === "En revisión")!;
    const doneStatus = statuses.find((s) => s.name === "Completado")!;

    await prisma.issue.createMany({
      data: [
        {
          projectId: project.id,
          number: 1,
          title: "Implementar autenticación con JWT",
          description: "Implementar el sistema de autenticación completo con JWT, refresh tokens y 2FA",
          typeId: storyType.id,
          statusId: doneStatus.id,
          priority: "HIGH",
          assigneeId: admin.id,
          creatorId: admin.id,
          storyPoints: 8,
        },
        {
          projectId: project.id,
          number: 2,
          title: "Bug: El formulario de login no valida email",
          description: "El formulario de login permite enviar emails inválidos",
          typeId: bugType.id,
          statusId: inProgressStatus.id,
          priority: "HIGH",
          assigneeId: admin.id,
          creatorId: admin.id,
        },
        {
          projectId: project.id,
          number: 3,
          title: "Crear tablero Kanban con drag & drop",
          description: "Implementar tablero Kanban con soporte de drag & drop y posiciones fraccionales",
          typeId: storyType.id,
          statusId: todoStatus.id,
          priority: "MEDIUM",
          creatorId: admin.id,
          storyPoints: 5,
        },
        {
          projectId: project.id,
          number: 4,
          title: "Documentar API de webhooks",
          description: "Crear documentación completa de la API de webhooks salientes y entrantes",
          typeId: taskType.id,
          statusId: todoStatus.id,
          priority: "LOW",
          creatorId: admin.id,
          storyPoints: 3,
        },
        {
          projectId: project.id,
          number: 5,
          title: "Configurar notificaciones por Discord",
          description: "Implementar envío de notificaciones a través de Discord webhooks",
          typeId: taskType.id,
          statusId: reviewStatus.id,
          priority: "MEDIUM",
          assigneeId: admin.id,
          creatorId: admin.id,
          storyPoints: 4,
        },
      ],
    });

    console.log("✅ Issues created");
  }

  // Tablero
  const existingBoard = await prisma.board.findFirst({
    where: { projectId: project.id },
  });

  let board = existingBoard;
  if (!board) {
    board = await prisma.board.create({
      data: {
        name: "Sprint Board",
        description: "Tablero principal del sprint actual",
        organizationId: org.id,
        projectId: project.id,
      },
    });
  }

  // Columnas (si no existen)
  const existingColumns = await prisma.boardColumn.count({
    where: { boardId: board.id },
  });

  if (existingColumns === 0) {
    await prisma.boardColumn.createMany({
      data: [
        { boardId: board.id, name: "Por hacer", color: "#6b7280", position: 1000 },
        { boardId: board.id, name: "En progreso", color: "#f59e0b", position: 2000 },
        { boardId: board.id, name: "En revisión", color: "#8b5cf6", position: 3000 },
        { boardId: board.id, name: "Hecho", color: "#10b981", position: 4000 },
      ],
    });
    console.log("✅ Board and columns created");
  }

  // Documento de bienvenida
  const existingDoc = await prisma.document.findFirst({
    where: {
      organizationId: org.id,
      slug: "bienvenido",
    },
  });

  if (!existingDoc) {
    await prisma.document.create({
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
              content: [{ type: "text", text: "ZenWork es tu plataforma de colaboración y productividad empresarial." }],
            },
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Funcionalidades principales" }],
            },
            {
              type: "bulletList",
              content: [
                { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Gestión de proyectos y issues (estilo Jira)" }] }] },
                { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Tableros Kanban con drag & drop (estilo Trello)" }] }] },
                { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Documentos colaborativos (estilo Notion)" }] }] },
                { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Notificaciones multi-canal (Email, Discord)" }] }] },
              ],
            },
          ],
        }),
        organizationId: org.id,
        projectId: project.id,
        isPublished: true,
        icon: "🎉",
      },
    });
    console.log("✅ Welcome document created");
  }

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📧 Login credentials:");
  console.log("   Email: admin@zenwork.com");
  console.log("   Password: Admin123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
