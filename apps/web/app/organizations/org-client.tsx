"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export interface OrgProject {
  id: string;
  name: string;
  key: string;
}

const PROJECT_SECTIONS = [
  { href: "", label: "Issues", icon: "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  { href: "/boards", label: "Tablero", icon: "M4 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4V3zm4 0v18" },
  { href: "/tareas", label: "Vista Kanban", icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" },
  { href: "/documents", label: "Documentos", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" },
  { href: "/chat", label: "Chat", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  { href: "/settings", label: "Opciones", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7.3 7.3 0 0 0-1.7-1L14.7 3h-4l-.5 2.5a7.3 7.3 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.4 7.4 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7.3 7.3 0 0 0 1.7 1l.5 2.5h4l.5-2.5a7.3 7.3 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1z" },
];

function navLink(href: string, label: string, icon: string, active: boolean) {
  return (
    <a key={href} href={href} className={active ? "active" : ""}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={icon} />
      </svg>
      {label}
    </a>
  );
}

export function OrgNav({
  slug,
  orgName,
  projects,
}: {
  slug: string;
  orgName: string;
  projects: OrgProject[];
}) {
  const pathname = usePathname();
  const orgBase = `/organizations/${slug}`;
  const escapedBase = orgBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const projectMatch = pathname.match(new RegExp(`^${escapedBase}/projects/([^/]+)`));
  const projectId = projectMatch?.[1] || null;
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;

  const bottomLink = navLink(
    "/",
    "Inicio",
    "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
    pathname === "/"
  );

  // DENTRO DE UN PROYECTO: solo opciones del proyecto
  if (project) {
    return (
      <nav className="dash-nav">
        <div className="dash-nav-heading">
          <span className="dash-nav-heading-label">Proyecto</span>
          <a className="dash-nav-project-title" href={`${orgBase}/projects/${project.id}`}>
            <strong>{project.name}</strong>
            <span className="dash-nav-project-key">{project.key}</span>
          </a>
        </div>
        {PROJECT_SECTIONS.map((item) => {
          const href = `${orgBase}/projects/${project.id}${item.href}`;
          const active =
            item.href === ""
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
          return navLink(href, item.label, item.icon, active);
        })}
        <span className="dash-nav-sep" />
        {navLink(
          `${orgBase}/members`,
          "Miembros",
          "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
          pathname === `${orgBase}/members`
        )}
        <div className="dash-nav-bottom">{bottomLink}</div>
      </nav>
    );
  }

  // NIVEL ORGANIZACIÓN: resumen + proyectos
  const activeResumen =
    pathname === orgBase ||
    pathname.startsWith(`${orgBase}/members`) ||
    pathname.startsWith(`${orgBase}/analytics`);
  return (
    <nav className="dash-nav">
      {navLink(orgBase, "Resumen", "M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-18v6h8V3h-8z", activeResumen)}
      {navLink(
        `${orgBase}/members`,
        "Miembros",
        "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
        pathname === `${orgBase}/members`
      )}
      {navLink(
        `${orgBase}/analytics`,
        "Analíticas",
        "M18 20V10M12 20V4M6 20v-6",
        pathname === `${orgBase}/analytics`
      )}
      {navLink(
        `${orgBase}/tareas`,
        "Vencimientos",
        "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
        pathname === `${orgBase}/tareas`
      )}
      <div className="dash-nav-heading">
        <span className="dash-nav-heading-label">Proyectos</span>
      </div>
      {projects.length === 0 ? (
        <span className="dash-nav-projects-empty">Aún no hay proyectos.</span>
      ) : (
        <div className="dash-nav-projects">
          {projects.map((p) => {
            const href = `${orgBase}/projects/${p.id}`;
            return (
              <a
                key={p.id}
                href={href}
                className={pathname === href || pathname.startsWith(`${href}/`) ? "active" : ""}
              >
                <span className="dash-nav-project-key">{p.key}</span>
                <span className="dash-nav-project-name">{p.name}</span>
              </a>
            );
          })}
        </div>
      )}
      <div className="dash-nav-bottom">{bottomLink}</div>
    </nav>
  );
}

export function OrgSwitcher({
  current,
  organizations,
}: {
  current: string;
  organizations: { slug: string; name: string }[];
}) {
  const router = useRouter();
  return (
    <div className="dash-org-switch">
      <select
        aria-label="Cambiar de organización"
        value={current}
        onChange={(e) => router.push(`/organizations/${e.target.value}`)}
      >
        {organizations.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* noop */
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      className="btn btn-outline"
      onClick={handleLogout}
      disabled={loading}
    >
      {loading ? "Saliendo..." : "Cerrar sesión"}
    </button>
  );
}