"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function IssueFilters({
  basePath,
  statuses,
  members,
  current,
}: {
  basePath: string;
  statuses: { id: string; name: string }[];
  members: { id: string; name: string }[];
  current: { search: string; statusId: string; priority: string; assigneeId: string };
}) {
  const router = useRouter();
  const [search, setSearch] = useState(current.search);

  function apply(next: Partial<typeof current>) {
    const merged = { ...current, ...next };
    const params = new URLSearchParams();
    if (merged.search.trim()) params.set("search", merged.search.trim());
    if (merged.statusId) params.set("statusId", merged.statusId);
    if (merged.priority) params.set("priority", merged.priority);
    if (merged.assigneeId) params.set("assigneeId", merged.assigneeId);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    apply({ search });
  }

  return (
    <div className="dash-toolbar" style={{ marginBottom: 14 }}>
      <form className="actions" onSubmit={handleSubmit} style={{ flex: 1, display: "flex", gap: 8 }}>
        <input
          className="input"
          style={{ maxWidth: 240 }}
          placeholder="Buscar issue..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-outline btn-sm">
          Buscar
        </button>
      </form>
      <div className="actions">
        <select
          className="inline-select"
          value={current.statusId}
          onChange={(e) => apply({ statusId: e.target.value })}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          className="inline-select"
          value={current.priority}
          onChange={(e) => apply({ priority: e.target.value })}
          aria-label="Filtrar por prioridad"
        >
          <option value="">Toda prioridad</option>
          <option value="LOW">Baja</option>
          <option value="MEDIUM">Media</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Crítica</option>
          <option value="BLOCKER">Bloqueante</option>
        </select>
        <select
          className="inline-select"
          value={current.assigneeId}
          onChange={(e) => apply({ assigneeId: e.target.value })}
          aria-label="Filtrar por responsable"
        >
          <option value="">Todos</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}