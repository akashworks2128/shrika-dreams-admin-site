import { Plus } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import { getBlogPosts } from "@/lib/blog-data";
import DashboardHeader from "../components/DashboardHeader";
import BlogSearch from "./components/BlogSearch";
import BlogList from "./components/BlogList";
import DeleteSuccessToast from "../projects/components/DeleteSuccessToast";

function firstValue(value: string | string[] | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

export default async function BlogPage({ searchParams }: PageProps<"/dashboard/blog">) {
  const resolvedParams = await searchParams;
  const search = firstValue(resolvedParams.q).trim();

  const supabase = await createClient();
  const result = await getBlogPosts(supabase, search);

  return (
    <>
      <DashboardHeader
        title="Blog Management"
        subtitle="Create and manage the articles shown on the Shrika Dreams website."
        adminName={ADMIN_DISPLAY_NAME}
        action={
          <Link
            href="/dashboard/blog/new"
            className="flex items-center justify-center gap-1.5 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-white hover:bg-gold/90"
          >
            <Plus className="h-4 w-4" />
            Add Post
          </Link>
        }
      />

      <main className="flex-1 px-4 pb-12 sm:px-6 md:px-8">
        <div className="mx-auto max-w-[1400px] space-y-6">
          <BlogSearch initialSearch={search} />
          <BlogList items={result.items} error={result.error} hasSearch={Boolean(search)} />
        </div>
      </main>

      <DeleteSuccessToast />
    </>
  );
}
