import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAccessToken } from "@zenwork/auth";
import { COOKIE_NAMES } from "@zenwork/shared";
import {
  getBoards,
  getDocuments,
  getOrganizationBySlug,
  getProjects,
} from "@/lib/services";

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(COOKIE_NAMES.SESSION)?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  let userId: string;
  try {
    const payload = await verifyAccessToken(sessionToken);
    userId = payload.sub;
  } catch {
    redirect("/login");
  }

  const org = await getOrganizationBySlug(slug, userId);

  if (!org) {
    redirect("/login");
  }

  const [projects, boards, documents] = await Promise.all([
    getProjects(org.id),
    getBoards(org.id),
    getDocuments(org.id),
  ]);

  const totalIssues = projects.reduce((sum, p) => sum + p._count.issues, 0);
  const totalCards = boards.reduce(
    (sum, b) => sum + b.columns.reduce((s, c) => s + c._count.cards, 0),
    0
  );
  const role = org.memberships[0]?.role || "MEMBER";

  return (
    <>
      <header className="dash-header">
        <h1>{org.name}</h1>
        <p>
          {org.description || "Organización de trabajo de tu equipo."}{" "}
          <span className="role-badge">{role}</span>
        </p>
      </header>

      {/* OVERVIEW */}
      <div className="dash-grid">
        <div className="dash-card">
          <strong>{org._count.projects}</strong>
          <span>Proyectos</span>
        </div>
        <div className="dash-card">
          <strong>{totalIssues}</strong>
          <span>Issues</span>
        </div>
        <div className="dash-card">
          <strong>{boards.length}</strong>
          <span>Tableros</span>
        </div>
        <div className="dash-card">
          <strong>{totalCards}</strong>
          <span>Tarjetas</span>
        </div>
      </div>

      {/* QUICK LINKS */}
      <div className="dash-quick">
        <Link className="dash-quick-item" href={`/organizations/${slug}/members`}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Miembros
        </Link>
        <Link className="dash-quick-item" href={`/organizations/${slug}/analytics`}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
          Analíticas
        </Link>
      </div>

      {/* PROJECTS */}
      <section className="dash-section">
        <div className="dash-section-title">
          <h2>Proyectos</h2>
          <Link className="btn btn-ghost btn-sm" href={`/organizations/${slug}/projects`}>
            Ver todos
          </Link>
        </div>
        {projects.length === 0 ? (
          <div className="dash-empty">Aún no hay proyectos en esta organización.</div>
        ) : (
          <div className="dash-list">
            {projects.slice(0, 5).map((p) => (
              <Link
                className="dash-item"
                href={`/organizations/${slug}/projects/${p.id}`}
                key={p.id}
              >
                <div className="dash-item-icon">{p.key.slice(0, 2)}</div>
                <div className="dash-item-body">
                  <h3>{p.name}</h3>
                  <p>{p.description || "Sin descripción"}</p>
                </div>
                <div className="dash-item-meta">
                  {p._count.issues} issues · {p._count.boards} tableros
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* BOARDS */}
      <section className="dash-section">
        <div className="dash-section-title">
          <h2>Tableros</h2>
          <Link className="btn btn-ghost btn-sm" href={`/organizations/${slug}/boards`}>
            Ver todos
          </Link>
        </div>
        {boards.length === 0 ? (
          <div className="dash-empty">No hay tableros Kanban todavía.</div>
        ) : (
          <div className="dash-list">
            {boards.slice(0, 5).map((b) => (
              <Link
                className="dash-item"
                href={`/organizations/${slug}/boards/${b.id}`}
                key={b.id}
              >
                <div className="dash-item-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18M3 9h6" />
                  </svg>
                </div>
                <div className="dash-item-body">
                  <h3>{b.name}</h3>
                  <p>{b.columns.map((c) => c.name).join(" · ") || "Sin columnas"}</p>
                </div>
                <div className="dash-item-meta">
                  {b.columns.reduce((s, c) => s + c._count.cards, 0)} tarjetas
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* DOCUMENTS */}
      <section className="dash-section">
        <div className="dash-section-title">
          <h2>Documentos</h2>
          <Link className="btn btn-ghost btn-sm" href={`/organizations/${slug}/documents`}>
            Ver todos
          </Link>
        </div>
        {documents.length === 0 ? (
          <div className="dash-empty">No hay documentos todavía.</div>
        ) : (
          <div className="dash-list">
            {documents.slice(0, 5).map((d) => (
              <Link
                className="dash-item"
                href={`/organizations/${slug}/documents/${d.id}`}
                key={d.id}
              >
                <div className="dash-item-icon">D</div>
                <div className="dash-item-body">
                  <h3>{d.title}</h3>
                  <p>{d.isPublished ? "Publicado" : "Borrador"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}