import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import { prisma } from "@zenwork/db";
import { getProjects } from "@/lib/services";
import { CreateProjectButton } from "@/components/org/create-project";

export default async function ProjectsPage({
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

  const [projects, canCreate] = await Promise.all([
    getProjects(org.id),
    prisma.membership.findFirst({
      where: { organizationId: org.id, userId, role: { in: ["OWNER", "ADMIN"] } },
    }),
  ]);

  return (
    <>
      <div className="dash-toolbar">
        <div>
          <div className="crumb">
            <Link href={`/organizations/${slug}`}>{org.name}</Link>
            <span>/</span>
            <span>Proyectos</span>
          </div>
          <header className="dash-header" style={{ marginBottom: 0 }}>
            <h1>Proyectos</h1>
            <p>Gestiona las iniciativas de {org.name} y sus issues.</p>
          </header>
        </div>
        <div className="actions">
          <CreateProjectButton slug={slug} canCreate={!!canCreate} />
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">Aún no hay proyectos. Crea el primero para empezar.</div>
      ) : (
        <div className="dash-list">
          {projects.map((p) => (
            <Link
              className="dash-item"
              href={`/organizations/${slug}/projects/${p.id}`}
              key={p.id}
            >
              <div className="dash-item-icon">{p.key.slice(0, 2)}</div>
              <div className="dash-item-body">
                <h3>
                  {p.name} <span style={{ color: "var(--text-3)", fontWeight: 400 }}>({p.key})</span>
                </h3>
                <p>{p.description || "Sin descripción"}</p>
              </div>
              <div className="dash-item-meta">
                {p._count.issues} issues · {p._count.boards} tableros
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}