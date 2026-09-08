import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";
import { getIssues, getMembers, getProjectDetail } from "@/lib/services";
import { CreateIssueButton } from "@/components/org/create-issue";
import { IssueFilters } from "@/components/org/issue-filters";
import { IssueTableBody } from "@/components/org/issue-table";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; projectId: string }>;
  searchParams: Promise<{ search?: string; statusId?: string; priority?: string; assigneeId?: string }>;
}) {
  const { slug, projectId } = await params;
  const sp = await searchParams;

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
      organization: {
        slug,
        memberships: { some: { userId, isActive: true } },
      },
      deletedAt: null,
    },
    select: { id: true, organizationId: true, name: true, key: true, description: true, status: true, createdAt: true },
  });

  if (!project) redirect("/login");

  const [detail, members, issuesResult] = await Promise.all([
    getProjectDetail(projectId, project.organizationId),
    getMembers(project.organizationId),
    getIssues(projectId, {
      search: sp.search || undefined,
      statusId: sp.statusId || undefined,
      priority: sp.priority || undefined,
      assigneeId: sp.assigneeId || undefined,
    }),
  ]);

  const filters = {
    search: sp.search || "",
    statusId: sp.statusId || "",
    priority: sp.priority || "",
    assigneeId: sp.assigneeId || "",
  };

  const totalIssues = issuesResult.total;
  const inProgressIssues = issuesResult.issues.filter(
    (i) => i.status.category === "IN_PROGRESS" || i.status.name.toLowerCase().includes("progreso")
  ).length;
  const urgentIssues = issuesResult.issues.filter(
    (i) => i.priority === "URGENT" || i.priority === "CRITICAL" || i.priority === "BLOCKER"
  ).length;
  const doneIssues = issuesResult.issues.filter(
    (i) => i.status.category === "DONE" || i.status.name.toLowerCase().includes("hecho")
  ).length;

  return (
    <div className="w-full">
      {/* Sub-header & Action Bar (Stitch) */}
      <section className="border-b border-outline-variant/30 bg-surface-dim px-space-xl py-space-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          {/* Breadcrumb & Project Metadata */}
          <div className="space-y-space-2xs min-w-0">
            <nav className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline">
              <Link href={`/organizations/${slug}`} className="hover:text-on-surface">
                {slug}
              </Link>
              <span>/</span>
              <Link href={`/organizations/${slug}/projects`} className="hover:text-on-surface">
                Proyectos
              </Link>
              <span>/</span>
              <span className="text-outline-variant truncate">{project.name}</span>
              <span>/</span>
              <span className="text-primary font-medium">Issues</span>
            </nav>
            <div className="flex items-baseline gap-space-md flex-wrap">
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                {project.name}
              </h1>
              <div className="flex items-center gap-space-xs font-code text-label-sm text-outline bg-surface-container px-space-sm py-space-2xs border border-outline-variant/40">
                <span className="text-on-surface font-semibold">{project.key}</span>
                <span className="text-outline-variant">•</span>
                <span className="text-primary">
                  {project.status === "ACTIVE" ? "Activo" : "Archivado"}
                </span>
                <span className="text-outline-variant">•</span>
                <span>
                  Creado el {new Date(project.createdAt).toLocaleDateString("es-ES")}
                </span>
              </div>
            </div>
            {project.description && (
              <p className="font-body-sm text-body-sm text-outline mt-space-2xs max-w-2xl">
                {project.description}
              </p>
            )}
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-space-sm self-start md:self-auto">
            <Link
              href={`/organizations/${slug}/projects/${project.id}/settings`}
              className="h-9 px-space-md bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-colors flex items-center gap-space-xs"
            >
              <span className="material-symbols-outlined text-[16px] text-outline">settings</span>
              <span>Opciones</span>
            </Link>
            <CreateIssueButton
              slug={slug}
              projectId={project.id}
              types={detail?.issueTypes || []}
              statuses={detail?.issueStatuses || []}
              members={members}
            />
          </div>
        </div>
      </section>

      {/* Filter Toolbar (Stitch) */}
      <IssueFilters
        basePath={`/organizations/${slug}/projects/${projectId}`}
        statuses={detail?.issueStatuses || []}
        members={members}
        current={filters}
      />

      {/* Metric Strip: High-Density Project Overview (Stitch) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 border-b border-outline-variant/30 bg-surface">
        <div className="p-space-md border-r border-outline-variant/30 flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Issues Totales
            </p>
            <p className="font-headline-md text-headline-md text-on-surface font-semibold">
              {totalIssues}
            </p>
          </div>
          <span className="material-symbols-outlined text-outline text-[24px]">dataset</span>
        </div>
        <div className="p-space-md border-r border-outline-variant/30 flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              En Progreso
            </p>
            <p className="font-headline-md text-headline-md text-primary font-semibold">
              {inProgressIssues}
            </p>
          </div>
          <span className="material-symbols-outlined text-primary text-[24px]">pending</span>
        </div>
        <div className="p-space-md border-r border-outline-variant/30 flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Urgentes / Bloqueos
            </p>
            <p className="font-headline-md text-headline-md text-error font-semibold">
              {urgentIssues}
            </p>
          </div>
          <span className="material-symbols-outlined text-error text-[24px]">warning</span>
        </div>
        <div className="p-space-md flex items-center justify-between">
          <div>
            <p className="font-label-sm text-label-sm uppercase tracking-wider text-outline">
              Completadas
            </p>
            <p className="font-headline-md text-headline-md text-on-surface-variant font-semibold">
              {doneIssues}
            </p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-[24px]">task_alt</span>
        </div>
      </section>

      {/* Issue Table: Ultra-Clean Linear Matrix (Stitch) */}
      {issuesResult.issues.length === 0 ? (
        <div className="bg-surface border-b border-outline-variant/30 py-16 px-space-xl text-center space-y-space-md">
          <div className="w-12 h-12 rounded-full bg-surface-container-high border border-outline-variant/40 flex items-center justify-center mx-auto text-outline">
            <span className="material-symbols-outlined text-[26px]">task</span>
          </div>
          <div className="space-y-1">
            <p className="font-headline-sm text-headline-sm text-on-surface font-medium">No se encontraron incidencias</p>
            <p className="font-body-sm text-body-sm text-outline max-w-md mx-auto">
              {filters.search || filters.statusId || filters.priority || filters.assigneeId
                ? "No hay incidencias que coincidan con los filtros aplicados. Prueba a restablecer los filtros."
                : "Este proyecto aún no tiene incidencias creadas. Crea una para comenzar el backlog del equipo."}
            </p>
          </div>
          <div className="pt-space-xs inline-block">
            <CreateIssueButton
              slug={slug}
              projectId={project.id}
              types={detail?.issueTypes || []}
              statuses={detail?.issueStatuses || []}
              members={members}
            />
          </div>
        </div>
      ) : (
        <div className="w-full overflow-x-auto bg-surface">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/40 text-outline font-label-sm text-label-sm uppercase tracking-wider select-none">
                <th className="py-space-xs px-space-md w-28">Clave</th>
                <th className="py-space-xs px-space-md">Resumen / Título</th>
                <th className="py-space-xs px-space-md w-36">Estado</th>
                <th className="py-space-xs px-space-md w-32">Prioridad</th>
                <th className="py-space-xs px-space-md w-44">Responsable</th>
                <th className="py-space-xs px-space-md w-36">Fecha Entrega</th>
                <th className="py-space-xs px-space-md w-24">Puntos</th>
              </tr>
            </thead>
            <IssueTableBody
              rows={issuesResult.issues.map((issue) => ({
                id: issue.id,
                number: issue.number,
                title: issue.title,
                priority: issue.priority,
                storyPoints: issue.storyPoints,
                dueDate: issue.dueDate ? new Date(issue.dueDate).toISOString() : null,
                status: { name: issue.status.name, color: issue.status.color },
                assignee: issue.assignee ? { name: issue.assignee.name } : null,
              }))}
              projectKey={project.key}
              basePath={`/organizations/${slug}/projects/${projectId}/issues`}
            />
          </table>
        </div>
      )}
    </div>
  );
}