"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
    [key: string]: unknown;
  };
  readAt: string | null;
  createdAt: string;
}

type PanelState = {
  notifications: NotificationItem[];
} | null;

export function NotificationBell({ slug }: { slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PanelState>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${slug}/notifications`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const json = await res.json();
      setData(json.data);
    } catch {
      /* silencioso */
    }
  }, [slug]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 20000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  async function markRead() {
    try {
      await fetch(`/api/organizations/${slug}/notifications`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await load();
    } catch {
      /* silencioso */
    }
  }

  async function handleAcceptInvite(invitationId: string, orgSlug: string) {
    try {
      setActionLoading(invitationId);
      const res = await fetch(`/api/organizations/${orgSlug}/members/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });
      if (res.ok) {
        await load();
        router.push(`/organizations/${orgSlug}`);
      } else {
        const json = await res.json();
        alert(json.error || "Error al aceptar invitación");
      }
    } catch {
      alert("Error al procesar invitación");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeclineInvite(invitationId: string) {
    try {
      setActionLoading(invitationId);
      // Marcamos como leída o descartamos
      await fetch(`/api/organizations/${slug}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [`inv-${invitationId}`] }),
      });
      await load();
    } catch {
      /* silencioso */
    } finally {
      setActionLoading(null);
    }
  }

  const unreadCount = data?.notifications.filter((n) => !n.readAt).length || 0;

  return (
    <div className="relative">
      <button
        type="button"
        className={`w-9 h-9 flex items-center justify-center text-outline hover:text-on-surface bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/30 transition-colors relative ${
          open ? "bg-surface-container-high text-on-surface border-primary/40" : ""
        }`}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-blue-600 text-white text-[10px] font-mono font-bold flex items-center justify-center rounded-full shadow-sm border border-[#0b0d0e]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[#121518] border border-[#23272f] shadow-2xl rounded-lg z-50 overflow-hidden flex flex-col font-sans">
            {/* Cabecera del popup */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#23272f] bg-[#161a20]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider font-semibold text-white">
                  Notificaciones
                </span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markRead}
                  className="text-[11px] font-mono text-[#9ca3af] hover:text-white transition-colors"
                >
                  Marcar leídas
                </button>
              )}
            </div>

            {/* Cuerpo del popup */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-[#1f242c]">
              {data && data.notifications.length > 0 ? (
                data.notifications.map((n) => {
                  const isInvite = n.type === "invite" || n.type === "INVITATION";
                  const inviteId = n.data?.invitationId;
                  const orgSlug = (n.data?.organizationSlug as string) || slug;

                  return (
                    <div
                      key={n.id}
                      className={`p-3.5 transition-colors ${
                        n.readAt ? "bg-transparent opacity-75" : "bg-[#161b22]/60"
                      } hover:bg-[#1a2028]`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`w-7 h-7 rounded flex items-center justify-center shrink-0 text-sm ${
                            isInvite
                              ? "bg-purple-950/60 text-purple-400 border border-purple-800/40"
                              : n.type.includes("ASSIGNED")
                              ? "bg-blue-950/60 text-blue-400 border border-blue-800/40"
                              : "bg-neutral-800 text-[#9ca3af] border border-neutral-700"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {isInvite ? "person_add" : n.type.includes("ASSIGNED") ? "task_alt" : "notifications"}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-semibold text-white truncate">
                              {n.title}
                            </span>
                            <span className="text-[10px] font-mono text-[#6b7280] shrink-0">
                              {new Date(n.createdAt).toLocaleTimeString("es-ES", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-[#9ca3af] mt-1 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>

                          {/* Acciones de invitación rápida */}
                          {isInvite && inviteId && !n.readAt && (
                            <div className="flex items-center gap-2 mt-2.5">
                              <button
                                type="button"
                                disabled={actionLoading === inviteId}
                                onClick={() => handleAcceptInvite(inviteId, orgSlug)}
                                className="px-2.5 py-1 text-[11px] font-mono bg-blue-600 hover:bg-blue-500 text-white rounded font-medium disabled:opacity-50 transition-colors"
                              >
                                {actionLoading === inviteId ? "..." : "Aceptar"}
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading === inviteId}
                                onClick={() => handleDeclineInvite(inviteId)}
                                className="px-2.5 py-1 text-[11px] font-mono bg-[#23272f] hover:bg-[#2e343f] text-[#9ca3af] hover:text-white rounded disabled:opacity-50 transition-colors"
                              >
                                Descartar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs font-mono text-[#6b7280]">
                  <span className="material-symbols-outlined text-3xl mb-2 text-[#474d57] block">
                    notifications_off
                  </span>
                  No tienes notificaciones pendientes.
                </div>
              )}
            </div>

            {/* Pie del popup con enlace al Centro de Notificaciones */}
            <div className="p-2.5 bg-[#121518] border-t border-[#23272f] text-center">
              <Link
                href={`/organizations/${slug}/notifications`}
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-mono text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 rounded transition-colors"
              >
                <span>Ver todas en pantalla completa</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}