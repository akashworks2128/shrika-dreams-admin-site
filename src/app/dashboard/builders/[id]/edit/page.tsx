import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import AddBuilderForm from "../../new/components/AddBuilderForm";
import { builderToForm } from "./builder-to-form";

export default async function EditBuilderPage({
  params,
}: PageProps<"/dashboard/builders/[id]/edit">) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: builder, error } = await supabase
    .from("builders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !builder) {
    notFound();
  }

  return <AddBuilderForm initialForm={builderToForm(builder)} builderId={builder.id} />;
}
