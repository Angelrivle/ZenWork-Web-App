"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal, initials } from "./modal";

export interface KanbanMember {
  id: string;
  name: string;
}
export interface KanbanCol {
  id: string;
  name: string;
  color?: string | null;
  cards: KanbanCard[];
}
export interface KanbanCard {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  assignee?: { id: string; name: string } | null;
  checklists?: Array<{
    id: string;
    title: string;
    items: Array<{ id: string; text: string; isChecked: boolean }>;
  }>;
}

export function KanbanBoard({
  slug,
  boardId,
  columns,
  members,
  canEdit,
}: {
  slug: string;
  boardId: string;
  columns: KanbanCol[];
  members: KanbanMember[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [cols, setCols] = useState<KanbanCol[]>(columns);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  const [openCard, setOpenCard] = useState<KanbanCard | null>(null);
  const [addingIn, setAddingIn] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const [filterText, setFilterText] = useState("");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");

  const displayCols = useMemo(() => {
    const text = filterText.trim().toLowerCase();
    if (!text && filterAssignee === "all") return cols;

    return cols.map((col) => ({
      ...col,
      cards: col.cards.filter((card) => {
        const matchesText =
          !text ||
          card.title.toLowerCase().includes(text) ||
          (card.description && card.description.toLowerCase().includes(text));
        const matchesAssignee =
          filterAssignee === "all" ||
          (filterAssignee === "unassigned"
            ? !card.assignee
            : card.assignee?.id === filterAssignee);
        return matchesText && matchesAssignee;
      }),
    }));
  }, [cols, filterText, filterAssignee]);

  async function onChange() {
    router.refresh();
  }

  async function createCard(columnId: string, title: string) {
    const res = await fetch(`/api/organizations/${slug}/boards/${boardId}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId, title }),
    });
    if (!res.ok) {
      alert("No se pudo crear la tarjeta");
      return;
    }
    const { data } = await res.json();
    setCols((prev) =>
      prev.map((c) =>
        c.id === columnId ? { ...c, cards: [...c.cards, data] } : c
      )
    );
  }

  function handleDrop(targetColumnId: string) {
    const cardId = dragging;
    setDragging(null);
    setOverCol(null);
    if (!cardId) return;

    let sourceCol = "";
    let moveCardData: KanbanCard | null = null;
    for (const c of cols) {
      const found = c.cards.find((card) => card.id === cardId);
      if (found) {
        sourceCol = c.id;
        moveCardData = found;
        break;
      }
    }
    if (!moveCardData) return;

    // Drop en la misma columna: no-ops (orden por servidor al actualizar)
    if (sourceCol === targetColumnId) {
      onChange();
      return;
    }

    // Optimistic update
    setCols((prev) =>
      prev.map((c) => {
        if (c.id === sourceCol) return { ...c, cards: c.cards.filter((card) => card.id !== cardId) };
        if (c.id === targetColumnId) return { ...c, cards: [...c.cards, moveCardData!] };
        return c;
      })
    );

    fetch(`/api/organizations/${slug}/boards/${boardId}/cards/${cardId}/move`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      // Sin position: el servidor la calcula (posición fraccional al final
      // de la columna) en vez de recibir un valor arbitrario del cliente.
      body: JSON.stringify({ columnId: targetColumnId }),
    })
      .then((r) => {
        if (!r.ok) onChange();
      })
      .catch(() => onChange());
  }

  function handleAddSubmit(e: FormEvent) {
    e.preventDefault();
    if (!addingIn || !newTitle.trim()) return;
    createCard(addingIn, newTitle.trim());
    setNewTitle("");
    setAddingIn(null);
  }

  function cardDone(card: KanbanCard): number | null {
    const cl = card.checklists;
    if (!cl || cl.length === 0) return null;
    const all = cl.flatMap((l) => l.items);
    if (all.length === 0) return null;
    const done = all.filter((i) => i.isChecked).length;
    return Math.round((done / all.length) * 100);
  }

  const totalTasksCount = useMemo(() => {
    return cols.reduce((sum, c) => sum + c.cards.length, 0);
  }, [cols]);

  return (
    <div className="flex flex-col w-full">
      {/* Stitch Filter & Controls Header */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-space-md py-space-md px-space-xl bg-surface-dim border-b border-outline-variant/20">
        <div className="flex flex-1 items-center gap-space-md max-w-2xl">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              filter_list
            </span>
            <input
              type="text"
              placeholder="Filtrar tarjetas por título o descripción..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full h-9 pl-9 pr-space-md bg-surface border border-outline-variant/40 text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:border-primary-container focus:outline-none transition-colors"
            />
          </div>
          <div className="relative w-56">
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="w-full h-9 px-space-md bg-surface border border-outline-variant/40 text-on-surface font-body-sm text-body-sm focus:border-primary-container focus:outline-none appearance-none cursor-pointer pr-8"
            >
              <option value="all">Todos los miembros</option>
              <option value="unassigned">Sin asignar</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px] pointer-events-none">
              expand_more
            </span>
          </div>
          {(filterText || filterAssignee !== "all") && (
            <button
              type="button"
              className="text-primary text-body-sm hover:underline px-2"
              onClick={() => {
                setFilterText("");
                setFilterAssignee("all");
              }}
            >
              Limpiar
            </button>
          )}
        </div>

        <div className="flex items-center gap-space-md justify-between lg:justify-end text-outline font-label-sm text-label-sm">
          <div className="flex items-center gap-space-xs">
            <span className="w-2 h-2 bg-primary-container"></span>
            <span className="text-on-surface-variant font-code uppercase">
              {totalTasksCount} TARJETAS EN TOTAL
            </span>
          </div>
        </div>
      </div>

      {/* Board Scroll Area */}
      <div className="p-space-xl overflow-x-auto bg-background min-h-[calc(100vh-14rem)]">
        <div className="flex gap-space-lg items-start min-w-[1000px]">
          {displayCols.map((col) => {
            const doneTotal = col.cards.reduce((sum, c) => {
              const d = cardDone(c);
              return sum + (d ?? 0);
            }, 0);
            const overall = col.cards.length
              ? Math.round(doneTotal / (col.cards.length * 100) * 100)
              : 0;

            return (
              <div
                key={col.id}
                className={`w-80 flex-shrink-0 bg-surface-container-low border border-outline-variant/30 flex flex-col shadow-sm transition-all ${
                  overCol === col.id ? "ring-2 ring-primary-container bg-surface-container" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverCol(col.id);
                }}
                onDragLeave={() => setOverCol((prev) => (prev === col.id ? null : prev))}
                onDrop={() => handleDrop(col.id)}
              >
                {/* Column Head */}
                <div className="p-space-md border-b border-outline-variant/20 flex items-center justify-between bg-surface-dim">
                  <div className="flex items-center gap-space-xs">
                    <span
                      className="w-2 h-2"
                      style={{ backgroundColor: col.color || "#2d56cf" }}
                    />
                    <h2 className="font-headline-sm text-headline-sm text-on-surface font-medium">
                      {col.name}
                    </h2>
                    <span className="font-code text-label-sm px-space-xs py-space-2xs bg-surface-variant text-on-surface-variant leading-none ml-space-xs">
                      {col.cards.length}
                    </span>
                  </div>
                  {overall > 0 && (
                    <span className="font-code text-label-sm text-outline">{overall}%</span>
                  )}
                </div>

                {/* Cards Container */}
                <div className="p-space-sm space-y-space-sm flex flex-col min-h-[100px]">
                  {col.cards.map((card) => {
                    const pct = cardDone(card);
                    return (
                      <div
                        key={card.id}
                        className={`group p-space-md bg-surface hover:bg-surface-container-high border border-outline-variant/40 hover:border-outline-variant/80 transition-all cursor-pointer shadow-sm ${
                          dragging === card.id ? "opacity-40" : ""
                        }`}
                        draggable={canEdit}
                        onDragStart={() => canEdit && setDragging(card.id)}
                        onDragEnd={() => setDragging(null)}
                        onClick={() => setOpenCard(card)}
                      >
                        <div className="flex items-center justify-between gap-space-xs mb-space-xs">
                          <span className="font-code text-label-sm text-outline group-hover:text-primary transition-colors">
                            CARD
                          </span>
                          {card.dueDate && (
                            <span className="font-code text-label-sm text-outline flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                              <span>
                                {new Date(card.dueDate).toLocaleDateString("es-ES", {
                                  day: "2-digit",
                                  month: "short",
                                })}
                              </span>
                            </span>
                          )}
                        </div>

                        <h3 className="font-body-md text-body-md text-on-surface mb-space-sm leading-snug font-medium">
                          {card.title}
                        </h3>

                        {card.description && (
                          <p className="font-body-sm text-body-sm text-outline line-clamp-2 mb-space-sm">
                            {card.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-space-xs border-t border-outline-variant/20">
                          {pct !== null ? (
                            <div className="flex items-center gap-2 flex-1 mr-space-sm">
                              <div className="h-1.5 flex-1 bg-surface-container-high overflow-hidden">
                                <div
                                  className="h-full bg-primary-container"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-code text-label-sm text-outline">{pct}%</span>
                            </div>
                          ) : (
                            <span />
                          )}

                          {card.assignee && (
                            <div
                              className="w-6 h-6 bg-surface-variant border border-outline-variant text-on-surface font-code text-label-sm flex items-center justify-center font-bold"
                              title={card.assignee.name}
                            >
                              {initials(card.assignee.name)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Add Card Footer */}
                {canEdit && (
                  <div className="p-space-sm pt-0">
                    {addingIn === col.id ? (
                      <form onSubmit={handleAddSubmit} className="space-y-space-xs bg-surface p-space-sm border border-primary-container shadow-md">
                        <textarea
                          className="w-full bg-surface-container-low border border-outline-variant/50 text-on-surface p-2 text-body-sm focus:outline-none focus:border-primary-container resize-none"
                          autoFocus
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleAddSubmit(e);
                            }
                            if (e.key === "Escape") {
                              setAddingIn(null);
                            }
                          }}
                          placeholder="Escribe el título de la tarjeta y presiona Enter..."
                          rows={2}
                        />
                        <div className="flex items-center justify-between gap-space-xs">
                          <button
                            type="submit"
                            disabled={!newTitle.trim()}
                            className="bg-primary-container hover:bg-inverse-primary disabled:opacity-50 text-white px-space-md py-1 text-body-sm font-medium transition-colors"
                          >
                            Añadir tarjeta
                          </button>
                          <button
                            type="button"
                            className="px-2 py-1 bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface text-body-sm transition-colors"
                            onClick={() => setAddingIn(null)}
                          >
                            Cancelar
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setAddingIn(col.id);
                          setNewTitle("");
                        }}
                        className="w-full py-2 px-space-sm border border-dashed border-outline-variant/40 hover:border-primary text-outline hover:text-primary font-body-sm text-body-sm flex items-center justify-center gap-space-xs transition-colors bg-surface-container-low hover:bg-surface-container"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        <span>Añadir tarjeta</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {openCard && (
        <CardModal
          slug={slug}
          boardId={boardId}
          card={openCard}
          members={members}
          canEdit={canEdit}
          onClose={() => setOpenCard(null)}
          onChanged={onChange}
        />
      )}
    </div>
  );
}

function CardModal({
  slug,
  boardId,
  card,
  members,
  canEdit,
  onClose,
  onChanged,
}: {
  slug: string;
  boardId: string;
  card: KanbanCard;
  members: KanbanMember[];
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [assigneeId, setAssigneeId] = useState(card.assignee?.id || "");
  const [dueDate, setDueDate] = useState(card.dueDate ? card.dueDate.slice(0, 10) : "");
  const [checklists, setChecklists] = useState(card.checklists || []);
  const [newChecklist, setNewChecklist] = useState("");
  const [newItem, setNewItem] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(patch: Record<string, unknown>) {
    if (!canEdit) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/organizations/${slug}/boards/${boardId}/cards/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error guardando");
    } else {
      onChanged();
    }
    setSaving(false);
  }

  async function createChecklist(e: FormEvent) {
    e.preventDefault();
    if (!newChecklist.trim()) return;
    const res = await fetch(`/api/organizations/${slug}/boards/${boardId}/cards/${card.id}/checklists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newChecklist.trim() }),
    });
    if (res.ok) {
      const { data } = await res.json();
      setChecklists((prev) => [...prev, data]);
      setNewChecklist("");
      onChanged();
    }
  }

  async function addItem(checklistId: string) {
    const text = (newItem[checklistId] || "").trim();
    if (!text) return;
    const res = await fetch(
      `/api/organizations/${slug}/boards/${boardId}/cards/${card.id}/checklists/${checklistId}/items`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }
    );
    if (res.ok) {
      const { data } = await res.json();
      setChecklists((prev) =>
        prev.map((l) => (l.id === checklistId ? { ...l, items: [...l.items, data] } : l))
      );
      setNewItem((prev) => ({ ...prev, [checklistId]: "" }));
      onChanged();
    }
  }

  async function toggleItem(checklistId: string, itemId: string, isChecked: boolean) {
    setChecklists((prev) =>
      prev.map((l) => ({
        ...l,
        items: l.items.map((i) => (i.id === itemId ? { ...i, isChecked } : i)),
      }))
    );
    const res = await fetch(
      `/api/organizations/${slug}/boards/${boardId}/cards/${card.id}/checklists/${checklistId}/items/${itemId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isChecked }),
      }
    );
    onChanged();
    if (!res.ok) {
      // revert on failure
      setChecklists((prev) =>
        prev.map((l) => ({
          ...l,
          items: l.items.map((i) => (i.id === itemId ? { ...i, isChecked: !isChecked } : i)),
        }))
      );
    }
  }

  async function deleteCard() {
    if (!confirm("¿Eliminar esta tarjeta?")) return;
    const res = await fetch(`/api/organizations/${slug}/boards/${boardId}/cards/${card.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      onChanged();
      onClose();
    }
  }

  return (
    <Modal
      open
      title="Tarjeta"
      onClose={onClose}
      footer={
        canEdit ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={deleteCard}>
              Eliminar
            </button>
            <button type="button" className="btn btn-primary" onClick={() => save({ title, description, assigneeId: assigneeId || null, dueDate: dueDate ? new Date(dueDate).toISOString() : null })} disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </>
        ) : undefined
      }
    >
      {error && <div className="error">{error}</div>}
      <div className="field">
        <label>Título</label>
        <input className="input" value={title} disabled={!canEdit} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>Descripción</label>
        <textarea
          className="input"
          rows={4}
          disabled={!canEdit}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalles de la tarjeta..."
        />
      </div>
      <div className="field-row">
        <div className="field">
          <label>Responsable</label>
          <select value={assigneeId} disabled={!canEdit} onChange={(e) => setAssigneeId(e.target.value)}>
            <option value="">Sin asignar</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Vencimiento</label>
          <input type="date" className="input" disabled={!canEdit} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border-soft)", marginTop: 8, paddingTop: 16 }}>
        <div className="panel-title">Listas de tareas</div>
        {checklists.length === 0 && (
          <p style={{ color: "var(--text-3)", fontSize: 13, margin: 0 }}>Sin listas de tareas.</p>
        )}
        {checklists.map((list) => {
          const total = list.items.length;
          const done = list.items.filter((i) => i.isChecked).length;
          return (
            <div key={list.id} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <strong style={{ fontSize: 13.5 }}>{list.title}</strong>
                {total > 0 && (
                  <span className="task-progress">
                    <span className="bar">
                      <i style={{ width: `${Math.round((done / total) * 100)}%` }} />
                    </span>
                    {done}/{total}
                  </span>
                )}
              </div>
              {list.items.map((item) => (
                <label
                  key={item.id}
                  style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0", cursor: canEdit ? "pointer" : "default", fontSize: 13.5 }}
                >
                  <input
                    type="checkbox"
                    checked={item.isChecked}
                    disabled={!canEdit}
                    onChange={(e) => toggleItem(list.id, item.id, e.target.checked)}
                  />
                  <span style={{ textDecoration: item.isChecked ? "line-through" : "none", opacity: item.isChecked ? 0.6 : 1 }}>
                    {item.text}
                  </span>
                </label>
              ))}
              {canEdit && (
                <form
                  style={{ display: "flex", gap: 6, marginTop: 4 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    addItem(list.id);
                  }}
                >
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    placeholder="Nueva tarea..."
                    value={newItem[list.id] || ""}
                    onChange={(e) => setNewItem((prev) => ({ ...prev, [list.id]: e.target.value }))}
                  />
                  <button type="submit" className="btn btn-outline btn-sm">
                    +
                  </button>
                </form>
              )}
            </div>
          );
        })}
        {canEdit && (
          <form onSubmit={createChecklist} style={{ display: "flex", gap: 6 }}>
            <input
              className="input"
              style={{ flex: 1 }}
              placeholder="Nueva lista de tareas..."
              value={newChecklist}
              onChange={(e) => setNewChecklist(e.target.value)}
            />
            <button type="submit" className="btn btn-outline btn-sm">
              Añadir lista
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}