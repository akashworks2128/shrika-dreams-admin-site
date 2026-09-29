import { createClient } from "@/lib/supabase-server";
import { getFilterOptions } from "@/lib/projects-data";
import AddProjectForm from "./components/AddProjectForm";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const { builders, localities } = await getFilterOptions(supabase);

  return <AddProjectForm builders={builders} localities={localities} />;
}
