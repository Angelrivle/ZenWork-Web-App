"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Proyectos" | "Tableros" | "Documentos" | "Navegación" | "Acciones";
  icon?: string;
  href?: string;
  onSelect?: () => void;
}

export function CommandPalette({
  slug,
  projects,
  boards,
  documents,
}: {
  slug: string;
  projects: Array<{ id: string; name: string; key: string }>;
  boards: Array<{ id: string; name: string }>;
  documents: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Escuchar Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Enfocar input al abrir
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Construir catálogo de elementos
  const items: PaletteItem[] = useMemo(() => {
    const list: PaletteItem[] = [
      // Navegación fija
      {
        id: "nav-overview",
        title: "Inicio del Workspace",
        subtitle: "Resumen de proyectos y actividad",
        category: "Navegación",
        href: `/organizations/${slug}`,
      },
      {
        id: "nav-chat",
        title: "Chat del Equipo",
        subtitle: "Mensajería y presencia en tiempo real",
        category: "Navegación",
        href: `/organizations/${slug}/chat`,
      },
      {
        id: "nav-members",
        title: "Gestión de Miembros e Invitaciones",
        subtitle: "Administrar roles y usuarios del equipo",
        category: "Navegación",
        href: `/organizations/${slug}/members`,
      },
      {
        id: "nav-analytics",
        title: "Analíticas y Productividad",
        subtitle: "Métricas de issues y progreso",
        category: "Navegación",
        href: `/organizations/${slug}/analytics`,
      },
    ];

    // Proyectos
    projects.forEach((p) => {
      list.push({
        id: `project-${p.id}`,
        title: p.name,
        subtitle: `Proyecto [${p.key}]`,
        category: "Proyectos",
        href: `/organizations/${slug}/projects/${p.id}`,
      });
    });

    // Tableros
    boards.forEach((b) => {
      list.push({
        id: `board-${b.id}`,
        title: b.name,
        subtitle: "Tablero Kanban",
        category: "Tableros",
        href: `/organizations/${slug}/boards/${b.id}`,
      });
    });

    // Documentos
    documents.forEach((d) => {
      list.push({
        id: `doc-${d.id}`,
        title: d.title || "Documento sin título",
        subtitle: "Documento colaborativo",
        category: "Documentos",
        href: `/organizations/${slug}/documents/${d.id}`,
      });
    });

    return list;
  }, [slug, projects, boards, documents]);

  // Filtrado
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Ajustar selectedIndex
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  function executeItem(item: PaletteItem) {
    setIsOpen(false);
    if (item.onSelect) {
      item.onSelect();
    } else if (item.href) {
      router.push(item.href);
    }
  }

  function handleListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      executeItem(filtered[selectedIndex]);
    }
  }

  return (
    <>
      {/* Botón de apertura en la barra superior (estilo Stitch) */}
      <button
        type="button"
        className="flex items-center bg-surface-container-low border border-outline-variant/40 px-space-md py-space-xs text-outline font-body-sm text-body-sm w-full max-w-md hover:border-outline-variant/70 transition-colors text-left"
        onClick={() => setIsOpen(true)}
        title="Buscar (⌘K o Ctrl+K)"
      >
        <span className="material-symbols-outlined text-[18px] mr-space-sm text-outline">search</span>
        <span className="text-outline flex-1 select-none">Buscar o presionar</span>
        <kbd className="font-code text-label-sm text-outline border border-outline-variant/60 px-space-xs py-space-2xs bg-surface-container-high leading-none select-none">
          ⌘K
        </kbd>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="palette-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="palette-modal" onKeyDown={handleListKeyDown}>
            {/* Input Header */}
            <div className="palette-search-wrap">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-3)", marginLeft: 14 }}>
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                className="palette-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar proyectos, tableros, páginas o comandos..."
              />
              <span style={{ fontSize: 12, color: "var(--text-3)", paddingRight: 14 }}>
                ESC para cerrar
              </span>
            </div>

            {/* Resultados agrupados */}
            <div className="palette-results">
              {filtered.length === 0 ? (
                <div className="palette-empty">No se encontraron resultados para &quot;{query}&quot;</div>
              ) : (
                filtered.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      className={`palette-item ${isSelected ? "selected" : ""}`}
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <div className="palette-item-left">
                        <span className="palette-badge">{item.category}</span>
                        <div className="palette-item-info">
                          <strong className="palette-item-title">{item.title}</strong>
                          {item.subtitle && <span className="palette-item-sub">{item.subtitle}</span>}
                        </div>
                      </div>
                      <span className="palette-enter-hint">↵ Abrir</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer de atajos */}
            <div className="palette-footer">
              <span><kbd className="palette-kbd">↑</kbd> <kbd className="palette-kbd">↓</kbd> navegar</span>
              <span><kbd className="palette-kbd">↵</kbd> seleccionar</span>
              <span><kbd className="palette-kbd">esc</kbd> cerrar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
