"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";

// Editor de bloques real basado en ProseMirror (vía Tiptap): a diferencia de
// la versión anterior (que convertía cada bloque a texto plano y perdía
// negrita/itálica/enlaces al guardar), acá el documento se guarda y recarga
// como JSON de ProseMirror completo, preservando el formato enriquecido.
export function DocEditor({
  slug,
  documentId,
  initialTitle,
  initialContent,
  canEdit,
}: {
  slug: string;
  documentId: string;
  initialTitle: string;
  initialContent: any;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    editable: canEdit,
    immediatelyRender: false,
    content: initialContent && Object.keys(initialContent).length > 0 ? initialContent : "",
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({
        placeholder: "Escribe algo, o usa la barra de herramientas para formatear...",
      }),
    ],
    editorProps: {
      attributes: { class: "tiptap-content-inner" },
    },
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        save({ content: editor.getJSON() });
      }, 800);
    },
  });

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const save = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!canEdit) return;
      setSaving(true);
      setError("");
      try {
        const res = await fetch(`/api/organizations/${slug}/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Error guardando");
          return;
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        if (patch.title !== undefined) router.refresh();
      } catch {
        setError("Error de red");
      } finally {
        setSaving(false);
      }
    },
    [canEdit, slug, documentId, router]
  );

  return (
    <div>
      <div className="dash-toolbar" style={{ maxWidth: 820, margin: "0 auto 18px" }}>
        <div style={{ flex: 1 }} />
        <div className="actions">
          {saved && <span className="badge" style={{ color: "var(--success)" }}>Guardado</span>}
          {saving && <span style={{ color: "var(--text-3)", fontSize: 13 }}>Guardando...</span>}
        </div>
      </div>

      {error && <div className="error" style={{ maxWidth: 820, margin: "0 auto 12px" }}>{error}</div>}

      <div className="doc-editor">
        <input
          className="doc-title-input"
          value={title}
          disabled={!canEdit}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== initialTitle && title.trim() && save({ title })}
          placeholder="Título del documento"
        />

        {canEdit && editor && <Toolbar editor={editor} />}

        <div className="tiptap-content">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  // Fuerza un re-render al cambiar de selección/marcas activas, para que
  // los botones reflejen el estado actual (negrita activa, etc.).
  const [, forceRender] = useState(0);
  useEffect(() => {
    const rerender = () => forceRender((n) => n + 1);
    editor.on("selectionUpdate", rerender);
    editor.on("transaction", rerender);
    return () => {
      editor.off("selectionUpdate", rerender);
      editor.off("transaction", rerender);
    };
  }, [editor]);

  function btn(
    label: string,
    isActive: boolean,
    onClick: () => void,
    title: string
  ) {
    return (
      <button
        type="button"
        className={`tiptap-btn${isActive ? " is-active" : ""}`}
        onClick={onClick}
        title={title}
        aria-label={title}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="tiptap-toolbar">
      {btn("B", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Negrita")}
      {btn("I", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Itálica")}
      {btn("S", editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "Tachado")}
      {btn("<>", editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), "Código")}
      <span className="sep" />
      {btn("H1", editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "Título 1")}
      {btn("H2", editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "Título 2")}
      {btn("H3", editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "Título 3")}
      <span className="sep" />
      {btn("•", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Lista")}
      {btn("1.", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Lista numerada")}
      {btn("☑", editor.isActive("taskList"), () => editor.chain().focus().toggleTaskList().run(), "Lista de tareas")}
      {btn("❝", editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "Cita")}
      <span className="sep" />
      {btn(
        "🔗",
        editor.isActive("link"),
        () => {
          const previousUrl = editor.getAttributes("link").href;
          const url = window.prompt("URL del enlace", previousUrl || "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        },
        "Enlace"
      )}
      <span className="sep" />
      {btn("↶", false, () => editor.chain().focus().undo().run(), "Deshacer")}
      {btn("↷", false, () => editor.chain().focus().redo().run(), "Rehacer")}
    </div>
  );
}
