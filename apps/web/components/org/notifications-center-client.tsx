"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: {
    invitationId?: string;
    organizationSlug?: string;
    issueId?: string;
    [key: string]: unknown;
  };
  readAt: string | null;
  createdAt: string;
}

export function NotificationsCenterClient({
  initialNotifications,
  slug,
  orgName,
}: {
  initialNotifications: NotificationItem[];
  slug: string;
  orgName: string;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [activeCategory, setActiveCategory] = useState<"all" | "invites" | "issues" | "mentions" | "archive">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "invitations" | "mentions" | "system">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filtrado reactivo
  const filteredNotifications = notifications.filter((n) => {
    const isInvite = n.type === "invite" || n.type === "INVITATION";
    const isIssue = n.type.includes("ISSUE") || n.type.includes("COMMENT") || n.type.includes("ASSIGNED");
    const isMention = n.type === "MENTION";

    // Filtro por categoría lateral
    if (activeCategory === "invites" && !isInvite) return false;
    if (activeCategory === "issues" && !isIssue) return false;
    if (activeCategory === "mentions" && !isMention) return false;
    if (activeCategory === "archive" && !n.readAt) return false;

    // Filtro por tabs horizontales
    if (activeFilter === "invitations" && !isInvite) return false;
    if (activeFilter === "mentions" && !isMention) return false;
    if (activeFilter === "system" && (isInvite || isIssue || isMention)) return false;

    return true;
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const handleMarkAllRead = async () => {
    try {
      await fetch(`/api/organizations/${slug}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
    } catch {
      /* silencioso */
    }
  };

  const handleAcceptInvite = async (invitationId: string, orgSlug: string) => {
    try {
      setActionLoading(invitationId);
      const res = await fetch(`/api/organizations/${orgSlug}/members/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.data?.invitationId !== invitationId));
        router.push(`/organizations/${orgSlug}`);
      } else {
        const json = await res.json();
        alert(json.error || "Error al aceptar la invitación");
      }
    } catch {
      alert("Error procesando invitación");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineInvite = async (invitationId: string) => {
    try {
      setActionLoading(invitationId);
      await fetch(`/api/organizations/${slug}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [`inv-${invitationId}`] }),
      });
      setNotifications((prev) => prev.filter((n) => n.data?.invitationId !== invitationId));
    } catch {
      /* silencioso */
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0b0d0e] text-[#e2e2e2] flex flex-col font-sans">
      {/* CABECERA SUPERIOR */}
      <div className="w-full bg-[#121518] border-b border-[#23272f] px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#9ca3af] uppercase tracking-wider mb-1">
              <Link href={`/organizations/${slug}`} className="hover:text-white">
                {orgName}
              </Link>
              <span>/</span>
              <span className="text-white font-semibold">Centro de Notificaciones</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>Bandeja de Eventos & Alertas</span>
              {unreadCount > 0 && (
                <span className="text-xs font-mono px-2.5 py-0.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded">
                  {unreadCount} sin leer
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono text-[#9ca3af] hover:text-white bg-[#181c22] hover:bg-[#20252e] border border-[#2b313a] rounded transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              <span>Marcar todo como leído</span>
            </button>
            <button
              type="button"
              onClick={() => alert("Ajustes de alertas por correo configurables en Ajustes")}
              className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono text-[#9ca3af] hover:text-white bg-[#181c22] hover:bg-[#20252e] border border-[#2b313a] rounded transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
              <span>Ajustes de Entrega</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL: SIDEBAR + LISTADO */}
      <div className="max-w-7xl mx-auto w-full px-6 py-6 flex-1 flex flex-col md:flex-row gap-6">
        {/* BARRA LATERAL DE CATEGORÍAS */}
        <aside className="w-full md:w-64 shrink-0 space-y-4">
          <div className="bg-[#121518] border border-[#23272f] rounded-lg p-3 space-y-1">
            <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-[#6b7280]">
              Bandejas
            </div>

            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded transition-colors ${
                activeCategory === "all"
                  ? "bg-blue-600/10 text-blue-400 font-medium border border-blue-600/20"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#181c22]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">inbox</span>
                <span>Todas</span>
              </span>
              <span className="text-[11px] font-mono text-[#6b7280]">{notifications.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("invites")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded transition-colors ${
                activeCategory === "invites"
                  ? "bg-blue-600/10 text-blue-400 font-medium border border-blue-600/20"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#181c22]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">group_add</span>
                <span>Invitaciones</span>
              </span>
              <span className="text-[11px] font-mono text-purple-400">
                {notifications.filter((n) => n.type === "invite" || n.type === "INVITATION").length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("issues")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded transition-colors ${
                activeCategory === "issues"
                  ? "bg-blue-600/10 text-blue-400 font-medium border border-blue-600/20"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#181c22]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">task_alt</span>
                <span>Issues & Tareas</span>
              </span>
              <span className="text-[11px] font-mono text-[#6b7280]">
                {notifications.filter((n) => n.type.includes("ISSUE") || n.type.includes("COMMENT") || n.type.includes("ASSIGNED")).length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("mentions")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded transition-colors ${
                activeCategory === "mentions"
                  ? "bg-blue-600/10 text-blue-400 font-medium border border-blue-600/20"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#181c22]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">alternate_email</span>
                <span>Menciones</span>
              </span>
              <span className="text-[11px] font-mono text-[#6b7280]">
                {notifications.filter((n) => n.type === "MENTION").length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("archive")}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded transition-colors ${
                activeCategory === "archive"
                  ? "bg-blue-600/10 text-blue-400 font-medium border border-blue-600/20"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#181c22]"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[18px]">archive</span>
                <span>Leídas / Historial</span>
              </span>
              <span className="text-[11px] font-mono text-[#6b7280]">
                {notifications.filter((n) => !!n.readAt).length}
              </span>
            </button>
          </div>

          <div className="bg-[#121518] border border-[#23272f] rounded-lg p-4 space-y-2">
            <div className="text-[11px] font-mono text-[#9ca3af] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Sincronización en vivo</span>
            </div>
            <p className="text-[11px] text-[#6b7280] leading-relaxed">
              Las notificaciones se actualizan automáticamente vía polling o push socket interno.
            </p>
          </div>
        </aside>

        {/* CONTENIDO CENTRAL: FILTROS + TARJETAS DE NOTIFICACIONES */}
        <div className="flex-1 space-y-4 min-w-0">
          {/* BARRA DE TABS / FILTROS HORIZONTALES */}
          <div className="bg-[#121518] border border-[#23272f] rounded-lg p-2 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                  activeFilter === "all"
                    ? "bg-[#1f242d] text-white font-medium"
                    : "text-[#9ca3af] hover:text-white hover:bg-[#181c22]"
                }`}
              >
                Principales
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("invitations")}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                  activeFilter === "invitations"
                    ? "bg-[#1f242d] text-white font-medium"
                    : "text-[#9ca3af] hover:text-white hover:bg-[#181c22]"
                }`}
              >
                Invitaciones
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("mentions")}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                  activeFilter === "mentions"
                    ? "bg-[#1f242d] text-white font-medium"
                    : "text-[#9ca3af] hover:text-white hover:bg-[#181c22]"
                }`}
              >
                Menciones
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("system")}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                  activeFilter === "system"
                    ? "bg-[#1f242d] text-white font-medium"
                    : "text-[#9ca3af] hover:text-white hover:bg-[#181c22]"
                }`}
              >
                Sistema
              </button>
            </div>

            <div className="text-xs font-mono text-[#6b7280] pr-2 shrink-0">
              Mostrando {filteredNotifications.length} de {notifications.length}
            </div>
          </div>

          {/* LISTA DE TARJETAS DE NOTIFICACIONES */}
          {filteredNotifications.length === 0 ? (
            <div className="bg-[#121518] border border-[#23272f] rounded-lg p-16 text-center space-y-3">
              <span className="material-symbols-outlined text-4xl text-[#474d57]">
                notifications_off
              </span>
              <h3 className="text-sm font-semibold text-white">No se encontraron notificaciones</h3>
              <p className="text-xs text-[#9ca3af] max-w-sm mx-auto">
                No hay notificaciones que coincidan con la bandeja o filtro seleccionado en este momento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((n) => {
                const isInvite = n.type === "invite" || n.type === "INVITATION";
                const inviteId = n.data?.invitationId;
                const orgSlug = (n.data?.organizationSlug as string) || slug;

                return (
                  <div
                    key={n.id}
                    className={`bg-[#121518] border rounded-lg p-5 transition-all shadow-sm ${
                      n.readAt
                        ? "border-[#23272f] opacity-80"
                        : "border-[#2b313a] bg-gradient-to-r from-[#121518] to-[#151920]"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icono de estado */}
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg ${
                          isInvite
                            ? "bg-purple-950/60 text-purple-400 border border-purple-800/40"
                            : n.type.includes("ASSIGNED")
                            ? "bg-blue-950/60 text-blue-400 border border-blue-800/40"
                            : "bg-[#1b2028] text-[#9ca3af] border border-[#2b313a]"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {isInvite ? "person_add" : n.type.includes("ASSIGNED") ? "assignment_ind" : "notifications"}
                        </span>
                      </div>

                      {/* Información central */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-white tracking-tight">{n.title}</h3>
                            {isInvite && (
                              <span className="px-1.5 py-0.2 text-[10px] font-mono bg-purple-950/80 text-purple-400 border border-purple-800/40 rounded uppercase">
                                INVITACIÓN
                              </span>
                            )}
                            {!n.readAt && (
                              <span className="w-2 h-2 rounded-full bg-blue-500" title="No leída" />
                            )}
                          </div>
                          <span className="text-xs font-mono text-[#6b7280]">
                            {new Date(n.createdAt).toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        <p className="text-xs text-[#9ca3af] leading-relaxed mb-3">
                          {n.message}
                        </p>

                        {/* ACCIONES DE INVITACIÓN DIRECTA */}
                        {isInvite && inviteId && !n.readAt && (
                          <div className="flex items-center gap-3 pt-2 border-t border-[#1f242c]">
                            <button
                              type="button"
                              disabled={actionLoading === inviteId}
                              onClick={() => handleAcceptInvite(inviteId, orgSlug)}
                              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono bg-blue-600 hover:bg-blue-500 text-white rounded font-medium disabled:opacity-50 transition-colors shadow-sm"
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                              <span>{actionLoading === inviteId ? "Aceptando..." : "Aceptar Invitación"}</span>
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === inviteId}
                              onClick={() => handleDeclineInvite(inviteId)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono bg-[#1c2027] hover:bg-[#252b35] text-[#9ca3af] hover:text-white rounded border border-[#2b313a] disabled:opacity-50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                              <span>Descartar</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
