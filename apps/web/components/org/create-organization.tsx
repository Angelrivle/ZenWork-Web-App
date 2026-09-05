"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";

export function CreateOrganizationButton() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        Nueva organización
      </button>
      {open && (
        <Modal open title="Crear organización" onClose={() => setOpen(false)}>
          <CreateOrganizationForm
            onCreated={(slug) => {
              router.push(`/organizations/${slug}`);
              router.refresh();
            }}
            onClose={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}

function CreateOrganizationForm({
  onCreated,
  onClose,
}: {
  onCreated: (slug: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function deriveSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.details?.[0] || "Error creando organización");
        return;
      }
      onCreated(data.data.organization.slug);
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <div className="field">
        <label>Nombre</label>
        <input
          className="input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slug) setSlug(deriveSlug(e.target.value));
          }}
          placeholder="Ej: Acme Corp"
          required
        />
      </div>
      <div className="field">
        <label>Slug (URL)</label>
        <input
          className="input"
          value={slug}
          onChange={(e) => setSlug(deriveSlug(e.target.value))}
          placeholder="acme-corp"
          required
        />
      </div>
      <div className="field">
        <label>Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="¿A qué se dedica tu organización?"
        />
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Creando..." : "Crear organización"}
        </button>
      </div>
    </form>
  );
}