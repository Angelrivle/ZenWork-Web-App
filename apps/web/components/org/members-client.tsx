"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { initials } from "./modal";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  MEMBER: "Miembro",
  GUEST: "Invitado",
};

export interface MemberRow {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
}
export interface InvitationRow {
  id: string;
  email: string;
  role: string;
  invitedByName?: string;
  createdAt: string;
}

const MANAGE_ROLES = ["OWNER", "ADMIN"];

export function MembersManager({
  slug,
  orgName,
  members,
  invitations,
  myRole,
  canManage,
}: {
  slug: string;
  orgName: string;
  members: MemberRow[];
  invitations: InvitationRow[];
  myRole: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function invite(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${slug}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.details?.[0] || "Error al invitar");
        return;
      }
      setEmail("");
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(memberId: string, nextRole: string) {
    const res = await fetch(`/api/organizations/${slug}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Error cambiando el rol");
    }
    router.refresh();
  }

  async function removeMember(memberId: string, name: string) {
    if (!confirm(`¿Eliminar a ${name} de ${orgName}? Perderá el acceso a todo.`)) return;
    const res = await fetch(`/api/organizations/${slug}/members/${memberId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Error eliminando miembro");
      return;
    }
    router.refresh();
  }

  async function revokeInvitation(invitationId: string) {
    const res = await fetch(`/api/organizations/${slug}/members/invitations/${invitationId}`, {
      method: "DELETE",
    });
    if (!res.ok) alert("Error revocando la invitación");
    router.refresh();
  }

  const roleOptions = myRole === "OWNER" ? ["ADMIN", "MEMBER", "GUEST"] : ["MEMBER", "GUEST"];

  return (
    <div>
      {canManage && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 10px" }}>Invitar miembro</h3>
          {error && <div className="error">{error}</div>}
          <form onSubmit={invite} className="invite-form">
            <input
              className="input"
              type="email"
              required
              placeholder="email@compania.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select className="input inline-select" value={role} onChange={(e) => setRole(e.target.value)}>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "..." : "Invitar"}
            </button>
          </form>
        </div>
      )}

      <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-scroll">
          <table className="issue-table">
            <thead>
              <tr>
                <th>Miembro</th>
                <th>Email</th>
                <th>Rol</th>
                {canManage && <th style={{ textAlign: "right" }}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="avatar">{m.avatar ? <img src={m.avatar} alt="" /> : initials(m.name)}</span>
                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                  </td>
                  <td style={{ color: "var(--text-3)" }}>{m.email}</td>
                  <td>
                    {canManage && m.role !== "OWNER" ? (
                      <select
                        className="inline-select"
                        defaultValue={m.role}
                        onChange={(e) => changeRole(m.id, e.target.value)}
                      >
                        {(["OWNER", ...roleOptions] as string[])
                          .filter((r) => r !== "OWNER")
                          .map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span className="badge dot">{ROLE_LABEL[m.role] || m.role}</span>
                    )}
                  </td>
                  {canManage && (
                    <td style={{ textAlign: "right" }}>
                      {m.role !== "OWNER" && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => removeMember(m.id, m.name)}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="empty-cell">
                    Sin miembros todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {invitations.length > 0 && canManage && (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3 style={{ margin: "0 0 10px" }}>Invitaciones pendientes</h3>
          <div className="invite-list">
            {invitations.map((i) => (
              <div className="invite-row" key={i.id}>
                <div>
                  <strong>{i.email}</strong>
                  <span className="role-badge">{ROLE_LABEL[i.role] || i.role}</span>
                  <span className="invite-meta">
                    Invitado por {i.invitedByName || "alguien"} ·{" "}
                    {new Date(i.createdAt).toLocaleDateString("es-ES")}
                  </span>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => revokeInvitation(i.id)}>
                  Revocar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}