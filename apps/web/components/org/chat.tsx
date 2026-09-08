"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { initials } from "./modal";

export interface ChatAuthor {
  id: string;
  name: string;
  avatar?: string | null;
}
export interface ChatMessage {
  id: string;
  content: string;
  parentId?: string | null;
  createdAt: string;
  author: ChatAuthor;
}
export interface ChatMember {
  id: string;
  name: string;
  avatar?: string | null;
  role: string;
}

export function ChatPanel({
  slug,
  currentUserId,
  initialMessages,
  members,
  canSend,
  projectId,
}: {
  slug: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  members: ChatMember[];
  canSend: boolean;
  projectId?: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [online, setOnline] = useState<string[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    if (stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleScroll() {
    const el = bodyRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  // Agrega un mensaje evitando duplicados: tanto la respuesta optimista del
  // propio POST como el push de este mismo mensaje por SSE (que puede
  // llegar antes, ya que es una conexión aparte) intentan insertarlo.
  function addMessage(msg: ChatMessage) {
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }

  // Tiempo real vía Server-Sent Events: mensajes nuevos se reciben por push
  // (sin polling), y la presencia refleja conexiones abiertas de verdad en
  // vez de una lista simulada.
  useEffect(() => {
    const qs = projectId ? `?projectId=${projectId}` : "";
    const source = new EventSource(`/api/organizations/${slug}/messages/stream${qs}`);

    source.addEventListener("message", (e) => {
      try {
        addMessage(JSON.parse((e as MessageEvent).data));
      } catch {
        /* noop */
      }
    });

    source.addEventListener("presence", (e) => {
      try {
        setOnline(JSON.parse((e as MessageEvent).data));
      } catch {
        /* noop */
      }
    });

    source.onerror = () => {
      // EventSource reintenta la conexión automáticamente por su cuenta.
    };

    return () => source.close();
  }, [slug, projectId]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/organizations/${slug}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectId ? { content, projectId } : { content }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) {
        const { data } = json || {};
        if (data) addMessage(data);
        setText("");
      } else {
        setError((json && json.error) || "No se pudo enviar el mensaje");
        router.refresh();
      }
    } catch {
      setError("Error de red al enviar el mensaje");
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const me = members.find((m) => m.id === currentUserId);

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full overflow-hidden bg-background border border-outline-variant/30 shadow-sm">
      {/* Panel de Miembros / Roster Lateral (Stitch) */}
      <aside className="w-64 flex-shrink-0 bg-surface-container-lowest border-r border-outline-variant/30 flex flex-col select-none">
        <div className="p-space-md border-b border-outline-variant/30 flex items-center justify-between bg-surface-dim">
          <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider">
            Participantes ({members.length})
          </span>
          <span className="flex items-center gap-1 text-[11px] font-code text-green-400">
            <span className="w-1.5 h-1.5 bg-green-500 inline-block"></span>
            LIVE
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-space-xs space-y-space-2xs">
          {members.map((m) => {
            const isOnline = online.includes(m.id);
            return (
              <div
                key={m.id}
                className="flex items-center gap-space-sm px-space-sm py-space-xs hover:bg-surface-container-low transition-colors"
              >
                <div className="relative">
                  <div className="w-7 h-7 bg-primary-container text-on-surface font-label-md text-label-md font-semibold flex items-center justify-center shrink-0">
                    {initials(m.name)}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 ${
                      isOnline ? "bg-green-500" : "bg-outline-variant"
                    }`}
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-body-sm text-body-sm text-on-surface font-medium truncate">
                    {m.name}
                  </span>
                  <span className="font-label-sm text-label-sm text-outline uppercase">
                    {m.role}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-space-sm bg-surface-dim border-t border-outline-variant/30 font-code text-label-sm text-outline flex items-center justify-between">
          <span>SSE CANAL</span>
          <span className="text-primary font-medium">CONECTADO</span>
        </div>
      </aside>

      {/* Main Conversation Stream */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface">
        {/* Stream de Mensajes con Scroll */}
        <div
          className="flex-1 overflow-y-auto px-space-lg py-space-lg space-y-space-md"
          ref={bodyRef}
          onScroll={handleScroll}
        >
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-outline font-body-md">
              Aún no hay mensajes en este canal. ¡Saluda a tu equipo!
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.author.id === currentUserId;
              return (
                <div
                  key={m.id}
                  className={`group flex items-start gap-space-md hover:bg-surface-container-low/40 p-space-xs transition-colors ${
                    mine ? "bg-surface-container-low/20" : ""
                  }`}
                >
                  <div className="w-8 h-8 bg-primary-container text-on-surface font-label-md text-label-md font-bold flex items-center justify-center shrink-0 select-none">
                    {initials(m.author.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-space-sm mb-space-2xs">
                      <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                        {m.author.name}
                      </span>
                      {mine && (
                        <span className="font-code text-label-sm px-space-xs py-space-2xs bg-primary-container/30 text-primary border border-primary-container text-[10px] leading-none uppercase">
                          TÚ
                        </span>
                      )}
                      <span className="font-code text-label-sm text-outline">
                        {formatTime(m.createdAt)}
                      </span>
                    </div>
                    <p className="text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
                      {m.content}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {error && (
          <div className="px-space-md py-space-2xs bg-error-container text-on-error-container font-body-sm text-body-sm">
            {error}
          </div>
        )}

        {/* Input Bar */}
        {canSend && (
          <div className="p-space-md bg-surface-container-low border-t border-outline-variant/30">
            <form onSubmit={send} className="flex items-center gap-space-sm">
              <input
                type="text"
                className="flex-1 bg-surface border border-outline-variant/40 px-space-md py-space-sm font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container transition-colors"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escribe un mensaje... (Presiona Enter)"
              />
              <button
                type="submit"
                disabled={sending || !text.trim()}
                className="flex items-center gap-space-xs bg-primary-container hover:bg-inverse-primary text-on-surface px-space-lg py-space-sm font-body-sm text-body-sm font-medium transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>{sending ? "..." : "Enviar"}</span>
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}