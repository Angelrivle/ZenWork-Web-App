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
    <div className="w-full">
      {/* Sub-header & Context Layer */}
      <section className="border-b border-outline-variant/30 bg-surface-dim px-space-xl py-space-lg">
        <div className="space-y-space-2xs min-w-0">
          <nav className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline uppercase tracking-wider">
            <Link href={`/organizations/${slug}`} className="hover:text-on-surface">
              {slug}
            </Link>
            <span>/</span>
            <Link href={projectBase} className="hover:text-on-surface truncate">
              {project.name}
            </Link>
            <span>/</span>
            <span className="text-primary font-medium">Kanban Flujo de Issues</span>
          </nav>
          <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-space-md">
            <div>
              <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                Flujo de Trabajo del Proyecto
              </h1>
              <p className="font-body-sm text-body-sm text-outline mt-1 max-w-3xl">
                Visualización de las incidencias técnicas de {project.name} organizadas por su estado en el ciclo de vida de desarrollo.
              </p>
            </div>
            <div className="flex items-center gap-space-sm shrink-0">
              <Link
                href={projectBase}
                className="h-9 px-space-md bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-body-sm text-body-sm flex items-center gap-space-xs transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-outline">view_list</span>
                <span>Ver tabla de issues</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {issues.length === 0 ? (
        <div className="p-space-3xl text-center space-y-space-sm bg-surface border-b border-outline-variant/30">
          <div className="w-12 h-12 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center mx-auto text-outline">
            <span className="material-symbols-outlined text-[26px]">view_column</span>
          </div>
          <p className="font-headline-sm text-headline-sm text-on-surface font-medium">No hay incidencias en el flujo</p>
          <p className="font-body-sm text-body-sm text-outline max-w-md mx-auto">
            Crea una incidencia desde la sección de issues para que aparezca distribuida en su columna correspondiente.
          </p>
        </div>
      ) : (
        <div className="p-space-xl overflow-x-auto bg-background min-h-[calc(100vh-14rem)]">
          <div className="flex gap-space-lg items-start min-w-[1000px]">
            {statuses.map((status) => {
              const inStatus = issues.filter((i) => i.statusId === status.id);
              return (
                <div
                  key={status.id}
                  className="w-80 flex-shrink-0 bg-surface-container-low border border-outline-variant/30 flex flex-col shadow-sm"
                >
                  <div className="p-space-md border-b border-outline-variant/20 flex items-center justify-between bg-surface-dim">
                    <div className="flex items-center gap-space-xs">
                      <span className="w-2 h-2" style={{ backgroundColor: status.color }} />
                      <h2 className="font-headline-sm text-headline-sm text-on-surface font-medium">
                        {status.name}
                      </h2>
                      <span className="font-code text-label-sm px-space-xs py-space-2xs bg-surface-variant text-on-surface-variant leading-none ml-space-xs">
                        {inStatus.length}
                      </span>
                    </div>
                  </div>

                  <div className="p-space-sm space-y-space-sm flex flex-col min-h-[120px]">
                    {inStatus.length === 0 ? (
                      <div className="p-space-md text-center text-outline font-body-sm text-label-sm">
                        Sin incidencias
                      </div>
                    ) : (
                      inStatus.map((issue) => {
                        const due = dueLabel(issue.dueDate);
                        return (
                          <Link
                            key={issue.id}
                            href={`${projectBase}/issues/${issue.id}`}
                            className="p-space-md bg-surface hover:bg-surface-container-high border border-outline-variant/40 hover:border-outline-variant/80 transition-all shadow-sm group"
                          >
                            <div className="flex items-center justify-between gap-space-xs mb-space-xs">
                              <span className="font-code text-label-sm text-outline group-hover:text-primary transition-colors">
                                {project.key}-{issue.number}
                              </span>
                              <span
                                className="font-code text-label-sm uppercase px-1.5 py-0.5 border text-[11px]"
                                style={{
                                  color: PRIORITY_STYLES[issue.priority] || "var(--text-3)",
                                  borderColor: "currentColor",
                                }}
                              >
                                {issue.priority}
                              </span>
                            </div>
                            <h3 className="font-body-md text-body-md text-on-surface group-hover:text-primary transition-colors font-medium line-clamp-2 mb-space-sm">
                              {issue.title}
                            </h3>
                            <div className="flex items-center justify-between pt-space-xs border-t border-outline-variant/20 text-outline font-code text-label-sm">
                              {due ? (
                                <span className={`flex items-center gap-1 ${due.over ? "text-error" : ""}`}>
                                  <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                                  <span>{due.text}</span>
                                </span>
                              ) : (
                                <span />
                              )}
                              {issue.assignee && (
                                <div
                                  className="w-6 h-6 bg-surface-variant border border-outline-variant text-on-surface font-code text-label-sm flex items-center justify-center font-bold"
                                  title={issue.assignee.name}
                                >
                                  {initials(issue.assignee.name)}
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}