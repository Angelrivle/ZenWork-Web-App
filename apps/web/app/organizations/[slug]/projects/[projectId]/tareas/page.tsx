import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");
}

const PRIORITY_STYLES: Record<string, string> = {
  HIGH: "var(--error)",
  MEDIUM: "var(--warning)",
  LOW: "var(--success)",
};

export default async function ProjectTareasPage({
  params,
}: {
  params: Promise<{ slug: string; projectId: string }>;
}) {
  const { slug, projectId } = await params;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAMES.SESSION)?.value;
  if (!sessionToken) redirect("/login");

  let userId: string;
  try {
    const payload = await verifyAccessToken(sessionToken);
    userId = payload.sub;
  } catch {
    redirect("/login");
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      deletedAt: null,
      organization: {
        slug,
        memberships: { some: { userId, isActive: true } },
      },
    },
    select: { id: true, name: true, key: true, organizationId: true },
  });

  if (!project) redirect("/login");

  const [statuses, issues] = await Promise.all([
    prisma.issueStatus.findMany({
      where: { projectId: project.id },
      select: { id: true, name: true, color: true, category: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.issue.findMany({
      where: { projectId: project.id, deletedAt: null },
      select: {
        id: true,
        number: true,
        title: true,
        priority: true,
        dueDate: true,
        statusId: true,
        assignee: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const projectBase = `/organizations/${slug}/projects/${project.id}`;

  function dueLabel(dueDate: Date | null) {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
    return {
      text: due.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }),
      over: diff < 0,
      soon: diff >= 0 && diff <= 2,
    };
  }

  return (
    <>
      <div className="crumb">
        <Link href={projectBase}>{project.name}</Link>
        <span>/</span>
        <span>Vista Kanban</span>
      </div>
      <header className="dash-header" style={{ marginBottom: 20 }}>
        <h1>Vista Kanban de Issues</h1>
        <p>
          Los mismos issues de {project.name}, agrupados por estado (solo lectura). Para
          mover tarjetas con drag &amp; drop usá <Link href={`${projectBase}/boards`}>Tablero</Link>,
          el Kanban estilo Trello independiente de los issues.
        </p>
      </header>

      {issues.length === 0 ? (
        <div className="empty-state">
          No hay tareas todavía. Creá un issue desde la sección Issues.
        </div>
      ) : (
        <div className="kanban-board">
          {statuses.map((status) => {
            const inStatus = issues.filter((i) => i.statusId === status.id);
            return (
              <section className="kanban-col" key={status.id}>
                <header
                  className="kanban-col-header"
                  style={{ borderTopColor: status.color }}
                >
                  <span className="kanban-dot" style={{ background: status.color }} />
                  <strong>{status.name}</strong>
                  <span className="kanban-count">{inStatus.length}</span>
                </header>

                <div className="kanban-col-body">
                  {inStatus.length === 0 ? (
                    <div className="kanban-empty">Sin tareas</div>
                  ) : (
                    inStatus.map((issue) => {
                      const due = dueLabel(issue.dueDate);
                      return (
                        <Link
                          className="kanban-card"
                          href={`${projectBase}/issues/${issue.id}`}
                          key={issue.id}
                        >
                          <span className="kanban-card-key">
                            {project.key}-{issue.number}
                          </span>
                          <span className="kanban-card-title">{issue.title}</span>
                          <span className="kanban-card-meta">
                            <span
                              className="kanban-priority"
                              style={{
                                background: PRIORITY_STYLES[issue.priority] || "var(--text-3)",
                              }}
                              title={`Prioridad ${issue.priority}`}
                            />
                            {due && (
                              <span className={`kanban-due${due.over ? " over" : due.soon ? " soon" : ""}`}>
                                {due.text}
                              </span>
                            )}
                            <span className="kanban-assignee" title={issue.assignee?.name}>
                              {issue.assignee?.avatar ? (
                                <img src={issue.assignee.avatar} alt="" />
                              ) : (
                                initials(issue.assignee?.name || "—")
                              )}
                            </span>
                          </span>
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}