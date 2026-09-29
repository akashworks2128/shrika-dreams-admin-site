import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import DashboardHeader from "../../../components/DashboardHeader";

// Placeholder route only — the actual Edit Locality form is out of scope
// for this task, same as new/page.tsx. This route exists so "Edit" in
// LocalityRowActions has somewhere real to navigate to. It does confirm
// the locality actually exists (404s otherwise) and shows its name, so
// it's a genuine — if minimal — working page rather than a dead link.
export default async function EditLocalityPage({
  params,
}: PageProps<"/dashboard/localities/[id]/edit">) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: locality, error } = await supabase
    .from("localities")
    .select("id, name")
    .eq("id", id)
    .single();

  if (error || !locality) {
    notFound();
  }

  return (
    <>
      <DashboardHeader
        title="Edit Locality"
        subtitle={`Update details for ${locality.name}.`}
        adminName={ADMIN_DISPLAY_NAME}
        backHref="/dashboard/localities"
      />

      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line bg-white px-6 py-16 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-light/40">
            <Pencil className="h-5 w-5 text-gold" />
          </div>
          <p className="text-sm font-medium text-ink">Locality editing form coming soon</p>
          <p className="max-w-sm text-xs text-muted">
            This page will let you edit every field for &ldquo;{locality.name}&rdquo;, the same
            way editing a project works today.
          </p>
        </div>
      </main>
    </>
  );
}
