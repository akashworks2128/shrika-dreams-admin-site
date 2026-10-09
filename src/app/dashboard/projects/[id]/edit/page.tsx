import { notFound } from "next/navigation";
// Server component: must use the cookie-aware server client so the query runs
// as the signed-in admin. The browser client has no cookies on the server, so
// it queries as anon and RLS hides every unpublished (Draft) project.
import { createClient } from "@/lib/supabase-server";
import { getFilterOptions } from "@/lib/projects-data";
import { rowsToImageItems } from "@/lib/project-images";
import AddProjectForm from "../../new/components/AddProjectForm";
import { projectToForm } from "./project-to-form";
export default async function EditProjectPage({
  params,
}: PageProps<"/dashboard/projects/[id]/edit">) {
  const { id } = await params;

  const supabase = await createClient();

  const [{ data: project, error: projectError }, filterOptions] =
    await Promise.all([
      supabase
        .from("projects")
        .select(
          `
          *,
          builders (
            id,
            name
          ),
          localities (
            id,
            name
          ),
          project_configurations (
            id,
            configuration,
            area,
            price,
            availability,
            sort_order
          ),
          project_images (
            id,
            image_url,
            image_type,
            alt_text,
            sort_order
          )
        `,
        )
        .eq("id", id)
        .maybeSingle(),

      getFilterOptions(supabase),
    ]);

  if (projectError || !project) {
    notFound();
  }

  const initialForm = projectToForm(project);

  return (
    <AddProjectForm
      builders={filterOptions.builders}
      localities={filterOptions.localities}
      initialForm={initialForm}
      initialImages={rowsToImageItems(project.project_images)}
      projectId={project.id}
      initialConfigurations={(project.project_configurations ?? []).map((row: Record<string, unknown>) => ({
        id: row.id,
        configuration: row.configuration ?? "",
        area: String(row.area ?? "").replace(/[^0-9.]/g, ""),
        price: String(row.price ?? "").replace(/[^0-9.]/g, ""),
        priceUnit: /\bCr\b/i.test(String(row.price ?? "")) ? "Cr" : "L",
        availability: row.availability ?? "",
        sortOrder: String(row.sort_order ?? 0),
      }))}
      mode="edit"
    />
  );
}
