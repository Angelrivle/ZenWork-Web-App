"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";

export function CreateDocumentButton({
  slug,
  projectId,
  parentId,
  label,
}: {
  slug: string;
  projectId?: string;
  parentId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        {label || "Nuevo documento"}
      </button>
      {open && (
        <CreateDocumentModal
          slug={slug}
          projectId={projectId}
          parentId={parentId}
          onClose={() => setOpen(false)}
          onCreated={(docId) => {
            router.push(`/organizations/${slug}/documents/${docId}`);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function CreateDocumentModal({
  slug,
  onClose,
  onCreated,
  projectId,
  parentId,
}: {
  slug: string;
  projectId?: string;
  parentId?: string;
  onClose: () => void;
  onCreated: (docId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function slugify(input: string) {
    return input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "documento";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${slug}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slugify(title),
          ...(projectId ? { projectId } : {}),
          ...(parentId ? { parentId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error creando documento");
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
      title="Nuevo documento"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" form="create-doc-form" className="btn btn-primary" disabled={loading}>
            {loading ? "Creando..." : "Crear documento"}
          </button>
        </>
      }
    >
      <form id="create-doc-form" onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label>Título</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Manual de onboarding"
            required
            autoFocus
          />
        </div>
      </form>
    </Modal>
  );
}