import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ADMIN_DISPLAY_NAME } from "@/lib/constants";
import DashboardHeader from "../../../components/DashboardHeader";

export default async function EditProjectPage({
  params,
}: PageProps<"/dashboard/projects/[id]/edit">) {
  const { id } = await params;

  return (
    <>
      <DashboardHeader
        title="Edit Project"
        subtitle="Update this property listing."
        adminName={ADMIN_DISPLAY_NAME}
      />

      <main className="flex-1 px-4 pb-10 sm:px-6 md:px-8">
        <div className="rounded-2xl border border-line bg-white p-8 text-center">
          <p className="text-sm font-medium text-muted">
            The Edit Project form is coming soon.
          </p>
          <p className="mt-1 text-xs text-gray-300">Project ID: {id}</p>
          <Link
            href="/dashboard/projects"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Projects
          </Link>
        </div>
      </main>
    </>
  );
}
