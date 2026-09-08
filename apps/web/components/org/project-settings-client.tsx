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
    <div className="w-full">
      {notice && (
        <div className="max-w-6xl mx-auto my-space-md p-space-md bg-emerald-500/10 border border-emerald-500 text-emerald-400 font-body-sm text-body-sm flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{notice}</span>
        </div>
      )}
      {error && (
        <div className="max-w-6xl mx-auto my-space-md p-space-md bg-error/10 border border-error text-error font-body-sm text-body-sm flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Horizontal Tab Navigation Bar (Stitch) */}
      <div className="w-full bg-surface-dim border-b border-outline-variant/30">
        <div className="max-w-6xl mx-auto px-space-2xl flex items-center overflow-x-auto">
          <button
            type="button"
            className={`px-space-lg py-space-md font-body-md text-body-md font-medium flex items-center gap-space-xs whitespace-nowrap transition-colors cursor-pointer ${
              tab === "ajustes"
                ? "text-on-surface bg-surface-container-low shadow-[inset_0_-2px_0_0_#2d56cf]"
                : "text-outline hover:text-on-surface hover:bg-surface-container-low/50"
            }`}
            onClick={() => setTab("ajustes")}
          >
            <span className="material-symbols-outlined text-[18px] text-primary">tune</span>
            <span>Ajustes generales</span>
          </button>
          <button
            type="button"
            className={`px-space-lg py-space-md font-body-md text-body-md font-medium flex items-center gap-space-xs whitespace-nowrap transition-colors cursor-pointer ${
              tab === "tipos"
                ? "text-on-surface bg-surface-container-low shadow-[inset_0_-2px_0_0_#2d56cf]"
                : "text-outline hover:text-on-surface hover:bg-surface-container-low/50"
            }`}
            onClick={() => setTab("tipos")}
          >
            <span className="material-symbols-outlined text-[18px]">task_alt</span>
            <span>Tipos de issue</span>
            <span className="font-code text-label-sm px-space-2xs bg-surface-container-high text-outline">
              {types.length}
            </span>
          </button>
          <button
            type="button"
            className={`px-space-lg py-space-md font-body-md text-body-md font-medium flex items-center gap-space-xs whitespace-nowrap transition-colors cursor-pointer ${
              tab === "estados"
                ? "text-on-surface bg-surface-container-low shadow-[inset_0_-2px_0_0_#2d56cf]"
                : "text-outline hover:text-on-surface hover:bg-surface-container-low/50"
            }`}
            onClick={() => setTab("estados")}
          >
            <span className="material-symbols-outlined text-[18px]">alt_route</span>
            <span>Estados del flujo</span>
            <span className="font-code text-label-sm px-space-2xs bg-surface-container-high text-outline">
              {statuses.length}
            </span>
          </button>
          <button
            type="button"
            className={`px-space-lg py-space-md font-body-md text-body-md font-medium flex items-center gap-space-xs whitespace-nowrap transition-colors cursor-pointer ${
              tab === "etiquetas"
                ? "text-on-surface bg-surface-container-low shadow-[inset_0_-2px_0_0_#2d56cf]"
                : "text-outline hover:text-on-surface hover:bg-surface-container-low/50"
            }`}
            onClick={() => setTab("etiquetas")}
          >
            <span className="material-symbols-outlined text-[18px]">label</span>
            <span>Etiquetas</span>
            <span className="font-code text-label-sm px-space-2xs bg-surface-container-high text-outline">
              {labels.length}
            </span>
          </button>
        </div>
      </div>

      <div className="w-full px-space-2xl py-space-2xl">
        <div className="max-w-6xl mx-auto space-y-space-2xl">
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
      </div>
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
  const [form, setForm] = useState({
    name: initial.name,
    key: initial.key,
    description: initial.description || "",
    status: initial.status,
  });
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
      flash("Ajustes guardados correctamente");
    } catch {
      /* error mostrado por api() */
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl items-start">
      <form onSubmit={save} className="lg:col-span-8 bg-surface-container-low p-space-xl space-y-space-xl border border-outline-variant/30">
        <div className="space-y-space-2xs">
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Parámetros Esenciales</h2>
          <p className="font-body-md text-body-md text-outline">
            Identificación unívoca del proyecto en el workspace y configuración de claves operativas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
          {/* Nombre */}
          <div className="md:col-span-2 space-y-space-xs">
            <label className="block font-label-md text-label-md text-on-surface uppercase tracking-wide">
              Nombre del proyecto <span className="text-primary">*</span>
            </label>
            <input
              className="w-full h-10 px-space-md bg-surface text-on-surface font-body-md text-body-md border border-outline-variant/40 focus:outline-none focus:border-primary-container transition-colors"
              value={form.name}
              minLength={2}
              required
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <span className="block font-label-sm text-label-sm text-outline">
              Visible en todos los tableros y paneles ejecutivos.
            </span>
          </div>

          {/* Key */}
          <div className="space-y-space-xs">
            <label className="block font-label-md text-label-md text-on-surface uppercase tracking-wide">
              Key / Clave <span className="text-primary">*</span>
            </label>
            <div className="relative">
              <input
                className="w-full h-10 px-space-md font-code text-body-md text-primary font-bold bg-surface border border-outline-variant/40 focus:outline-none focus:border-primary-container uppercase"
                value={form.key}
                minLength={2}
                maxLength={10}
                required
                onChange={(e) => setForm({ ...form, key: e.target.value.toUpperCase() })}
              />
              <span className="absolute right-3 top-2.5 font-label-sm text-label-sm text-outline pointer-events-none">
                PREFIX
              </span>
            </div>
            <span className="block font-label-sm text-label-sm text-outline">
              Prefijo para tickets (ej. ZEN-104).
            </span>
          </div>
        </div>

        {/* Descripción */}
        <div className="space-y-space-xs">
          <label className="block font-label-md text-label-md text-on-surface uppercase tracking-wide">
            Descripción
          </label>
          <textarea
            className="w-full p-space-md bg-surface text-on-surface font-body-md text-body-md border border-outline-variant/40 focus:outline-none focus:border-primary-container transition-colors resize-none leading-relaxed"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe el propósito y alcance de este proyecto..."
          />
        </div>

        {/* Estado Operativo */}
        <div className="space-y-space-xs">
          <label className="block font-label-md text-label-md text-on-surface uppercase tracking-wide">
            Estado Operativo
          </label>
          <div className="relative">
            <select
              className="w-full h-10 px-space-md pr-10 bg-surface text-on-surface font-body-md text-body-md border border-outline-variant/40 appearance-none focus:outline-none focus:border-primary-container cursor-pointer"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ACTIVE">Activo (En ejecución)</option>
              <option value="ARCHIVED">Archivado / En pausa</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-2.5 text-outline pointer-events-none text-[20px]">
              expand_more
            </span>
          </div>
          <span className="block font-label-sm text-label-sm text-outline">
            Determina visibilidad en el menú lateral y reportes activos.
          </span>
        </div>

        {/* Actions Bar */}
        <div className="pt-space-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-md bg-surface-container p-space-md border border-outline-variant/20">
          <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline">
            <span className="material-symbols-outlined text-[16px] text-primary">cloud_done</span>
            <span>Configuración sincronizada</span>
          </div>
          <button
            type="submit"
            className="h-10 px-space-xl bg-primary-container hover:bg-inverse-primary text-on-surface font-body-md text-body-md font-medium tracking-wide transition-all shadow-md flex items-center justify-center gap-space-xs cursor-pointer"
            disabled={saving}
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>{saving ? "Guardando..." : "Guardar cambios"}</span>
          </button>
        </div>
      </form>

      {/* Right Column: Information Panel (Stitch) */}
      <div className="lg:col-span-4 space-y-space-lg">
        <div className="bg-surface-container-low p-space-lg space-y-space-md border border-outline-variant/30">
          <div className="flex items-center gap-space-xs text-primary">
            <span className="material-symbols-outlined text-[18px]">info</span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-medium">Acerca del Proyecto</h3>
          </div>
          <p className="font-body-sm text-body-sm text-outline leading-relaxed">
            Las opciones del proyecto permiten cambiar la clave de emisión de incidencias, los estados personalizados del flujo de trabajo y las etiquetas globales.
          </p>
          <div className="p-space-sm bg-surface-container border border-outline-variant/20 space-y-space-2xs font-code text-label-sm text-outline">
            <div>ORGANIZACIÓN: <span className="text-on-surface uppercase">{slug}</span></div>
            <div>TIPO: <span className="text-primary uppercase">KANBAN + SCRUM</span></div>
          </div>
        </div>
      </div>
    </div>
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
      flash("Tipo de issue creado");
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
    <div className="bg-surface-container-low p-space-xl border border-outline-variant/30 space-y-space-lg">
      <div className="space-y-space-2xs">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Tipos de Incidencia</h2>
        <p className="font-body-md text-body-md text-outline">
          Define categorías como Tareas, Bugs o Historias con sus respectivos identificadores visuales.
        </p>
      </div>

      <form onSubmit={create} className="flex flex-wrap items-center gap-space-md p-space-md bg-surface border border-outline-variant/30">
        <input
          className="h-10 px-space-md bg-surface-container text-on-surface font-body-md text-body-md border border-outline-variant/40 focus:outline-none focus:border-primary-container flex-1 min-w-[200px]"
          placeholder="Nombre del tipo (ej. Tarea, Bug...)"
          value={name}
          required
          onChange={(e) => setName(e.target.value)}
        />
        <ColorDots value={color} onChange={setColor} />
        <button
          type="submit"
          className="h-10 px-space-lg bg-primary-container hover:bg-inverse-primary text-on-surface font-body-md text-body-md font-medium transition-colors flex items-center gap-space-xs cursor-pointer"
          disabled={creating}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>{creating ? "Creando..." : "Crear tipo"}</span>
        </button>
      </form>

      <div className="divide-y divide-outline-variant/20 border border-outline-variant/30 bg-surface">
        {types.map((t) => (
          <EditRow
            key={t.id}
            name={t.name}
            color={t.color || PALETTE[0]}
            extra={t.icon || "circle"}
            locked={t.isDefault}
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
      flash("Estado de flujo creado");
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
    <div className="bg-surface-container-low p-space-xl border border-outline-variant/30 space-y-space-lg">
      <div className="space-y-space-2xs">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Estados del Flujo</h2>
        <p className="font-body-md text-body-md text-outline">
          Configura las columnas y fases por las que transicionan las tareas en los tableros.
        </p>
      </div>

      <form onSubmit={create} className="flex flex-wrap items-center gap-space-md p-space-md bg-surface border border-outline-variant/30">
        <input
          className="h-10 px-space-md bg-surface-container text-on-surface font-body-md text-body-md border border-outline-variant/40 focus:outline-none focus:border-primary-container flex-1 min-w-[200px]"
          placeholder="Nombre del estado"
          value={name}
          required
          onChange={(e) => setName(e.target.value)}
        />
        <div className="relative">
          <select
            className="h-10 px-space-md pr-8 bg-surface-container text-on-surface font-body-md text-body-md border border-outline-variant/40 appearance-none focus:outline-none cursor-pointer"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2 top-2.5 text-outline pointer-events-none text-[18px]">
            expand_more
          </span>
        </div>
        <ColorDots value={color} onChange={setColor} />
        <button
          type="submit"
          className="h-10 px-space-lg bg-primary-container hover:bg-inverse-primary text-on-surface font-body-md text-body-md font-medium transition-colors flex items-center gap-space-xs cursor-pointer"
          disabled={creating}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>{creating ? "Creando..." : "Crear estado"}</span>
        </button>
      </form>

      <div className="divide-y divide-outline-variant/20 border border-outline-variant/30 bg-surface">
        {statuses.map((s) => (
          <EditRow
            key={s.id}
            name={s.name}
            color={s.color || PALETTE[0]}
            extra={CATEGORY_LABEL[s.category] || s.category}
            locked={s.isDefault}
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
    <div className="bg-surface-container-low p-space-xl border border-outline-variant/30 space-y-space-lg">
      <div className="space-y-space-2xs">
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Etiquetas Globales</h2>
        <p className="font-body-md text-body-md text-outline">
          Etiquetas para organizar y filtrar issues por tema, módulo o sprint.
        </p>
      </div>

      <form onSubmit={create} className="flex flex-wrap items-center gap-space-md p-space-md bg-surface border border-outline-variant/30">
        <input
          className="h-10 px-space-md bg-surface-container text-on-surface font-body-md text-body-md border border-outline-variant/40 focus:outline-none focus:border-primary-container flex-1 min-w-[200px]"
          placeholder="Nombre de la etiqueta"
          value={name}
          required
          onChange={(e) => setName(e.target.value)}
        />
        <ColorDots value={color} onChange={setColor} />
        <button
          type="submit"
          className="h-10 px-space-lg bg-primary-container hover:bg-inverse-primary text-on-surface font-body-md text-body-md font-medium transition-colors flex items-center gap-space-xs cursor-pointer"
          disabled={creating}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>{creating ? "Creando..." : "Crear etiqueta"}</span>
        </button>
      </form>

      <div className="divide-y divide-outline-variant/20 border border-outline-variant/30 bg-surface">
        {labels.map((l) => (
          <EditRow
            key={l.id}
            name={l.name}
            color={l.color || PALETTE[0]}
            extra=""
            locked={false}
            onSave={async (n, c) => {
              await api("PATCH", `/labels/${l.id}`, { name: n, color: c });
              flash("Etiqueta actualizada");
            }}
            onDelete={() => remove(l)}
          />
        ))}
        {labels.length === 0 && (
          <div className="p-space-xl text-center text-outline font-body-sm">
            Sin etiquetas todavía. Crea una para categorizar issues.
          </div>
        )}
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
      <div className="p-space-md flex flex-wrap items-center gap-space-md bg-surface-container-high border border-primary">
        <span className="w-3.5 h-3.5 inline-block shrink-0" style={{ background: c }} />
        <input
          ref={inputRef}
          className="h-9 px-space-sm bg-surface text-on-surface font-body-sm text-body-sm border border-outline-variant/50 focus:outline-none focus:border-primary-container"
          value={n}
          onChange={(e) => setN(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <ColorDots value={c} onChange={setC} />
        <div className="flex items-center gap-space-xs ml-auto">
          <button
            type="button"
            className="h-8 px-space-md bg-primary-container hover:bg-inverse-primary text-on-surface font-body-sm text-body-sm transition-colors cursor-pointer"
            disabled={saving}
            onClick={save}
          >
            {saving ? "..." : "Guardar"}
          </button>
          <button
            type="button"
            className="h-8 px-space-md bg-surface hover:bg-surface-container text-outline hover:text-on-surface font-body-sm text-body-sm border border-outline-variant/40 transition-colors cursor-pointer"
            onClick={() => setEditing(false)}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-space-md flex items-center gap-space-md hover:bg-surface-container-low transition-colors">
      <span className="w-3.5 h-3.5 inline-block shrink-0" style={{ background: color }} />
      <span className="font-body-md text-body-md text-on-surface font-medium">{name}</span>
      {extra && (
        <span className="font-code text-label-sm px-space-xs py-space-2xs bg-surface-container border border-outline-variant/30 text-outline uppercase">
          {extra}
        </span>
      )}
      <span className="flex-1" />
      {locked ? (
        <span className="font-code text-label-sm text-outline border border-outline-variant/30 px-space-xs py-space-2xs">
          Defecto
        </span>
      ) : (
        <div className="flex items-center gap-space-xs">
          <button
            type="button"
            className="h-8 px-space-sm bg-surface hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm border border-outline-variant/40 transition-colors cursor-pointer"
            onClick={() => {
              setN(name);
              setC(color);
              setEditing(true);
            }}
          >
            Editar
          </button>
          {onDelete && (
            <button
              type="button"
              className="h-8 px-space-sm bg-surface hover:bg-error/20 text-error font-body-sm text-body-sm border border-error/40 transition-colors cursor-pointer"
              onClick={onDelete}
            >
              Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
