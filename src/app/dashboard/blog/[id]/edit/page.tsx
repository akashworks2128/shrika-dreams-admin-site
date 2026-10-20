import { notFound } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { createClient } from "@/lib/supabase-server";
import BlogEditor from "../../components/BlogEditor";

export default async function EditBlogPostPage({ params }: PageProps<"/dashboard/blog/[id]/edit">) {
  const { id } = await params;

  const supabase = await createClient();
  let { data: post, error } = await supabase
    .from("blog_posts")
    .select("id, title, slug, content, cover_image_url, is_published, created_at, excerpt, publish_date")
    .eq("id", id)
    .maybeSingle();

  // If the Settings SQL hasn't been run yet, still let the post open (without the new fields).
  if (error) {
    const fallback = await supabase
      .from("blog_posts")
      .select("id, title, slug, content, cover_image_url, is_published, created_at")
      .eq("id", id)
      .maybeSingle();
    post = fallback.data as typeof post;
    error = fallback.error;
  }

  if (error || !post) notFound();

  const publishDate =
    (post.publish_date as string | null | undefined) ??
    new Date(post.created_at as string).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  return (
    <BlogEditor
      key={post.id}
      initial={{
        id: post.id,
        title: post.title,
        content: post.content as JSONContent,
        published: Boolean(post.is_published),
        slug: (post.slug as string | null) ?? null,
        coverImageUrl: (post.cover_image_url as string | null) ?? null,
        publishDate,
        excerpt: (post.excerpt as JSONContent | null | undefined) ?? null,
      }}
    />
  );
}
