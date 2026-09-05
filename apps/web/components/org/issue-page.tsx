"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { initials } from "./modal";

const PRIORITY_ORDER: Record<string, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
  BLOCKER: 4,
};
const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
  BLOCKER: "Bloqueante",
};

export interface IssueEditorProps {
  slug: string;
  projectId: string;
  issueId: string;
  projectKey: string;
  issue: {
    id: string;
    number: number;
    title: string;
    description: string | null;
    priority: string;
    storyPoints: number | null;
    dueDate: string | null;
    type: { id: string; name: string; color?: string | null };
    status: { id: string; name: string; color: string };
    assignee: { id: string; name: string } | null;
    creator: { id: string; name: string };
    comments: Array<{
      id: string;
      content: string;
      createdAt: string;
      author: { id: string; name: string; avatar?: string | null };
    }>;
  };
  statuses: { id: string; name: string; color: string }[];
  members: { id: string; name: string }[];
  canEdit: boolean;
}

export function IssueEditor({ slug, projectId, issueId, projectKey, issue, statuses, members, canEdit }: IssueEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(issue.title);
  const [description, setDescription] = useState(issue.description || "");
  const [statusId, setStatusId] = useState(issue.status.id);
  const [priority, setPriority] = useState(issue.priority);
  const [assigneeId, setAssigneeId] = useState(issue.assignee?.id || "");
  const [storyPoints, setStoryPoints] = useState(issue.storyPoints?.toString() || "");
  const [dueDate, setDueDate] = useState(issue.dueDate ? issue.dueDate.slice(0, 10) : "");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const res = await fetch(`/api/organizations/${slug}/projects/${projectId}/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error guardando");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch {
      setError("Error de red");
    } finally {
      setSaving(false);
    }
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    const res = await fetch(`/api/organizations/${slug}/projects/${projectId}/issues/${issueId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment.trim() }),
    });
    if (res.ok) {
      setComment("");
      router.refresh();
    }
  }

  return (
    <div>
      <div className="dash-toolbar">
        <div>
          <div className="crumb">
            <span>{slug}</span>
            <span>/</span>
            <span>{projectKey}</span>
            <span>/</span>
            <span>#{issue.number}</span>
          </div>
          <input
            className="doc-title-input"
            style={{ maxWidth: 700, fontSize: 24, margin: 0 }}
            value={title}
            disabled={!canEdit}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title !== issue.title && title.trim() && save({ title })}
            aria-label="Título del issue"
          />
        </div>
        <div className="actions">
          {saved && <span className="badge" style={{ color: "var(--success)" }}>Guardado</span>}
          {saving && <span style={{ color: "var(--text-3)", fontSize: 13 }}>Guardando...</span>}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "start" }}>
        <div>
          <div className="panel">
            <div className="panel-title">
              Descripción
              {canEdit && (
                <small>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => save({ description })}
                    disabled={saving}
                  >
                    Guardar
                  </button>
                </small>
              )}
            </div>
            {canEdit ? (
              <textarea
                className="input"
                style={{ minHeight: 180, width: "100%" }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el problema o el trabajo a realizar..."
              />
            ) : description ? (
              <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{description}</p>
            ) : (
              <p style={{ color: "var(--text-3)", margin: 0 }}>Sin descripción.</p>
            )}
          </div>

          <div className="panel">
            <div className="panel-title">Comentarios ({issue.comments.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {issue.comments.length === 0 && (
                <p style={{ color: "var(--text-3)", margin: 0, fontSize: 13.5 }}>
                  Sin comentarios todavía.
                </p>
              )}
              {issue.comments.map((c) => (
                <div key={c.id} style={{ display: "flex", gap: 10 }}>
                  <span className="avatar">{c.author.avatar ? <img src={c.author.avatar} alt="" /> : initials(c.author.name)}</span>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12.5 }}>
                      <strong>{c.author.name}</strong>
                      <span style={{ color: "var(--text-3)" }}>
                        {new Date(c.createdAt).toLocaleString("es-ES")}
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.5 }}>
                      {c.content}
                    </p>
                  </div>
                </div>
              ))}

              {canEdit && (
                <form onSubmit={submitComment} style={{ display: "flex", gap: 8 }}>
                  <textarea
                    className="input"
                    style={{ flex: 1, minHeight: 56 }}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Añade un comentario..."
                  />
                  <button type="submit" className="btn btn-primary">
                    Comentar
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: 16 }}>
          <div className="field">
            <label>Estado</label>
            <select value={statusId} disabled={!canEdit} onChange={(e) => { setStatusId(e.target.value); save({ statusId: e.target.value }); }}>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Prioridad</label>
            <select
              value={priority}
              disabled={!canEdit}
              onChange={(e) => { setPriority(e.target.value); save({ priority: e.target.value }); }}
            >
              {Object.entries(PRIORITY_ORDER)
                .sort((a, b) => a[1] - b[1])
                .map(([value]) => (
                  <option key={value} value={value}>
                    {PRIORITY_LABEL[value]}
                  </option>
                ))}
            </select>
          </div>
          <div className="field">
            <label>Responsable</label>
            <select
              value={assigneeId}
              disabled={!canEdit}
              onChange={(e) => { setAssigneeId(e.target.value); save({ assigneeId: e.target.value || null }); }}
            >
              <option value="">Sin asignar</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Historia de usuario (puntos)</label>
            <input
              type="number"
              className="input"
              min={0}
              max={100}
              disabled={!canEdit}
              value={storyPoints}
              onChange={(e) => setStoryPoints(e.target.value)}
              onBlur={() => {
                const v = storyPoints === "" ? null : Number(storyPoints);
                if (v !== (issue.storyPoints ?? null)) save({ storyPoints: v });
              }}
            />
          </div>
          <div className="field">
            <label>Vencimiento</label>
            <input
              type="date"
              className="input"
              disabled={!canEdit}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => save({ dueDate: dueDate ? new Date(dueDate).toISOString() : null })} disabled={!canEdit || saving}>
              Guardar fecha
            </button>
          </div>
          <div style={{ marginTop: 12, color: "var(--text-3)", fontSize: 12.5 }}>
            Creado por {issue.creator.name}
          </div>
        </div>
      </div>
    </div>
  );
}