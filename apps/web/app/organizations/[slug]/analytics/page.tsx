import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
  BLOCKER: "Bloqueante",
};

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="chart-row">
      <div className="chart-label">{label}</div>
      <div className="chart-bar">
        <div className="chart-fill" style={{ width: `${Math.max(pct, value > 0 ? 3 : 0)}%`, background: color || "var(--brand)" }} />
      </div>
      <div className="chart-value">{value}</div>
    </div>
  );
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

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

  const org = await prisma.organization.findFirst({
    where: {
      slug,
      memberships: { some: { userId, isActive: true } },
      deletedAt: null,
    },
    select: { id: true, name: true },
  });

  if (!org) redirect("/login");

  const [
    members,
    projects,
    boards,
    documents,
    messages,
    issuesSel,
    cardsSel,
  ] = await Promise.all([
    prisma.membership.count({ where: { organizationId: org.id, isActive: true } }),
    prisma.project.count({ where: { organizationId: org.id, deletedAt: null } }),
    prisma.board.count({ where: { organizationId: org.id, deletedAt: null } }),
    prisma.document.count({ where: { organizationId: org.id, deletedAt: null } }),
    prisma.message.count({ where: { organizationId: org.id, deletedAt: null } }),
    prisma.issue.findMany({
      where: { project: { organizationId: org.id }, deletedAt: null },
      select: { statusId: true, priority: true },
    }),
    prisma.boardCard.findMany({
      where: { column: { board: { organizationId: org.id } }, deletedAt: null },
      select: { columnId: true },
    }),
  ]);

  const statuses = await prisma.issueStatus.findMany({
    where: { project: { organizationId: org.id } },
    select: { id: true, name: true, color: true },
  });
  const statusName = new Map(statuses.map((s) => [s.id, s]));
  const statusColor = new Map(statuses.map((s) => [s.id, s.color]));

  const columns = await prisma.boardColumn.findMany({
    where: { board: { organizationId: org.id } },
    select: { id: true, name: true, board: { select: { name: true } } },
  });

  const byStatus = new Map<string, number>();
  const byPriority = new Map<string, number>();
  for (const row of issuesSel) {
    byStatus.set(row.statusId, (byStatus.get(row.statusId) || 0) + 1);
    byPriority.set(row.priority, (byPriority.get(row.priority) || 0) + 1);
  }

  const totalIssues = issuesSel.length;
  const byColumn = new Map<string, number>();
  for (const row of cardsSel) byColumn.set(row.columnId, (byColumn.get(row.columnId) || 0) + 1);
  const totalCards = cardsSel.length;

  const statusMax = Math.max(1, ...Array.from(byStatus.values()));
  const priorityMax = Math.max(1, ...Array.from(byPriority.values()));
  const columnMax = Math.max(1, ...Array.from(byColumn.values()));

  const recentActivity = await prisma.auditLog.findMany({
    where: { organizationId: org.id },
    take: 20,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true } } },
  });

  const now = new Date();
  const overdue = await prisma.issue.count({
    where: {
      project: { organizationId: org.id },
      deletedAt: null,
      dueDate: { lt: now },
      status: { category: { not: "DONE" } },
    },
  });

  return (
    <>
      <div className="crumb">
        <Link href={`/organizations/${slug}`}>{org.name}</Link>
        <span>/</span>
        <span>Analíticas</span>
      </div>
      <header className="dash-header" style={{ marginBottom: 20 }}>
        <h1>Analíticas de {org.name}</h1>
        <p>Un vistazo al rendimiento de tu organización.</p>
      </header>

      <div className="dash-grid">
        <div className="dash-card"><strong>{projects}</strong><span>Proyectos</span></div>
        <div className="dash-card"><strong>{totalIssues}</strong><span>Issues</span></div>
        <div className="dash-card"><strong>{members}</strong><span>Miembros</span></div>
        <div className="dash-card"><strong>{boards}</strong><span>Tableros</span></div>
        <div className="dash-card"><strong>{documents}</strong><span>Documentos</span></div>
        <div className="dash-card"><strong>{messages}</strong><span>Mensajes</span></div>
      </div>

      <div className="analytics-grid">
        <div className="panel">
          <h3 className="panel-title">Issues por estado</h3>
          {byStatus.size === 0 ? (
            <div className="dash-empty">Sin issues todavía.</div>
          ) : (
            Array.from(byStatus.entries()).map(([id, count]) => (
              <Bar key={id} label={statusName.get(id)?.name || "?"} value={count} max={statusMax} color={statusColor.get(id)} />
            ))
          )}
        </div>

        <div className="panel">
          <h3 className="panel-title">Issues por prioridad</h3>
          {byPriority.size === 0 ? (
            <div className="dash-empty">Sin issues todavía.</div>
          ) : (
            Array.from(byPriority.entries())
              .sort(([a], [b]) => {
                const order = ["BLOCKER", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
                return order.indexOf(a) - order.indexOf(b);
              })
              .map(([p, count]) => <Bar key={p} label={PRIORITY_LABEL[p] || p} value={count} max={priorityMax} />)
          )}
        </div>

        <div className="panel">
          <h3 className="panel-title">Tarjetas por columna</h3>
          {totalCards === 0 ? (
            <div className="dash-empty">Sin tarjetas todavía.</div>
          ) : (
            columns.map((c) => (
              <Bar key={c.id} label={`${c.board.name} · ${c.name}`} value={byColumn.get(c.id) || 0} max={columnMax} />
            ))
          )}
        </div>

        <div className="panel">
          <h3 className="panel-title">Resumen</h3>
          <ul className="analytics-list">
            <li>
              <span>Issues totales</span>
              <strong>{totalIssues}</strong>
            </li>
            <li>
              <span>Tarjetas totales</span>
              <strong>{totalCards}</strong>
            </li>
            <li>
              <span>Issues vencidos</span>
              <strong className={overdue > 0 ? "text-error" : ""}>{overdue}</strong>
            </li>
            <li>
              <span>Miembros en la organización</span>
              <strong>{members}</strong>
            </li>
          </ul>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3 className="panel-title">Actividad reciente</h3>
        {recentActivity.length === 0 ? (
          <div className="dash-empty">Todavía no hay actividad registrada.</div>
        ) : (
          <div className="activity-list">
            {recentActivity.map((a) => (
              <div className="activity-row" key={a.id}>
                <span className="activity-user">{a.user?.name || "Alguien"}</span>
                <span className="activity-action">{a.action}</span>
                <time className="activity-time">
                  {a.createdAt.toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}