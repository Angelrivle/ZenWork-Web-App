"use client";

import { FormEvent, useState } from "react";
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

  return (
    <>
      <div className="kanban">
        {cols.map((col) => {
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
              className={`kanban-col ${overCol === col.id ? "dragover" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.id);
              }}
              onDragLeave={() => setOverCol((prev) => (prev === col.id ? null : prev))}
              onDrop={() => handleDrop(col.id)}
            >
              <div className="kanban-col-head">
                <strong>
                  {col.color && <span className="badge dot" style={{ color: col.color }} />}
                  {col.name}
                  <span className="count">{col.cards.length}</span>
                </strong>
                {overall > 0 && <span className="count">{overall}%</span>}
              </div>

              {col.cards.map((card) => {
                const pct = cardDone(card);
                return (
                  <div
                    key={card.id}
                    className={`kanban-card ${dragging === card.id ? "dragging" : ""}`}
                    draggable={canEdit}
                    onDragStart={() => canEdit && setDragging(card.id)}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => setOpenCard(card)}
                  >
                    <h4>{card.title}</h4>
                    <div className="kanban-card-foot">
                      {pct !== null ? (
                        <span className="task-progress">
                          <span className="bar">
                            <i style={{ width: `${pct}%` }} />
                          </span>
                          {pct}%
                        </span>
                      ) : (
                        <span />
                      )}
                      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {card.dueDate && (
                          <span title="Vence" style={{ color: "var(--text-3)", fontSize: 12 }}>
                            {new Date(card.dueDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                        {card.assignee && (
                          <span className="avatar" title={card.assignee.name}>
                            {initials(card.assignee.name)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}

              {addingIn === col.id ? (
                <form onSubmit={handleAddSubmit} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <textarea
                    className="input"
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Título de la tarjeta..."
                    rows={2}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="submit" className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                      Añadir
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddingIn(null)}>
                      ×
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  className="kanban-card-add"
                  onClick={() => setAddingIn(col.id)}
                  style={{ cursor: canEdit ? "pointer" : "not-allowed", opacity: canEdit ? 1 : 0.5 }}
                  disabled={!canEdit}
                >
                  + Añadir tarjeta
                </button>
              )}
            </div>
          );
        })}
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
    </>
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