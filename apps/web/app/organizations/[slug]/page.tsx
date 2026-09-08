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
    <div className="w-full">
      {/* Header Resumen de la Organización */}
      <section className="border-b border-outline-variant/30 bg-surface-dim px-space-xl py-space-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="space-y-space-2xs min-w-0">
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline uppercase tracking-wider">
              <span>Organización</span>
              <span>/</span>
              <span className="text-primary font-medium">{slug}</span>
            </div>
            <div className="flex items-baseline gap-space-md flex-wrap">
              <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                {org.name}
              </h1>
              <div className="flex items-center gap-space-xs font-code text-label-sm text-outline bg-surface-container px-space-sm py-space-2xs border border-outline-variant/40">
                <span className="text-primary font-semibold">{role}</span>
                <span className="text-outline-variant">•</span>
                <span>{projects.length} proyectos</span>
              </div>
            </div>
            <p className="font-body-sm text-body-sm text-outline mt-1 max-w-2xl">
              {org.description || "Espacio de trabajo y colaboración de tu organización."}
            </p>
          </div>

          <div className="flex items-center gap-space-xs">
            <Link
              href={`/organizations/${slug}/members`}
              className="h-9 px-space-md bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-body-sm text-body-sm flex items-center gap-space-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-outline">group</span>
              <span>Miembros</span>
            </Link>
            <Link
              href={`/organizations/${slug}/analytics`}
              className="h-9 px-space-md bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-body-sm text-body-sm flex items-center gap-space-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px] text-outline">analytics</span>
              <span>Analíticas</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="p-space-xl max-w-7xl mx-auto space-y-space-2xl">
        {/* Metric Strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
          <div className="p-space-md bg-surface border border-outline-variant/30 flex items-center justify-between">
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Proyectos</p>
              <p className="font-headline-md text-headline-md font-semibold text-on-surface">{org._count.projects}</p>
            </div>
            <span className="material-symbols-outlined text-outline text-[24px]">folder</span>
          </div>
          <div className="p-space-md bg-surface border border-outline-variant/30 flex items-center justify-between">
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Issues</p>
              <p className="font-headline-md text-headline-md font-semibold text-on-surface">{totalIssues}</p>
            </div>
            <span className="material-symbols-outlined text-outline text-[24px]">task_alt</span>
          </div>
          <div className="p-space-md bg-surface border border-outline-variant/30 flex items-center justify-between">
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Tableros</p>
              <p className="font-headline-md text-headline-md font-semibold text-on-surface">{boards.length}</p>
            </div>
            <span className="material-symbols-outlined text-outline text-[24px]">view_kanban</span>
          </div>
          <div className="p-space-md bg-surface border border-outline-variant/30 flex items-center justify-between">
            <div>
              <p className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Tarjetas</p>
              <p className="font-headline-md text-headline-md font-semibold text-on-surface">{totalCards}</p>
            </div>
            <span className="material-symbols-outlined text-outline text-[24px]">dashboard</span>
          </div>
        </section>

        {/* PROJECTS */}
        <section className="space-y-space-sm">
          <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Proyectos del equipo</h2>
            <Link className="font-body-sm text-body-sm text-primary hover:underline" href={`/organizations/${slug}/projects`}>
              Ver todos los proyectos →
            </Link>
          </div>
          {projects.length === 0 ? (
            <div className="p-space-lg bg-surface border border-outline-variant/20 text-outline font-body-sm text-center">
              Aún no hay proyectos en esta organización.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-sm">
              {projects.slice(0, 6).map((p) => (
                <Link
                  className="p-space-md bg-surface hover:bg-surface-container-high border border-outline-variant/30 hover:border-outline-variant/60 transition-all flex flex-col justify-between group"
                  href={`/organizations/${slug}/projects/${p.id}`}
                  key={p.id}
                >
                  <div className="space-y-space-xs">
                    <div className="flex items-center justify-between gap-space-xs">
                      <span className="font-code text-label-sm text-primary bg-primary/10 px-1.5 py-0.5 border border-primary/20">
                        {p.key}
                      </span>
                      <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-primary transition-colors">
                        chevron_right
                      </span>
                    </div>
                    <h3 className="font-body-md text-body-md font-medium text-on-surface group-hover:text-primary transition-colors truncate">
                      {p.name}
                    </h3>
                    <p className="font-body-sm text-body-sm text-outline line-clamp-2">
                      {p.description || "Sin descripción asignada."}
                    </p>
                  </div>
                  <div className="pt-space-sm mt-space-sm border-t border-outline-variant/20 flex items-center justify-between text-outline font-label-sm text-label-sm">
                    <span>{p._count.issues} issues</span>
                    <span>{p._count.boards} tableros</span>
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
      </div>
    </div>
  );
}