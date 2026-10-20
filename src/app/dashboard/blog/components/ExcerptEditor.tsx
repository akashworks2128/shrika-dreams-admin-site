"use client";

import { useState, type ReactNode } from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Check,
  Italic,
  Link2,
  Strikethrough,
  Underline as UnderlineIcon,
  X,
} from "lucide-react";

interface ExcerptEditorProps {
  initial: JSONContent | null;
  /** Called with the Tiptap JSON, or null when the excerpt is empty. */
  onChange: (doc: JSONContent | null) => void;
}

/** Only http(s), mailto and tel links are allowed; bare domains get https://. */
function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value)
    ? value
    : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol)
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function MiniButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
        active
          ? "border-gold/40 bg-gold-light/40 text-navy"
          : "border-transparent text-muted hover:bg-surface hover:text-navy"
      }`}
    >
      {children}
    </button>
  );
}

function ExcerptToolbar({ editor }: { editor: Editor }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState(false);

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      link: e.isActive("link"),
    }),
  });

  const run = () => editor.chain().focus();
  const icon = "h-4 w-4";

  function openLink() {
    if (s.link) {
      run().extendMarkRange("link").unsetLink().run(); // clicking an active link button removes it
      return;
    }
    setUrl("");
    setUrlError(false);
    setLinkOpen(true);
  }

  function applyLink() {
    const href = normalizeUrl(url);
    if (!href) return setUrlError(true);
    run().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
  }

  return (
    <div className="border-b border-line bg-white">
      <div
        role="toolbar"
        aria-label="Excerpt formatting"
        className="flex items-center gap-0.5 px-2 py-1.5"
      >
        <MiniButton
          label="Bold"
          active={s.bold}
          onClick={() => run().toggleBold().run()}
        >
          <Bold className={icon} />
        </MiniButton>
        <MiniButton
          label="Italic"
          active={s.italic}
          onClick={() => run().toggleItalic().run()}
        >
          <Italic className={icon} />
        </MiniButton>
        <MiniButton
          label="Underline"
          active={s.underline}
          onClick={() => run().toggleUnderline().run()}
        >
          <UnderlineIcon className={icon} />
        </MiniButton>
        <MiniButton
          label="Strikethrough"
          active={s.strike}
          onClick={() => run().toggleStrike().run()}
        >
          <Strikethrough className={icon} />
        </MiniButton>
        <MiniButton
          label={s.link ? "Remove link" : "Add link"}
          active={s.link}
          onClick={openLink}
        >
          <Link2 className={icon} />
        </MiniButton>
      </div>
      {linkOpen && (
        <div className="flex items-center gap-1.5 border-t border-line bg-surface px-2 py-1.5">
          <input
            type="text"
            value={url}
            autoFocus
            placeholder="https://example.com"
            aria-label="Link URL"
            aria-invalid={urlError}
            onChange={(e) => {
              setUrl(e.target.value);
              setUrlError(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") setLinkOpen(false);
            }}
            className={`min-w-0 flex-1 rounded-md border bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-300 ${
              urlError ? "border-red-400" : "border-line"
            }`}
          />
          <button
            type="button"
            aria-label="Apply link"
            onClick={applyLink}
            className="rounded-md p-1.5 text-gold hover:bg-white"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Cancel link"
            onClick={() => setLinkOpen(false)}
            className="rounded-md p-1.5 text-muted hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {linkOpen && urlError && (
        <p className="px-3 pb-1.5 text-[11px] text-red-600">
          Enter a valid http(s), mailto or tel link.
        </p>
      )}
    </div>
  );
}

export default function ExcerptEditor({
  initial,
  onChange,
}: ExcerptEditorProps) {
  const editor = useEditor({
    // Inline-only: paragraphs + bold/italic/underline/strike/link (StarterKit v3 includes underline and link).
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: false },
      }),
    ],
    content: initial ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "excerpt-prose", "aria-label": "Post excerpt" },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? null : e.getJSON()),
  });

  return (
    <div className="excerpt-editor overflow-hidden rounded-lg border border-line bg-white focus-within:ring-2 focus-within:ring-amber-300">
      {editor ? (
        <ExcerptToolbar editor={editor} />
      ) : (
        <div
          className="h-[45px] border-b border-line bg-surface/60"
          aria-hidden="true"
        />
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
