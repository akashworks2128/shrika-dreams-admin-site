"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Newspaper, Pencil, Plus, Search } from "lucide-react";
import type { BlogListItem } from "@/lib/blog-data";
import BlogRowActions from "./BlogRowActions";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata", // fixed zone keeps server and client output identical
  });
}

function StatusBadge({ published }: { published: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${
        published ? "border-gold/25 bg-gold-light/25 text-navy" : "border-line bg-surface text-muted"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${published ? "bg-gold" : "bg-gray-400"}`} />
      {published ? "Published" : "Draft"}
    </span>
  );
}

function Cover({ url, title }: { url: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" onError={() => setFailed(true)} />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface">
      <Newspaper className="h-7 w-7 text-gray-300" />
    </div>
  );
}

interface BlogListProps {
  items: BlogListItem[];
  error: string | null;
  hasSearch: boolean;
}

export default function BlogList({ items, error, hasSearch }: BlogListProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-white px-6 py-16 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <p className="text-sm font-medium text-ink">Couldn&apos;t load blog posts</p>
        <p className="max-w-sm text-xs text-muted">{error}</p>
        {error.includes("blog_posts") && (
          <p className="max-w-md rounded-lg border border-gold/25 bg-gold-light/20 px-3 py-2 text-xs text-navy">
            Setup needed: run <code className="font-semibold">supabase/migrations/20261010_create_blog_posts.sql</code> once
            in the Supabase SQL Editor, then refresh this page.
          </p>
        )}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-white px-6 py-16 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface">
          {hasSearch ? <Search className="h-5 w-5 text-muted" /> : <Newspaper className="h-5 w-5 text-muted" />}
        </div>
        {hasSearch ? (
          <p className="text-sm font-medium text-muted">No posts match your search.</p>
        ) : (
          <>
            <p className="text-sm font-medium text-ink">No blog posts yet</p>
            <p className="max-w-xs text-xs text-muted">Write your first article to share news and guides on the website.</p>
            <Link
              href="/dashboard/blog/new"
              className="flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-xs font-semibold text-white hover:bg-gold/90"
            >
              <Plus className="h-3.5 w-3.5" /> Add Post
            </Link>
          </>
        )}
      </div>
    );
  }

  const publishedCount = items.filter((p) => p.published).length;

  return (
    <>
    <p className="text-sm text-muted">
      <span className="font-semibold text-navy">{items.length}</span> {items.length === 1 ? "post" : "posts"} ·{" "}
      <span className="font-semibold text-navy">{publishedCount}</span> published ·{" "}
      <span className="font-semibold text-navy">{items.length - publishedCount}</span> drafts
    </p>
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((post) => (
        <li key={post.id} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-lg">
          <Link href={`/dashboard/blog/${post.id}/edit`} className="block aspect-[16/9] overflow-hidden bg-surface" aria-label={`Edit ${post.title}`}>
            <Cover url={post.coverImageUrl} title={post.title} />
          </Link>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <h2 className="line-clamp-2 text-base font-bold leading-snug text-navy">{post.title}</h2>
            <div className="flex items-center justify-between gap-2">
              <StatusBadge published={post.published} />
              <span className="text-xs text-muted">Updated {formatDate(post.updatedAt)}</span>
            </div>
            <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
              <Link
                href={`/dashboard/blog/${post.id}/edit`}
                className="flex items-center gap-1.5 text-sm font-semibold text-gold hover:underline"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Link>
              <BlogRowActions postId={post.id} postTitle={post.title} />
            </div>
          </div>
        </li>
      ))}
    </ul>
    </>
  );
}
