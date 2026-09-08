"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

export interface OrgProject {
  id: string;
  name: string;
  key: string;
}

export interface OrgItem {
  slug: string;
  name: string;
}



function navLink(
  href: string,
  label: string,
  iconName: string,
  active: boolean
) {
  return (
    <a
      key={href}
      href={href}
      className={`group flex items-center gap-space-sm px-space-sm py-2 font-body-sm text-body-sm transition-all rounded-[4px] relative ${
        active
          ? "bg-primary-container text-white font-medium shadow-sm"
          : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
      }`}
    >
      <span
        className={`material-symbols-outlined text-[18px] shrink-0 transition-colors ${
          active ? "text-white" : "text-outline group-hover:text-on-surface"
        }`}
      >
        {iconName}
      </span>
      <span className="truncate flex-1">{label}</span>
      {active && (
        <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
      )}
    </a>
  );
}

const PROJECT_SECTIONS = [
  { href: "", label: "Incidencias", icon: "task_alt" },
  { href: "/boards", label: "Tablero", icon: "view_kanban" },
  { href: "/tareas", label: "Kanban Flujo", icon: "view_column" },
  { href: "/documents", label: "Documentos", icon: "description" },
  { href: "/chat", label: "Chat", icon: "forum" },
  { href: "/settings", label: "Opciones", icon: "settings" },
];

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
    "home",
    pathname === "/"
  );

  // DENTRO DE UN PROYECTO
  if (project) {
    return (
      <div className="flex-1 overflow-y-auto px-space-sm py-space-md space-y-space-xl">
        <div className="space-y-space-2xs">
          <div className="px-space-sm py-space-2xs flex items-center justify-between">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Proyecto</span>
            <span className="font-code text-label-sm text-outline border border-outline-variant/40 px-space-2xs leading-none">
              {project.key}
            </span>
          </div>
          <div className="px-space-sm pb-space-2xs font-body-sm text-body-sm text-on-surface truncate font-medium">
            {project.name}
          </div>
          <nav className="space-y-space-2xs">
            {PROJECT_SECTIONS.map((item) => {
              const href = `${orgBase}/projects/${project.id}${item.href}`;
              const active =
                item.href === ""
                  ? pathname === href
                  : pathname === href || pathname.startsWith(`${href}/`);
              return navLink(href, item.label, item.icon, active);
            })}
            <div className="my-space-xs border-t border-outline-variant/20" />
            {navLink(
              `${orgBase}/members`,
              "Miembros",
              "group",
              pathname === `${orgBase}/members`
            )}
          </nav>
        </div>
      </div>
    );
  }

  // NIVEL ORGANIZACIÓN
  const activeResumen =
    pathname === orgBase;
  return (
    <div className="flex-1 overflow-y-auto px-space-sm py-space-md space-y-space-xl">
      <div className="space-y-space-2xs">
        <div className="px-space-sm py-space-2xs font-label-sm text-label-sm uppercase tracking-wider text-outline">
          Espacio de Trabajo
        </div>
        <nav className="space-y-space-2xs">
          {navLink(orgBase, "Resumen / Dashboard", "space_dashboard", activeResumen)}
          {navLink(
            `${orgBase}/members`,
            "Miembros",
            "group",
            pathname === `${orgBase}/members`
          )}
          {navLink(
            `${orgBase}/analytics`,
            "Analíticas",
            "analytics",
            pathname === `${orgBase}/analytics`
          )}
          {navLink(
            `${orgBase}/tareas`,
            "Vencimientos",
            "event_upcoming",
            pathname === `${orgBase}/tareas`
          )}
          {navLink(
            `${orgBase}/notifications`,
            "Notificaciones",
            "notifications",
            pathname === `${orgBase}/notifications`
          )}
          {navLink(
            `${orgBase}/profile`,
            "Mi Perfil",
            "account_circle",
            pathname === `${orgBase}/profile`
          )}
        </nav>
      </div>

      <div className="space-y-space-2xs">
        <div className="px-space-sm py-space-2xs flex items-center justify-between">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Proyectos</span>
          <span className="font-code text-label-sm text-outline border border-outline-variant/40 px-space-2xs leading-none">
            {projects.length}
          </span>
        </div>
        {projects.length === 0 ? (
          <div className="px-space-sm py-space-xs text-outline text-body-sm">
            Aún no hay proyectos.
          </div>
        ) : (
          <div className="space-y-space-2xs">
            {projects.map((p) => {
              const href = `${orgBase}/projects/${p.id}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <a
                  key={p.id}
                  href={href}
                  className={`flex items-center gap-space-sm px-space-sm py-1.5 font-body-sm text-body-sm transition-all rounded-[4px] ${
                    active
                      ? "bg-surface-container-highest text-on-surface font-medium shadow-sm"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                >
                  <span className="font-code text-[11px] text-primary bg-primary/10 px-1.5 py-0.5 border border-primary/20 shrink-0 font-medium">
                    {p.key}
                  </span>
                  <span className="truncate flex-1">{p.name}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function OrgSwitcher({
  current,
  organizations,
}: {
  current: string;
  organizations: OrgItem[];
}) {
  const router = useRouter();
  const currentOrg = organizations.find((o) => o.slug === current);

  return (
    <div className="h-topbar-height px-space-md flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-lowest/80 backdrop-blur-sm relative group">
      <div className="flex items-center gap-space-sm min-w-0 flex-1">
        <div className="w-7 h-7 bg-primary-container text-white flex items-center justify-center font-label-md text-label-md font-bold shrink-0 shadow-sm rounded-[4px]">
          {currentOrg?.name?.slice(0, 1)?.toUpperCase() || "Z"}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-headline-sm text-[14px] text-on-surface truncate leading-tight font-semibold">
            {currentOrg?.name || "ZenWork"}
          </span>
          <span className="font-code text-[10px] text-outline uppercase tracking-wider leading-none mt-0.5">
            WORKSPACE // {currentOrg?.slug || "MAIN"}
          </span>
        </div>
      </div>
      <div className="relative flex items-center">
        <select
          aria-label="Cambiar de organización"
          value={current}
          onChange={(e) => router.push(`/organizations/${e.target.value}`)}
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
        >
          {organizations.map((o) => (
            <option key={o.slug} value={o.slug} className="bg-surface text-on-surface">
              {o.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="text-outline group-hover:text-on-surface p-1 flex items-center justify-center rounded-[4px] hover:bg-surface-container transition-colors"
          tabIndex={-1}
        >
          <span className="material-symbols-outlined text-[18px]">unfold_more</span>
        </button>
      </div>
    </div>
  );
}

export function LogoutButton({ className }: { className?: string } = {}) {
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
      className={
        className ||
        "flex items-center gap-space-sm px-space-sm py-space-xs font-body-sm text-body-sm text-error hover:bg-surface-container-high transition-colors w-full text-left"
      }
      onClick={handleLogout}
      disabled={loading}
    >
      <span className="material-symbols-outlined text-[18px]">logout</span>
      <span>{loading ? "Saliendo..." : "Cerrar sesión"}</span>
    </button>
  );
}