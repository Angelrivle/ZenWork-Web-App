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
  return (
    <div className="app-home">
      <header className="app-home-header">
        <div>
          <span className="app-home-kicker">Hola, {userName}</span>
          <h1>Mis organizaciones</h1>
          <p>
            Crea un proyecto en cualquiera de tus organizaciones o únete a las que ya perteneces.
          </p>
        </div>
        <CreateOrganizationButton />
      </header>

      {invitations.length > 0 && (
        <div className="panel invitations-panel" style={{ marginBottom: 20 }}>
          <h3 className="panel-title">Invitaciones pendientes</h3>
          {invitations.map((inv) => (
            <PendingInvitationRow key={inv.id} invitation={inv} />
          ))}
        </div>
      )}

      {organizations.length === 0 && (
        <div className="panel empty-state">
          <h3>Aún no perteneces a ninguna organización</h3>
          <p>Crea la tuya para empezar a trabajar con tu equipo.</p>
          <CreateOrganizationButton />
        </div>
      )}

      <div className="app-org-grid">
        {organizations.map((org) => (
          <OrgCard key={org.slug} org={org} />
        ))}
      </div>
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
    <div className="bell-item is-invite">
      <div className="bell-item-text">
        <strong>{invitation.invitedBy}</strong> te invitó a{" "}
        <strong>{invitation.organizationName}</strong> como{" "}
        <strong>{invitation.role}</strong>
      </div>
      <div className="bell-item-actions">
        {error && <span className="error" style={{ marginRight: 8 }}>{error}</span>}
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={accept}>
          {busy ? "..." : "Aceptar"}
        </button>
      </div>
    </div>
  );
}

function OrgCard({ org }: { org: HomeOrg }) {
  const [expanded, setExpanded] = useState(false);
  const canCreate = org.role === "OWNER" || org.role === "ADMIN";

  return (
    <div className="panel app-org-card">
      <div className="app-org-head">
        <div className="app-org-avatar">{org.name.slice(0, 2).toUpperCase()}</div>
        <div className="app-org-title">
          <h3>
            <Link href={`/organizations/${org.slug}`}>{org.name}</Link>
          </h3>
          <span className="role-badge">{org.role}</span>
        </div>
        <Link className="btn btn-ghost btn-sm" href={`/organizations/${org.slug}`}>
          Abrir
        </Link>
      </div>

      <div className="app-org-stats">
        <div>
          <strong>{org.stats.projects}</strong>
          <span>Proyectos</span>
        </div>
        <div>
          <strong>{org.stats.members}</strong>
          <span>Miembros</span>
        </div>
        <div>
          <strong>{org.stats.issues}</strong>
          <span>Issues</span>
        </div>
        <div>
          <strong>{org.stats.boards}</strong>
          <span>Tableros</span>
        </div>
      </div>

      <div className="app-org-actions">
        {canCreate && <CreateProjectQuick slug={org.slug} />}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Ocultar proyectos" : `Ver proyectos (${org.projects.length})`}
        </button>
      </div>

      {expanded && (
        <div className="app-org-projects">
          {org.projects.length === 0 ? (
            <div className="dash-empty">Sin proyectos todavía.</div>
          ) : (
            org.projects.map((p) => (
              <Link className="dash-item" href={`/organizations/${org.slug}/projects/${p.id}`} key={p.id}>
                <div className="dash-item-icon">{p.key.slice(0, 2)}</div>
                <div className="dash-item-body">
                  <h3>{p.name}</h3>
                  <p>{p.key}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}