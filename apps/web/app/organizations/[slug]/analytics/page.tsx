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
    <div className="p-space-xl space-y-space-xl max-w-7xl mx-auto w-full">
      {/* Top Header Breadcrumb & Controls (Stitch) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md border-b border-outline-variant/30 pb-space-lg">
        <div>
          <div className="flex items-center gap-space-xs font-label-sm text-label-sm uppercase tracking-wider text-outline mb-space-2xs">
            <Link href={`/organizations/${slug}`} className="hover:text-on-surface">
              {org.name}
            </Link>
            <span>/</span>
            <span className="text-primary font-medium">Analíticas</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface font-semibold tracking-tight">
            Analíticas de {org.name}
          </h1>
          <p className="font-body-md text-body-md text-outline mt-space-2xs">
            Un vistazo al rendimiento global de tu organización y proyectos en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-space-sm self-start md:self-auto">
          <div className="flex items-center bg-surface-container-low border border-outline-variant/40 px-space-md py-space-xs gap-space-sm font-label-md text-label-md text-on-surface">
            <span className="material-symbols-outlined text-[16px] text-outline">calendar_today</span>
            <span>Histórico Activo</span>
          </div>
        </div>
      </div>

      {/* Key Metrics Bento Grid (Stitch 6 items) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-space-md">
        {/* Metric 1: Proyectos */}
        <div className="bg-surface-container-low border border-outline-variant/30 p-space-md flex flex-col justify-between group hover:border-outline-variant/80 transition-all shadow-sm">
          <div className="flex items-center justify-between text-outline">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Proyectos</span>
            <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">folder</span>
          </div>
          <div className="my-space-md">
            <div className="font-headline-xl text-headline-xl text-on-surface font-bold">{projects}</div>
          </div>
          <div className="font-body-sm text-body-sm text-outline border-t border-outline-variant/20 pt-space-xs">
            Espacios activos
          </div>
        </div>

        {/* Metric 2: Issues */}
        <div className="bg-surface-container-low border border-outline-variant/30 p-space-md flex flex-col justify-between group hover:border-outline-variant/80 transition-all shadow-sm">
          <div className="flex items-center justify-between text-outline">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Issues</span>
            <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">task_alt</span>
          </div>
          <div className="my-space-md">
            <div className="font-headline-xl text-headline-xl text-on-surface font-bold">{totalIssues}</div>
          </div>
          <div className="font-body-sm text-body-sm text-outline border-t border-outline-variant/20 pt-space-xs">
            {overdue} vencidos
          </div>
        </div>

        {/* Metric 3: Miembros */}
        <div className="bg-surface-container-low border border-outline-variant/30 p-space-md flex flex-col justify-between group hover:border-outline-variant/80 transition-all shadow-sm">
          <div className="flex items-center justify-between text-outline">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Miembros</span>
            <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">group</span>
          </div>
          <div className="my-space-md">
            <div className="font-headline-xl text-headline-xl text-on-surface font-bold">{members}</div>
          </div>
          <div className="font-body-sm text-body-sm text-outline border-t border-outline-variant/20 pt-space-xs">
            Equipo asignado
          </div>
        </div>

        {/* Metric 4: Tableros */}
        <div className="bg-surface-container-low border border-outline-variant/30 p-space-md flex flex-col justify-between group hover:border-outline-variant/80 transition-all shadow-sm">
          <div className="flex items-center justify-between text-outline">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Tableros</span>
            <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">view_kanban</span>
          </div>
          <div className="my-space-md">
            <div className="font-headline-xl text-headline-xl text-on-surface font-bold">{boards}</div>
          </div>
          <div className="font-body-sm text-body-sm text-outline border-t border-outline-variant/20 pt-space-xs">
            {totalCards} tarjetas
          </div>
        </div>

        {/* Metric 5: Documentos */}
        <div className="bg-surface-container-low border border-outline-variant/30 p-space-md flex flex-col justify-between group hover:border-outline-variant/80 transition-all shadow-sm">
          <div className="flex items-center justify-between text-outline">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Documentos</span>
            <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">description</span>
          </div>
          <div className="my-space-md">
            <div className="font-headline-xl text-headline-xl text-on-surface font-bold">{documents}</div>
          </div>
          <div className="font-body-sm text-body-sm text-outline border-t border-outline-variant/20 pt-space-xs">
            Base de conocimiento
          </div>
        </div>

        {/* Metric 6: Mensajes */}
        <div className="bg-surface-container-low border border-outline-variant/30 p-space-md flex flex-col justify-between group hover:border-outline-variant/80 transition-all shadow-sm">
          <div className="flex items-center justify-between text-outline">
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Mensajes</span>
            <span className="material-symbols-outlined text-[18px] group-hover:text-primary transition-colors">forum</span>
          </div>
          <div className="my-space-md">
            <div className="font-headline-xl text-headline-xl text-on-surface font-bold">{messages}</div>
          </div>
          <div className="font-body-sm text-body-sm text-outline border-t border-outline-variant/20 pt-space-xs">
            Intercambiados
          </div>
        </div>
      </div>

      {/* Charts & Breakdown Section (Stitch Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Card 1: Issues por Estado */}
        <div className="bg-surface-container-low border border-outline-variant/30 p-space-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/30">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Issues por Estado
              </span>
              <span className="font-code text-label-sm text-primary">{totalIssues} TOTAL</span>
            </div>
            <div className="py-space-md space-y-space-md">
              {byStatus.size === 0 ? (
                <div className="text-outline text-body-sm py-space-sm">Sin issues todavía.</div>
              ) : (
                Array.from(byStatus.entries()).map(([id, count]) => (
                  <Bar
                    key={id}
                    label={statusName.get(id)?.name || "?"}
                    value={count}
                    max={statusMax}
                    color={statusColor.get(id) || undefined}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Issues por Prioridad */}
        <div className="bg-surface-container-low border border-outline-variant/30 p-space-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/30">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Por Prioridad
              </span>
              <span className="font-code text-label-sm text-outline">RANGO</span>
            </div>
            <div className="py-space-md space-y-space-md">
              {byPriority.size === 0 ? (
                <div className="text-outline text-body-sm py-space-sm">Sin issues todavía.</div>
              ) : (
                Array.from(byPriority.entries())
                  .sort(([a], [b]) => {
                    const order = ["BLOCKER", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
                    return order.indexOf(a) - order.indexOf(b);
                  })
                  .map(([p, count]) => (
                    <Bar key={p} label={PRIORITY_LABEL[p] || p} value={count} max={priorityMax} />
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Tarjetas por Columna */}
        <div className="bg-surface-container-low border border-outline-variant/30 p-space-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/30">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Flujo Kanban
              </span>
              <span className="font-code text-label-sm text-primary">{totalCards} CARDS</span>
            </div>
            <div className="py-space-md space-y-space-md">
              {totalCards === 0 ? (
                <div className="text-outline text-body-sm py-space-sm">Sin tarjetas todavía.</div>
              ) : (
                columns.map((c) => (
                  <Bar
                    key={c.id}
                    label={`${c.board.name.slice(0, 10)} · ${c.name}`}
                    value={byColumn.get(c.id) || 0}
                    max={columnMax}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Resumen & Salud */}
        <div className="bg-surface-container-low border border-outline-variant/30 p-space-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/30">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Resumen Ejecutivo
              </span>
              <span className="font-code text-label-sm text-success">OK</span>
            </div>
            <ul className="py-space-md space-y-space-sm font-body-sm text-body-sm divide-y divide-outline-variant/10">
              <li className="flex items-center justify-between pt-space-2xs">
                <span className="text-outline">Issues totales</span>
                <strong className="text-on-surface font-medium">{totalIssues}</strong>
              </li>
              <li className="flex items-center justify-between pt-space-2xs">
                <span className="text-outline">Tarjetas totales</span>
                <strong className="text-on-surface font-medium">{totalCards}</strong>
              </li>
              <li className="flex items-center justify-between pt-space-2xs">
                <span className="text-outline">Issues vencidos</span>
                <strong className={overdue > 0 ? "text-error font-medium" : "text-on-surface font-medium"}>
                  {overdue}
                </strong>
              </li>
              <li className="flex items-center justify-between pt-space-2xs">
                <span className="text-outline">Miembros activos</span>
                <strong className="text-on-surface font-medium">{members}</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Actividad Reciente (Stitch) */}
      <div className="bg-surface-container-low border border-outline-variant/30 p-space-lg shadow-sm">
        <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20 mb-space-md">
          <span className="font-label-md text-label-md uppercase tracking-wider text-outline">
            Actividad Reciente en la Organización
          </span>
          <span className="font-code text-label-sm text-outline">LOGS_EVENT</span>
        </div>
        {recentActivity.length === 0 ? (
          <div className="text-outline text-body-sm py-space-md text-center">
            Todavía no hay actividad registrada.
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/20">
            {recentActivity.map((a) => (
              <div key={a.id} className="py-space-xs flex items-center justify-between gap-space-md text-body-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="material-symbols-outlined text-[16px] text-outline">history</span>
                  <span className="font-medium text-on-surface">{a.user?.name || "Alguien"}</span>
                  <span className="text-outline">{a.action}</span>
                </div>
                <time className="font-code text-label-sm text-outline">
                  {a.createdAt.toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}