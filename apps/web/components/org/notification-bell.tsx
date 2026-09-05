"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

type PanelState = {
  notifications: NotificationItem[];
} | null;

export function NotificationBell({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<PanelState>(null);
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

  const unreadCount = data?.notifications.filter((n) => !n.readAt).length || 0;

  return (
    <div className="bell-wrap">
      <button
        type="button"
        className={`bell-btn${open ? " is-open" : ""}`}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        aria-label="Notificaciones"
        title="Notificaciones"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="bell-dot">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <>
          <div className="bell-backdrop" onClick={() => setOpen(false)} />
          <div className="bell-panel">
            <div className="bell-panel-head">
              <strong>Notificaciones</strong>
              {unreadCount > 0 && (
                <button type="button" className="btn-ghost btn-xs" onClick={markRead}>
                  Marcar todo leído
                </button>
              )}
            </div>

            <div className="bell-body">
              {data && data.notifications.length > 0 && (
                <>
                  {data.notifications.map((n) => (
                    <div className={`bell-item${n.readAt ? " is-read" : ""}`} key={n.id}>
                      <div className="bell-item-text">
                        <strong>{n.title}</strong>
                        <p>{n.message}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {data && data.notifications.length === 0 && (
                <div className="bell-empty">No hay notificaciones nuevas.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}