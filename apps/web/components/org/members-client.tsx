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

  const [search, setSearch] = useState("");
  const roleOptions = myRole === "OWNER" ? ["ADMIN", "MEMBER", "GUEST"] : ["MEMBER", "GUEST"];

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const ownersCount = members.filter((m) => m.role === "OWNER").length;

  return (
    <div className="flex flex-col w-full">
      {/* Metrics Row (Stitch) */}
      <div className="px-space-xl py-space-md bg-surface-dim border-b border-outline-variant/20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter bg-surface-variant/40 p-gutter">
          <div className="bg-surface-container-low p-space-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase">Miembros Totales</span>
              <span className="material-symbols-outlined text-[18px] text-outline">group</span>
            </div>
            <div className="mt-space-sm flex items-baseline gap-space-xs">
              <span className="font-headline-xl text-headline-xl text-on-surface font-semibold">
                {members.length}
              </span>
              <span className="font-label-sm text-label-sm text-outline">activos</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-space-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase">Propietarios</span>
              <span className="material-symbols-outlined text-[18px] text-primary">verified_user</span>
            </div>
            <div className="mt-space-sm flex items-baseline gap-space-xs">
              <span className="font-headline-xl text-headline-xl text-on-surface font-semibold">
                {ownersCount}
              </span>
              <span className="font-label-sm text-label-sm text-outline">Privilegios totales</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-space-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase">Colaboradores</span>
              <span className="material-symbols-outlined text-[18px] text-on-secondary">badge</span>
            </div>
            <div className="mt-space-sm flex items-baseline gap-space-xs">
              <span className="font-headline-xl text-headline-xl text-on-surface font-semibold">
                {members.length - ownersCount}
              </span>
              <span className="font-label-sm text-label-sm text-outline">Con acceso</span>
            </div>
          </div>
          <div className="bg-surface-container-low p-space-md flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-label-sm text-outline uppercase">Pendientes</span>
              <span className="material-symbols-outlined text-[18px] text-error">pending_actions</span>
            </div>
            <div className="mt-space-sm flex items-baseline gap-space-xs">
              <span className="font-headline-xl text-headline-xl text-on-surface font-semibold">
                {invitations.length}
              </span>
              <span className="font-label-sm text-label-sm text-error">Esperando confirmación</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Row (Stitch) */}
      {canManage && (
        <div className="px-space-xl py-space-md bg-surface-container-low border-b border-outline-variant/20">
          <div className="bg-surface-container p-space-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md border border-outline-variant/30">
            <div className="flex items-center gap-space-xs min-w-0">
              <span className="material-symbols-outlined text-[20px] text-primary">person_add</span>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-on-surface leading-none">
                  Invitar nuevo miembro
                </span>
                <span className="font-body-sm text-body-sm text-outline mt-space-2xs leading-none">
                  Añade colaboradores mediante correo corporativo
                </span>
              </div>
            </div>
            <form
              onSubmit={invite}
              className="flex flex-col sm:flex-row items-stretch gap-space-xs flex-1 max-w-2xl lg:justify-end"
            >
              <input
                className="h-9 bg-surface-dim px-space-md text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:bg-surface-container-highest transition-colors flex-1 border border-outline-variant/40"
                type="email"
                required
                placeholder="email@compania.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div className="relative w-full sm:w-44">
                <select
                  className="w-full h-9 bg-surface-dim text-on-surface px-space-md font-body-sm text-body-sm appearance-none focus:outline-none focus:bg-surface-container-highest cursor-pointer border border-outline-variant/40"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r] || r}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-2 pointer-events-none text-[18px] text-outline">
                  expand_more
                </span>
              </div>
              <button
                type="submit"
                className="h-9 px-space-lg bg-primary-container hover:bg-inverse-primary text-on-surface font-body-sm text-body-sm font-medium flex items-center justify-center gap-space-xs transition-colors whitespace-nowrap shadow-sm border border-primary-container"
                disabled={loading}
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>{loading ? "..." : "Invitar miembro"}</span>
              </button>
            </form>
          </div>
          {error && <div className="text-error text-body-sm mt-space-xs">{error}</div>}
        </div>
      )}

      {/* Filter Row */}
      <div className="px-space-xl py-space-md bg-surface flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm flex-1 max-w-md">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-space-sm top-2 text-[18px] text-outline">
              search
            </span>
            <input
              type="text"
              placeholder="Filtrar por nombre o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-space-xl pr-space-md bg-surface-container-low text-on-surface font-body-sm text-body-sm placeholder:text-outline border border-outline-variant/40 focus:outline-none focus:bg-surface-container-high transition-colors"
            />
          </div>
        </div>
        <div className="flex items-center gap-space-xs self-end sm:self-center font-label-sm text-label-sm text-outline">
          Mostrando {filteredMembers.length} de {members.length} registros
        </div>
      </div>

      {/* Members Table (Stitch) */}
      <div className="px-space-xl pb-space-2xl bg-surface flex flex-col gap-space-xl">
        <div className="w-full overflow-x-auto bg-surface-container-low border border-outline-variant/30 shadow-sm">
          <table className="w-full text-left font-body-md text-body-md min-w-[750px]">
            <thead>
              <tr className="bg-surface-dim font-label-sm text-label-sm text-outline uppercase tracking-wider select-none border-b border-outline-variant/30">
                <th className="py-space-sm px-space-lg font-medium">Miembro</th>
                <th className="py-space-sm px-space-md font-medium">Correo Electrónico</th>
                <th className="py-space-sm px-space-md font-medium">Rol</th>
                {canManage && <th className="py-space-sm px-space-lg text-right font-medium">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-surface-container transition-colors group">
                  <td className="py-space-md px-space-lg">
                    <div className="flex items-center gap-space-md">
                      <div className="w-8 h-8 bg-primary-container text-on-surface flex items-center justify-center font-label-md text-label-md font-semibold shrink-0">
                        {initials(m.name)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-body-md text-body-md text-on-surface font-medium truncate">
                          {m.name}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-space-md px-space-md font-code text-code text-on-surface-variant">
                    {m.email}
                  </td>
                  <td className="py-space-md px-space-md">
                    {canManage && m.role !== "OWNER" ? (
                      <select
                        className="bg-surface-dim text-on-surface px-2 py-1 font-body-sm text-body-sm border border-outline-variant/40"
                        defaultValue={m.role}
                        onChange={(e) => changeRole(m.id, e.target.value)}
                      >
                        {(["OWNER", ...roleOptions] as string[])
                          .filter((r) => r !== "OWNER")
                          .map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r] || r}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <span className="inline-flex items-center gap-space-2xs px-space-sm py-space-2xs bg-primary-container/20 text-primary font-label-sm text-label-sm font-medium">
                        <span className="material-symbols-outlined text-[14px]">shield_person</span>
                        <span>{ROLE_LABEL[m.role] || m.role}</span>
                      </span>
                    )}
                  </td>
                  {canManage && (
                    <td className="py-space-md px-space-lg text-right">
                      {m.role !== "OWNER" && (
                        <button
                          type="button"
                          className="px-space-md py-space-2xs text-error hover:bg-error-container hover:text-on-error-container font-body-sm text-body-sm transition-colors border border-error/40"
                          onClick={() => removeMember(m.id, m.name)}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 4 : 3} className="py-space-xl text-center text-outline">
                    Sin miembros encontrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Invitaciones pendientes */}
        {invitations.length > 0 && canManage && (
          <div className="bg-surface-container-low border border-outline-variant/30 p-space-lg space-y-space-md shadow-sm">
            <h3 className="font-label-md text-label-md uppercase tracking-wider text-outline">
              Invitaciones pendientes ({invitations.length})
            </h3>
            <div className="divide-y divide-outline-variant/20">
              {invitations.map((i) => (
                <div key={i.id} className="py-space-sm flex items-center justify-between gap-space-md">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-space-sm">
                    <strong className="text-on-surface font-code text-body-sm">{i.email}</strong>
                    <span className="font-label-sm text-label-sm bg-primary-container/20 text-primary px-2 py-0.5">
                      {ROLE_LABEL[i.role] || i.role}
                    </span>
                    <span className="text-outline text-body-sm">
                      Invitado por {i.invitedByName || "alguien"} ·{" "}
                      {new Date(i.createdAt).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-outline hover:text-error text-body-sm underline px-space-sm"
                    onClick={() => revokeInvitation(i.id)}
                  >
                    Revocar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}