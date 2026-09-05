import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";
import { getBoards } from "@/lib/services";
import { CreateBoardButton } from "@/components/org/create-board";

export default async function ProjectBoardsPage({
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

  const [boards, membership] = await Promise.all([
    getBoards(project.organizationId, project.id),
    prisma.membership.findFirst({
      where: { organizationId: project.organizationId, userId, role: { in: ["OWNER", "ADMIN", "MEMBER"] } },
    }),
  ]);

  const projectBase = `/organizations/${slug}/projects/${project.id}`;

  return (
    <>
      <div className="dash-toolbar">
        <div>
          <div className="crumb">
            <Link href={projectBase}>{project.name}</Link>
            <span>/</span>
            <span>Tablero</span>
          </div>
          <header className="dash-header" style={{ marginBottom: 0 }}>
            <h1>Tablero</h1>
            <p>
              Tarjetas independientes de los issues, con drag &amp; drop entre columnas
              (estilo Trello). Para ver los issues del proyecto agrupados por estado, usá{" "}
              <Link href={`${projectBase}/tareas`}>Vista Kanban</Link>.
            </p>
          </header>
        </div>
        <div className="actions">
          <CreateBoardButton slug={slug} canCreate={!!membership} projectId={project.id} />
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="empty-state">No hay tableros todavía. Crea uno para empezar.</div>
      ) : (
        <div className="doc-list">
          {boards.map((b) => {
            const cards = b.columns.reduce((s, c) => s + c._count.cards, 0);
            return (
              <Link
                className="doc-card"
                href={`/organizations/${slug}/projects/${project.id}/boards/${b.id}`}
                key={b.id}
              >
                <div className="doc-icon">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18M3 9h6" />
                  </svg>
                </div>
                <h3>{b.name}</h3>
                <p>
                  {b.columns.map((c) => c.name).join(" · ") || "Sin columnas"} · {cards} tarjetas
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}