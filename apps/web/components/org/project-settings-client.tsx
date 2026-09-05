"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const PALETTE = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#64748b",
] as const;

const CATEGORY_LABEL: Record<string, string> = {
  TODO: "Por hacer",
  IN_PROGRESS: "En progreso",
  DONE: "Hecho",
  ARCHIVED: "Archivado",
};

interface ProjectSettings {
  name: string;
  key: string;
  description: string | null;
  status: string;
}

interface IssueTypeRow {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
}
interface IssueStatusRow {
  id: string;
  name: string;
  color: string | null;
  category: string;
  sortOrder: number;
  isDefault: boolean;
}
interface LabelRow {
  id: string;
  name: string;
  color: string | null;
}

export function ProjectSettingsManager({
  slug,
  projectId,
  initial,
  types,
  statuses,
  labels,
  canManage,
}: {
  slug: string;
  projectId: string;
  initial: ProjectSettings;
  types: IssueTypeRow[];
  statuses: IssueStatusRow[];
  labels: LabelRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"ajustes" | "tipos" | "estados" | "etiquetas">("ajustes");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function flash(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(""), 2500);
  }

  const base = `/api/organizations/${slug}/projects/${projectId}`;

  async function api(method: string, path: string, body?: object) {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Error");
      throw new Error(data.error || "Error");
    }
    setError("");
    router.refresh();
    return data;
  }

  if (!canManage) {
    return <div className="panel dash-empty">Solo administradores pueden modificar esta configuración.</div>;
  }

  return (
    <div>
      {notice && <div className="notice">{notice}</div>}
      {error && <div className="error">{error}</div>}

      <div className="tabs">
        <button type="button" className={tab === "ajustes" ? "tab active" : "tab"} onClick={() => setTab("ajustes")}>
          Ajustes
        </button>
        <button type="button" className={tab === "tipos" ? "tab active" : "tab"} onClick={() => setTab("tipos")}>
          Tipos de issue
        </button>
        <button type="button" className={tab === "estados" ? "tab active" : "tab"} onClick={() => setTab("estados")}>
          Estados
        </button>
        <button type="button" className={tab === "etiquetas" ? "tab active" : "tab"} onClick={() => setTab("etiquetas")}>
          Etiquetas
        </button>
      </div>

      {tab === "ajustes" && (
        <SettingsTab slug={slug} projectId={projectId} initial={initial} api={api} flash={flash} />
      )}
      {tab === "tipos" && (
        <TypesTab slug={slug} projectId={projectId} types={types} api={api} flash={flash} />
      )}
      {tab === "estados" && (
        <StatusesTab slug={slug} projectId={projectId} statuses={statuses} api={api} flash={flash} />
      )}
      {tab === "etiquetas" && (
        <LabelsTab slug={slug} projectId={projectId} labels={labels} api={api} flash={flash} />
      )}
    </div>
  );
}

// ---------------- Ajustes ----------------

function SettingsTab({
  slug,
  initial,
  api,
  flash,
}: {
  slug: string;
  projectId: string;
  initial: ProjectSettings;
  api: (method: string, path: string, body?: object) => Promise<any>;
  flash: (m: string) => void;
}) {
  const [form, setForm] = useState({ name: initial.name, key: initial.key, description: initial.description || "", status: initial.status });
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("PATCH", "", {
        name: form.name,
        key: form.key,
        description: form.description,
        status: form.status,
      });
      flash("Ajustes guardados");
    } catch {
      /* error mostrado por api() */
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="panel settings-form">
      <label className="field">
        <span>Nombre</span>
        <input className="input" value={form.name} minLength={2} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label className="field">
        <span>Key</span>
        <input className="input" value={form.key} minLength={2} maxLength={10} required onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })} />
      </label>
      <label className="field">
        <span>Descripción</span>
        <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>
      <label className="field">
        <span>Estado</span>
        <select className="input inline-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="ACTIVE">Activo</option>
          <option value="ARCHIVED">Archivado</option>
        </select>
      </label>
      <div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

// ---------------- Listado genérico ----------------

function ColorDots({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="color-dots">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          className={c === value ? "color-dot active" : "color-dot"}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}

// ---------------- Tipos ----------------

function TypesTab({
  slug,
  types,
  api,
  flash,
}: {
  slug: string;
  projectId: string;
  types: IssueTypeRow[];
  api: (method: string, path: string, body?: object) => Promise<any>;
  flash: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PALETTE[0]);
  const [creating, setCreating] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api("POST", "/issue-types", { name, color });
      setName("");
      setColor(PALETTE[0]);
      flash("Tipo creado");
    } catch {
      /* error mostrado por api() */
    } finally {
      setCreating(false);
    }
  }

  async function remove(t: IssueTypeRow) {
    if (!confirm(`¿Eliminar el tipo "${t.name}"?`)) return;
    try {
      await api("DELETE", `/issue-types/${t.id}`);
      flash("Tipo eliminado");
    } catch {}
  }

  return (
    <div className="panel">
      <form onSubmit={create} className="config-create">
        <input className="input" placeholder="Nombre del tipo" value={name} required onChange={(e) => setName(e.target.value)} />
        <ColorDots value={color} onChange={setColor} />
        <button type="submit" className="btn btn-primary" disabled={creating}>
          {creating ? "..." : "Crear tipo"}
        </button>
      </form>
      <div className="config-list">
        {types.map((t) => (
          <EditRow key={t.id} name={t.name} color={t.color || PALETTE[0]} extra={t.icon || "circle"} locked={t.isDefault}
            onSave={async (n, c) => {
              await api("PATCH", `/issue-types/${t.id}`, { name: n, color: c });
              flash("Tipo actualizado");
            }}
            onDelete={t.isDefault ? undefined : () => remove(t)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------- Estados ----------------

function StatusesTab({
  slug,
  statuses,
  api,
  flash,
}: {
  slug: string;
  projectId: string;
  statuses: IssueStatusRow[];
  api: (method: string, path: string, body?: object) => Promise<any>;
  flash: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("TODO");
  const [color, setColor] = useState<string>(PALETTE[0]);
  const [creating, setCreating] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api("POST", "/statuses", { name, category, color });
      setName("");
      setCategory("TODO");
      setColor(PALETTE[0]);
      flash("Estado creado");
    } catch {
      /* error mostrado por api() */
    } finally {
      setCreating(false);
    }
  }

  async function remove(s: IssueStatusRow) {
    if (!confirm(`¿Eliminar el estado "${s.name}"?`)) return;
    try {
      await api("DELETE", `/statuses/${s.id}`);
      flash("Estado eliminado");
    } catch {}
  }

  return (
    <div className="panel">
      <form onSubmit={create} className="config-create">
        <input className="input" placeholder="Nombre del estado" value={name} required onChange={(e) => setName(e.target.value)} />
        <select className="input inline-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <ColorDots value={color} onChange={setColor} />
        <button type="submit" className="btn btn-primary" disabled={creating}>
          {creating ? "..." : "Crear estado"}
        </button>
      </form>
      <div className="config-list">
        {statuses.map((s) => (
          <EditRow key={s.id} name={s.name} color={s.color || PALETTE[0]} extra={CATEGORY_LABEL[s.category] || s.category} locked={s.isDefault}
            onSave={async (n, c) => {
              await api("PATCH", `/statuses/${s.id}`, { name: n, color: c });
              flash("Estado actualizado");
            }}
            onDelete={s.isDefault ? undefined : () => remove(s)}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------- Etiquetas ----------------

function LabelsTab({
  slug,
  labels,
  api,
  flash,
}: {
  slug: string;
  projectId: string;
  labels: LabelRow[];
  api: (method: string, path: string, body?: object) => Promise<any>;
  flash: (m: string) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(PALETTE[0]);
  const [creating, setCreating] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await api("POST", "/labels", { name, color });
      setName("");
      setColor(PALETTE[0]);
      flash("Etiqueta creada");
    } catch {
      /* error mostrado por api() */
    } finally {
      setCreating(false);
    }
  }

  async function remove(l: LabelRow) {
    if (!confirm(`¿Eliminar la etiqueta "${l.name}"?`)) return;
    try {
      await api("DELETE", `/labels/${l.id}`);
      flash("Etiqueta eliminada");
    } catch {}
  }

  return (
    <div className="panel">
      <form onSubmit={create} className="config-create">
        <input className="input" placeholder="Nombre de la etiqueta" value={name} required onChange={(e) => setName(e.target.value)} />
        <ColorDots value={color} onChange={setColor} />
        <button type="submit" className="btn btn-primary" disabled={creating}>
          {creating ? "..." : "Crear etiqueta"}
        </button>
      </form>
      <div className="config-list">
        {labels.map((l) => (
          <EditRow key={l.id} name={l.name} color={l.color || PALETTE[0]} extra="" locked={false}
            onSave={async (n, c) => {
              await api("PATCH", `/labels/${l.id}`, { name: n, color: c });
              flash("Etiqueta actualizada");
            }}
            onDelete={() => remove(l)}
          />
        ))}
        {labels.length === 0 && <div className="dash-empty">Sin etiquetas todavía.</div>}
      </div>
    </div>
  );
}

// ---------------- Fila editable ----------------

function EditRow({
  name,
  color,
  extra,
  locked,
  onSave,
  onDelete,
}: {
  name: string;
  color: string;
  extra?: string;
  locked?: boolean;
  onSave: (name: string, color: string) => Promise<void>;
  onDelete?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [n, setN] = useState(name);
  const [c, setC] = useState(color);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function save() {
    if (!n.trim()) return;
    setSaving(true);
    try {
      await onSave(n.trim(), c);
      setEditing(false);
    } catch {
      /* error mostrado por api() */
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="config-row editing">
        <span className="config-swatch" style={{ background: c }} />
        <input ref={inputRef} className="input config-name-input" value={n} onChange={(e) => setN(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
        <ColorDots value={c} onChange={setC} />
        <button type="button" className="btn btn-sm btn-primary" disabled={saving} onClick={save}>
          {saving ? "..." : "Guardar"}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setEditing(false)}>
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="config-row">
      <span className="config-swatch" style={{ background: color }} />
      <span className="config-name">{name}</span>
      {extra && <span className="config-extra">{extra}</span>}
      <span className="config-spacer" />
      {locked ? (
        <span className="badge dot">Defecto</span>
      ) : (
        <>
          <button type="button" className="btn btn-sm" onClick={() => { setN(name); setC(color); setEditing(true); }}>
            Editar
          </button>
          {onDelete && (
            <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>
              Eliminar
            </button>
          )}
        </>
      )}
    </div>
  );
}
