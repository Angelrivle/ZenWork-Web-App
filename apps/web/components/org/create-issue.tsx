"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";

export interface IssueTypeOption {
  id: string;
  name: string;
  color?: string | null;
}
export interface IssueStatusOption {
  id: string;
  name: string;
  color: string;
}
export interface MemberOption {
  id: string;
  name: string;
}

export function CreateIssueButton({
  slug,
  projectId,
  types,
  statuses,
  members,
}: {
  slug: string;
  projectId: string;
  types: IssueTypeOption[];
  statuses: IssueStatusOption[];
  members: MemberOption[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        className="h-9 px-space-lg bg-primary-container hover:bg-inverse-primary text-on-primary font-body-sm text-body-sm font-medium transition-colors flex items-center gap-space-xs shadow-none cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        <span>Crear issue</span>
      </button>
      {open && (
        <CreateIssueModal
          slug={slug}
          projectId={projectId}
          types={types}
          statuses={statuses}
          members={members}
          onClose={() => setOpen(false)}
          onCreated={() => router.refresh()}
        />
      )}
    </>
  );
}

function CreateIssueModal({
  slug,
  projectId,
  types,
  statuses,
  members,
  onClose,
  onCreated,
}: {
  slug: string;
  projectId: string;
  types: IssueTypeOption[];
  statuses: IssueStatusOption[];
  members: MemberOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const defaultType = types.find((t) => t.name === "Tarea") || types[0];
  const defaultStatus = statuses.find((s) => s.name === "Por hacer") || statuses[0];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [typeId, setTypeId] = useState(defaultType?.id || "");
  const [statusId, setStatusId] = useState(defaultStatus?.id || "");
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${slug}/projects/${projectId}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          typeId,
          statusId,
          priority,
          assigneeId: assigneeId || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error creando issue");
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      title="Crear issue"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" form="create-issue-form" className="btn btn-primary" disabled={loading}>
            {loading ? "Creando..." : "Crear issue"}
          </button>
        </>
      }
    >
      <form id="create-issue-form" onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>Título</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Corregir validación de login"
            required
            autoFocus
          />
        </div>
        <div className="field">
          <label>Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalle del trabajo a realizar..."
            rows={3}
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Tipo</label>
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Estado</label>
            <select value={statusId} onChange={(e) => setStatusId(e.target.value)}>
              {statuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Prioridad</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="CRITICAL">Crítica</option>
              <option value="BLOCKER">Bloqueante</option>
            </select>
          </div>
          <div className="field">
            <label>Responsable</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Sin asignar</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>Fecha límite (opcional)</label>
          <input
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}