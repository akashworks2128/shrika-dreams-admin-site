import { Node, mergeAttributes } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";

export interface GalleryImage {
  src: string;
  alt: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    gallery: {
      insertGallery: (images: GalleryImage[]) => ReturnType;
    };
  }
}

/**
 * Custom block node holding several images. It is stored in the document JSON
 * as { type: "gallery", attrs: { images: [{ src, alt }] } } and rendered as
 * <div data-type="gallery"><img/>…</div>, which parseHTML reads back.
 */
export const Gallery = Node.create({
  name: "gallery",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      images: {
        default: [] as GalleryImage[],
        parseHTML: (element: HTMLElement) =>
          Array.from(element.querySelectorAll("img")).map((img) => ({
            src: img.getAttribute("src") ?? "",
            alt: img.getAttribute("alt") ?? "",
          })),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="gallery"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const images = (node.attrs.images ?? []) as GalleryImage[];
    const children: DOMOutputSpec[] = images.map((image) => [
      "img",
      { src: image.src, alt: image.alt, loading: "lazy" },
    ]);
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "gallery",
        "data-count": String(images.length),
        class: "blog-gallery",
      }),
      ...children,
    ] as DOMOutputSpec;
  },

  addCommands() {
    return {
      insertGallery:
        (images) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { images } }),
    };
  },
});
