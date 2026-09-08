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

  function clearAll() {
    setSearch("");
    router.push(basePath);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    apply({ search });
  }

  return (
    <section className="bg-surface-container-low border-b border-outline-variant/30 px-space-xl py-space-md">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md">
        {/* Search Input & Quick Button */}
        <form onSubmit={handleSubmit} className="flex items-stretch gap-space-xs max-w-lg w-full">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-space-sm top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              className="w-full h-9 pl-9 pr-space-md bg-surface border border-outline-variant/50 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container transition-colors"
              placeholder="Buscar issue por resumen o clave..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="text"
            />
          </div>
          <button
            className="h-9 px-space-lg bg-surface-container border border-outline-variant/50 hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
            type="submit"
          >
            Buscar
          </button>
        </form>

        {/* Filter Dropdowns Matrix */}
        <div className="flex items-center gap-space-xs flex-wrap">
          {/* Status Dropdown */}
          <div className="relative">
            <select
              className="appearance-none h-9 pl-space-md pr-8 bg-surface border border-outline-variant/50 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
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
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-[16px] pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Priority Dropdown */}
          <div className="relative">
            <select
              className="appearance-none h-9 pl-space-md pr-8 bg-surface border border-outline-variant/50 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
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
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-[16px] pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Assignee Dropdown */}
          <div className="relative">
            <select
              className="appearance-none h-9 pl-space-md pr-8 bg-surface border border-outline-variant/50 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary-container cursor-pointer"
              value={current.assigneeId}
              onChange={(e) => apply({ assigneeId: e.target.value })}
              aria-label="Filtrar por responsable"
            >
              <option value="">Todos los asignados</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline text-[16px] pointer-events-none">
              expand_more
            </span>
          </div>

          <button
            className="h-9 w-9 flex items-center justify-center bg-surface border border-outline-variant/50 hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors cursor-pointer"
            title="Restablecer filtros"
            type="button"
            onClick={clearAll}
          >
            <span className="material-symbols-outlined text-[18px]">filter_alt_off</span>
          </button>
        </div>
      </div>
    </section>
  );
}