"use client";

import type { ReactNode } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Images,
  List,
  ListOrdered,
  Minus,
  PanelRight,
  Pilcrow,
  Table as TableIcon,
} from "lucide-react";

interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}

function ToolbarButton({ label, onClick, active, disabled, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active ?? undefined}
      disabled={disabled}
      // Keep the editor selection when clicking toolbar buttons.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-gold/40 bg-gold-light/40 text-navy"
          : "border-transparent text-muted hover:bg-surface hover:text-navy"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden="true" />;
}

const icon = "h-[18px] w-[18px]";

interface EditorToolbarProps {
  editor: Editor;
  uploading: boolean;
  onPickImage: () => void;
  onPickGallery: () => void;
  settingsOpen?: boolean;
  onToggleSettings?: () => void;
}

export default function EditorToolbar({
  editor,
  uploading,
  onPickImage,
  onPickGallery,
  settingsOpen,
  onToggleSettings,
}: EditorToolbarProps) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      paragraph: e.isActive("paragraph"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      h4: e.isActive("heading", { level: 4 }),
      left: e.isActive({ textAlign: "left" }),
      center: e.isActive({ textAlign: "center" }),
      right: e.isActive({ textAlign: "right" }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      table: e.isActive("table"),
    }),
  });

  const run = () => editor.chain().focus();

  return (
    <div role="toolbar" aria-label="Formatting toolbar" className="border-b border-line bg-white">
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-2 sm:px-3">
        <ToolbarButton label="Paragraph" active={s.paragraph} onClick={() => run().setParagraph().run()}>
          <Pilcrow className={icon} />
        </ToolbarButton>
        <ToolbarButton label="Heading 1" active={s.h1} onClick={() => run().toggleHeading({ level: 1 }).run()}>
          <Heading1 className={icon} />
        </ToolbarButton>
        <ToolbarButton label="Heading 2" active={s.h2} onClick={() => run().toggleHeading({ level: 2 }).run()}>
          <Heading2 className={icon} />
        </ToolbarButton>
        <ToolbarButton label="Heading 3" active={s.h3} onClick={() => run().toggleHeading({ level: 3 }).run()}>
          <Heading3 className={icon} />
        </ToolbarButton>
        <ToolbarButton label="Heading 4" active={s.h4} onClick={() => run().toggleHeading({ level: 4 }).run()}>
          <Heading4 className={icon} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton label="Align left" active={s.left} onClick={() => run().setTextAlign("left").run()}>
          <AlignLeft className={icon} />
        </ToolbarButton>
        <ToolbarButton label="Align center" active={s.center} onClick={() => run().setTextAlign("center").run()}>
          <AlignCenter className={icon} />
        </ToolbarButton>
        <ToolbarButton label="Align right" active={s.right} onClick={() => run().setTextAlign("right").run()}>
          <AlignRight className={icon} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton label="Bullet list" active={s.bullet} onClick={() => run().toggleBulletList().run()}>
          <List className={icon} />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" active={s.ordered} onClick={() => run().toggleOrderedList().run()}>
          <ListOrdered className={icon} />
        </ToolbarButton>
        <ToolbarButton label="Horizontal rule" onClick={() => run().setHorizontalRule().run()}>
          <Minus className={icon} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton label="Insert image" disabled={uploading} onClick={onPickImage}>
          <ImageIcon className={icon} />
        </ToolbarButton>
        <ToolbarButton label="Insert gallery (Beta)" disabled={uploading} onClick={onPickGallery}>
          <Images className={icon} />
        </ToolbarButton>
        <ToolbarButton
          label="Insert table"
          active={s.table}
          onClick={() => run().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <TableIcon className={icon} />
        </ToolbarButton>

        {onToggleSettings && (
          <div className="ml-auto pl-2">
            <ToolbarButton
              label={settingsOpen ? "Close settings panel" : "Open settings panel"}
              active={settingsOpen}
              onClick={onToggleSettings}
            >
              <PanelRight className={icon} />
            </ToolbarButton>
          </div>
        )}
      </div>

      {s.table && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-line bg-surface px-3 py-2 text-xs">
          <span className="mr-1 font-semibold text-muted">Table:</span>
          {[
            ["Add row", () => run().addRowAfter().run()],
            ["Add column", () => run().addColumnAfter().run()],
            ["Delete row", () => run().deleteRow().run()],
            ["Delete column", () => run().deleteColumn().run()],
          ].map(([label, fn]) => (
            <button
              key={label as string}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={fn as () => void}
              className="rounded-md border border-line bg-white px-2.5 py-1 font-semibold text-ink hover:border-gold/50"
            >
              {label as string}
            </button>
          ))}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run().deleteTable().run()}
            className="rounded-md border border-red-200 bg-white px-2.5 py-1 font-semibold text-red-600 hover:bg-red-50"
          >
            Delete table
          </button>
        </div>
      )}
    </div>
  );
}
