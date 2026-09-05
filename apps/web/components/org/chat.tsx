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
    <div className="chat">
      <div className="chat-roster">
        <span className="chat-roster-title">
          {members.length} {members.length === 1 ? "miembro" : "miembros"} en {slug}
        </span>
        <div className="chat-roster-list">
          {members.map((m) => {
            const isOnline = online.includes(m.id);
            return (
              <div className="chat-roster-item" key={m.id} title={m.name}>
                <span className="avatar-wrap">
                  <span className="avatar">
                    {m.avatar ? <img src={m.avatar} alt="" /> : initials(m.name)}
                  </span>
                  <i className={`online-dot ${isOnline ? "on" : ""}`} />
                </span>
                <span className="chat-roster-name">{m.name}</span>
                <span className="role-badge">{m.role}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-body" ref={bodyRef} onScroll={handleScroll}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-3)", paddingTop: 40 }}>
              Aún no hay mensajes. ¡Saluda a tu equipo!
            </div>
          )}
          {messages.map((m) => {
            const mine = m.author.id === currentUserId;
            return (
              <div key={m.id} className={`chat-msg ${mine ? "mine" : ""}`}>
                {!mine && (
                  <span className="avatar">
                    {m.author.avatar ? <img src={m.author.avatar} alt="" /> : initials(m.author.name)}
                  </span>
                )}
                <div>
                  <div className="meta">
                    {!mine && <span className="name">{m.author.name}</span>}
                    <time>{formatTime(m.createdAt)}</time>
                  </div>
                  <div className="bubble">{m.content}</div>
                </div>
              </div>
            );
          })}
        </div>
        {error && <div className="error chat-error">{error}</div>}
        {me && <div className="chat-me">Enviando como <strong>{me.name}</strong></div>}
        {canSend && (
          <form className="chat-input" onSubmit={send}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(e);
                }
              }}
              placeholder="Escribe un mensaje... (Enter para enviar)"
              rows={1}
            />
            <button type="submit" className="btn btn-primary" disabled={sending || !text.trim()}>
              {sending ? "..." : "Enviar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}