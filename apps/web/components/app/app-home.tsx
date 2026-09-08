"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateOrganizationButton } from "@/components/org/create-organization";
import { CreateProjectQuick } from "@/components/org/create-project-quick";

export interface HomeOrg {
  slug: string;
  name: string;
  description?: string | null;
  role: string;
  projects: { id: string; name: string; key: string }[];
  stats: { projects: number; members: number; issues: number; boards: number };
}

export interface PendingInvitation {
  id: string;
  role: string;
  organizationSlug: string;
  organizationName: string;
  invitedBy: string;
}

export function AppHome({
  userName,
  organizations,
  invitations,
}: {
  userName: string;
  organizations: HomeOrg[];
  invitations: PendingInvitation[];
}) {
  const [filterText, setFilterText] = useState("");

  const filteredOrgs = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(filterText.toLowerCase()) ||
      (o.description && o.description.toLowerCase().includes(filterText.toLowerCase())) ||
      o.slug.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-space-xl py-space-2xl space-y-space-3xl">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg pb-space-lg">
        <div className="space-y-space-xs">
          <div className="flex items-center gap-space-xs text-primary-container">
            <span className="material-symbols-outlined text-[14px]">terminal</span>
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-outline">
              HOLA, {userName ? userName.toUpperCase() : "EQUIPO"}
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
            Mis organizaciones
          </h1>
          <p className="font-body-md text-body-md text-outline max-w-xl">
            Crea un proyecto en cualquiera de tus organizaciones o únete a las que ya perteneces.
          </p>
        </div>
        <div className="flex items-center gap-space-sm">
          <div className="relative">
            <input
              type="text"
              placeholder="Filtrar..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/40 text-on-surface px-space-md py-space-xs font-body-sm text-body-sm focus:outline-none focus:border-primary-container transition-colors"
            />
          </div>
          <CreateOrganizationButton />
        </div>
      </header>

      {/* Invitaciones pendientes si las hay */}
      {invitations.length > 0 && (
        <div className="bg-surface-container-low border border-outline-variant/30 p-space-lg space-y-space-md shadow-sm">
          <div className="flex items-center gap-space-xs font-label-md text-label-md uppercase tracking-wider text-primary">
            <span className="material-symbols-outlined text-[18px]">mail</span>
            <span>Invitaciones pendientes ({invitations.length})</span>
          </div>
          <div className="divide-y divide-outline-variant/20">
            {invitations.map((inv) => (
              <PendingInvitationRow key={inv.id} invitation={inv} />
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Resumen Dinámico (Reemplazo moderno del teaser de imagen estática) */}
      <section className="bg-surface-container-low border border-outline-variant/30 p-space-lg md:p-space-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg pb-space-lg border-b border-outline-variant/20">
          <div className="space-y-space-2xs">
            <div className="flex items-center gap-space-xs text-primary font-code text-label-sm uppercase tracking-wider">
              <span className="inline-block w-2 h-2 bg-primary"></span>
              <span>Sincronización de Flujo Global</span>
            </div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">
              Centro de Operaciones y Proyectos
            </h2>
            <p className="font-body-sm text-body-sm text-outline max-w-2xl">
              Accede a tus espacios de trabajo, monitorea el avance de incidencias y colabora en tiempo real en tus tableros y documentos.
            </p>
          </div>
          <div className="flex items-center gap-space-md font-code text-label-sm bg-surface-container px-space-md py-space-sm border border-outline-variant/30 shrink-0">
            <div className="flex items-center gap-space-xs">
              <span className="text-outline">SISTEMA:</span>
              <span className="text-primary font-semibold">v2.4.1</span>
            </div>
            <span className="text-outline-variant">•</span>
            <div className="flex items-center gap-space-xs">
              <span className="text-outline">ESTADO:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                EN LÍNEA
              </span>
            </div>
          </div>
        </div>

        {/* Strip de Métricas Globales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md pt-space-lg">
          <div className="flex items-center gap-space-md p-space-md bg-surface border border-outline-variant/20">
            <div className="w-10 h-10 bg-primary-container/20 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">corporate_fare</span>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Organizaciones</p>
              <p className="font-headline-md text-headline-md font-semibold text-on-surface">{organizations.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-space-md p-space-md bg-surface border border-outline-variant/20">
            <div className="w-10 h-10 bg-primary-container/20 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">folder</span>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Proyectos Activos</p>
              <p className="font-headline-md text-headline-md font-semibold text-on-surface">
                {organizations.reduce((sum, o) => sum + o.stats.projects, 0)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-space-md p-space-md bg-surface border border-outline-variant/20">
            <div className="w-10 h-10 bg-primary-container/20 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">task_alt</span>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Issues Totales</p>
              <p className="font-headline-md text-headline-md font-semibold text-on-surface">
                {organizations.reduce((sum, o) => sum + o.stats.issues, 0)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-space-md p-space-md bg-surface border border-outline-variant/20">
            <div className="w-10 h-10 bg-primary-container/20 text-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[22px]">view_kanban</span>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-outline uppercase tracking-wider">Tableros Kanban</p>
              <p className="font-headline-md text-headline-md font-semibold text-on-surface">
                {organizations.reduce((sum, o) => sum + o.stats.boards, 0)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Organizations Section (Formato Horizontal) */}
      <section className="space-y-space-md">
        <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/20">
          <div className="flex items-center gap-space-sm">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Organizaciones registradas
            </h2>
            <span className="font-code text-label-sm px-space-xs py-space-2xs bg-surface-container-high text-primary border border-outline-variant/30">
              {filteredOrgs.length}
            </span>
          </div>
          <span className="font-code text-label-sm text-outline uppercase">
            VISTA_HORIZONTAL // ACTIVIDAD_REC
          </span>
        </div>

        {filteredOrgs.length === 0 ? (
          <div className="bg-surface-container-low border border-outline-variant/30 p-space-2xl text-center space-y-space-md">
            <p className="text-outline font-body-md">
              {organizations.length === 0
                ? "Aún no perteneces a ninguna organización. Crea la primera para comenzar."
                : "No se encontraron organizaciones con ese criterio."}
            </p>
            {organizations.length === 0 && <CreateOrganizationButton />}
          </div>
        ) : (
          <div className="space-y-space-md">
            {filteredOrgs.map((org) => (
              <OrgRow key={org.slug} org={org} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PendingInvitationRow({ invitation }: { invitation: PendingInvitation }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        `/api/organizations/${invitation.organizationSlug}/members/accept`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invitationId: invitation.id }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "No se pudo aceptar la invitación");
        setBusy(false);
        return;
      }
      router.push(`/organizations/${invitation.organizationSlug}`);
      router.refresh();
    } catch {
      setError("Error de red");
      setBusy(false);
    }
  }

  return (
    <div className="py-space-md flex items-center justify-between gap-space-md">
      <div className="font-body-sm text-body-sm">
        <strong className="text-on-surface">{invitation.invitedBy}</strong> te invitó a{" "}
        <strong className="text-on-surface">{invitation.organizationName}</strong> como{" "}
        <span className="font-code text-label-sm px-space-xs py-space-2xs bg-primary-container/20 text-primary uppercase">
          {invitation.role}
        </span>
      </div>
      <div className="flex items-center gap-space-sm">
        {error && <span className="text-error text-label-sm">{error}</span>}
        <button
          type="button"
          className="bg-primary-container hover:bg-inverse-primary text-on-surface px-space-md py-space-xs font-body-sm text-body-sm font-medium transition-colors"
          disabled={busy}
          onClick={accept}
        >
          {busy ? "..." : "Aceptar"}
        </button>
      </div>
    </div>
  );
}

function OrgRow({ org }: { org: HomeOrg }) {
  const [expanded, setExpanded] = useState(false);
  const canCreate = org.role === "OWNER" || org.role === "ADMIN";

  return (
    <article className="bg-surface-container-low border border-outline-variant/30 hover:border-outline-variant/60 transition-colors shadow-sm">
      <div className="p-space-lg flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
        {/* Identidad de Organización */}
        <div className="flex items-start sm:items-center gap-space-md min-w-0 flex-1">
          <div className="w-12 h-12 bg-primary-container text-on-surface flex items-center justify-center font-label-md text-label-md font-bold shrink-0 shadow-sm">
            {org.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-space-xs flex-wrap">
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold hover:text-primary transition-colors">
                <Link href={`/organizations/${org.slug}`}>
                  {org.name}
                </Link>
              </h3>
              <span className="bg-primary-container/20 text-primary font-code text-label-sm px-space-xs py-0.5 leading-none uppercase border border-primary/20">
                {org.role}
              </span>
              <span className="font-code text-label-sm text-outline">
                / {org.slug}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-outline line-clamp-1">
              {org.description || "Espacio de trabajo colaborativo para proyectos e incidencias de tu equipo."}
            </p>
          </div>
        </div>

        {/* Métricas Horizontales */}
        <div className="grid grid-cols-4 gap-space-xs bg-surface border border-outline-variant/20 p-space-xs shrink-0 self-stretch sm:self-auto text-center">
          <div className="px-space-md py-space-2xs">
            <span className="block font-headline-sm text-headline-sm font-semibold text-on-surface">{org.stats.projects}</span>
            <span className="block font-label-sm text-label-sm text-outline uppercase tracking-wider">Proy</span>
          </div>
          <div className="px-space-md py-space-2xs border-l border-outline-variant/20">
            <span className="block font-headline-sm text-headline-sm font-semibold text-on-surface">{org.stats.members}</span>
            <span className="block font-label-sm text-label-sm text-outline uppercase tracking-wider">Miembros</span>
          </div>
          <div className="px-space-md py-space-2xs border-l border-outline-variant/20">
            <span className="block font-headline-sm text-headline-sm font-semibold text-on-surface">{org.stats.issues}</span>
            <span className="block font-label-sm text-label-sm text-outline uppercase tracking-wider">Issues</span>
          </div>
          <div className="px-space-md py-space-2xs border-l border-outline-variant/20">
            <span className="block font-headline-sm text-headline-sm font-semibold text-on-surface">{org.stats.boards}</span>
            <span className="block font-label-sm text-label-sm text-outline uppercase tracking-wider">Tableros</span>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-space-xs shrink-0 self-end lg:self-center">
          {canCreate && (
            <div className="w-auto">
              <CreateProjectQuick slug={org.slug} />
            </div>
          )}
          <button
            type="button"
            className="h-9 px-space-md bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-colors border border-outline-variant/30 flex items-center gap-space-xs"
            onClick={() => setExpanded(!expanded)}
          >
            <span className="material-symbols-outlined text-[16px] text-outline">
              {expanded ? "expand_less" : "expand_more"}
            </span>
            <span>Proyectos ({org.projects.length})</span>
          </button>
          <Link
            href={`/organizations/${org.slug}`}
            className="h-9 px-space-lg bg-primary-container hover:bg-inverse-primary text-on-surface font-body-sm text-body-sm font-medium transition-colors flex items-center gap-space-xs border border-primary-container"
          >
            <span>Entrar al espacio</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </div>

      {/* Proyectos Desplegables en Horizontal */}
      {expanded && (
        <div className="px-space-lg pb-space-lg pt-space-xs border-t border-outline-variant/20 bg-surface-container-lowest/50">
          <div className="flex items-center justify-between py-space-xs mb-space-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
              Proyectos de {org.name}
            </span>
            <Link
              href={`/organizations/${org.slug}/projects`}
              className="font-body-sm text-body-sm text-primary hover:underline"
            >
              Ver todos los proyectos →
            </Link>
          </div>
          {org.projects.length === 0 ? (
            <div className="p-space-md bg-surface border border-outline-variant/20 text-outline font-body-sm text-center">
              Esta organización no tiene proyectos creados aún.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
              {org.projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/organizations/${org.slug}/projects/${p.id}`}
                  className="p-space-sm bg-surface hover:bg-surface-container-high border border-outline-variant/30 flex items-center justify-between group transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="font-body-sm text-body-sm font-medium text-on-surface group-hover:text-primary transition-colors truncate">
                      {p.name}
                    </p>
                    <span className="font-code text-label-sm text-outline">
                      {p.key}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-outline group-hover:text-on-surface group-hover:translate-x-0.5 transition-all">
                    chevron_right
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}