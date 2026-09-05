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
    select: { id: true, organizationId: true, name: true, key: true, description: true },
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

  return (
    <>
      <div className="dash-toolbar">
        <div>
          <div className="crumb">
            <Link href={`/organizations/${slug}`}>{slug}</Link>
            <span>/</span>
            <Link href={`/organizations/${slug}/projects`}>Proyectos</Link>
            <span>/</span>
            <span>{project.name}</span>
          </div>
          <header className="dash-header" style={{ marginBottom: 4 }}>
            <h1>{project.name}</h1>
            <p>
              {project.key} · {project.description || "Sin descripción"}
            </p>
          </header>
        </div>
        <div className="actions">
          <Link href={`/organizations/${slug}/projects/${project.id}/settings`} className="btn btn-ghost">
            Opciones
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

      <IssueFilters
        basePath={`/organizations/${slug}/projects/${projectId}`}
        statuses={detail?.issueStatuses || []}
        members={members}
        current={filters}
      />

      {issuesResult.issues.length === 0 ? (
        <div className="empty-state">
          No se encontraron issues{filters.search || filters.statusId || filters.priority || filters.assigneeId ? " con los filtros actuales" : ""}.
        </div>
      ) : (
        <div className="panel" style={{ padding: 8, overflowX: "auto" }}>
          <table className="issue-table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Responsable</th>
                <th>Vencimiento</th>
                <th>Puntos</th>
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
    </>
  );
}