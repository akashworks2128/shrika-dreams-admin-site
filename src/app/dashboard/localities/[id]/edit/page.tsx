import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import AddLocalityForm from "../../new/components/AddLocalityForm";
import { localityToForm } from "./locality-to-form";

export default async function EditLocalityPage({
  params,
}: PageProps<"/dashboard/localities/[id]/edit">) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: locality, error } = await supabase
    .from("localities")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !locality) {
    notFound();
  }

  return <AddLocalityForm initialForm={localityToForm(locality)} localityId={locality.id} />;
}
