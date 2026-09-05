"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";

export function CreateBoardButton({
  slug,
  canCreate,
  projectId,
}: {
  slug: string;
  canCreate: boolean;
  projectId?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!canCreate) return null;

  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        Nuevo tablero
      </button>
      {open && (
        <CreateBoardModal
          slug={slug}
          projectId={projectId}
          onClose={() => setOpen(false)}
          onCreated={(boardId) => {
            router.push(`/organizations/${slug}/boards/${boardId}`);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function CreateBoardModal({
  slug,
  onClose,
  onCreated,
  projectId,
}: {
  slug: string;
  projectId?: string;
  onClose: () => void;
  onCreated: (boardId: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${slug}/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectId ? { name, description, projectId } : { name, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error creando tablero");
        return;
      }
      onCreated(data.data.id);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      title="Nuevo tablero Kanban"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" form="create-board-form" className="btn btn-primary" disabled={loading}>
            {loading ? "Creando..." : "Crear tablero"}
          </button>
        </>
      }
    >
      <form id="create-board-form" onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>Nombre</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Sprint 12"
            required
          />
        </div>
        <div className="field">
          <label>Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="¿Qué se gestiona en este tablero?"
            rows={3}
          />
        </div>
      </form>
    </Modal>
  );
}