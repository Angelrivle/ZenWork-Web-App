"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";

export function CreateProjectButton({
  slug,
  canCreate,
}: {
  slug: string;
  canCreate: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!canCreate) return null;

  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        Nuevo proyecto
      </button>
      {open && (
        <CreateProjectModal
          slug={slug}
          onClose={() => setOpen(false)}
          onCreated={(projectId) => {
            router.push(`/organizations/${slug}/projects/${projectId}`);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function CreateProjectModal({
  slug,
  onClose,
  onCreated,
}: {
  slug: string;
  onClose: () => void;
  onCreated: (projectId: string) => void;
}) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${slug}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, key, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error creando proyecto");
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
      title="Nuevo proyecto"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" form="create-project-form" className="btn btn-primary" disabled={loading}>
            {loading ? "Creando..." : "Crear proyecto"}
          </button>
        </>
      }
    >
      <form id="create-project-form" onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>Nombre</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Lanzamiento web"
            required
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Clave (key)</label>
            <input
              className="input"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="Ej: WEB"
              maxLength={6}
              required
            />
          </div>
        </div>
        <div className="field">
          <label>Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="¿Qué busca lograr este proyecto?"
            rows={3}
          />
        </div>
      </form>
    </Modal>
  );
}