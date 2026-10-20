import type { Extensions } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { Gallery } from "./gallery-extension";

/** Shared by the editor (and reusable by the public site renderer). */
export function getBlogExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] }, // paragraphs, headings, lists, hr come from StarterKit
    }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Image.configure({ allowBase64: false }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    Gallery,
  ];
}
