import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import DashboardShell from "./components/DashboardShell";

/**
 * ============================================================================
 * DEVELOPMENT-ONLY AUTH BYPASS — MUST NEVER BE ACTIVE IN PRODUCTION
 * ============================================================================
 * This lets a developer skip the Gmail/password login screen while working
 * locally. It is guarded by TWO independent conditions, both required:
 *
 *   1. process.env.NODE_ENV === "development"
 *      This is set automatically by `next dev` and CANNOT be true in a
 *      `next build` / `next start` production deployment, regardless of
 *      what env vars are set.
 *
 *   2. process.env.DEV_AUTH_BYPASS === "true"
 *      An explicit opt-in flag you set yourself in `.env.local`. It is a
 *      plain server-side env var (no NEXT_PUBLIC_ prefix) so it is never
 *      bundled into client JavaScript or shipped to the browser.
 *
 * Even if this flag is accidentally left set to "true" in an env file that
 * ends up in a production deployment, condition (1) still blocks it there,
 * because NODE_ENV is "production" in any real build/start. Do not weaken
 * this by checking only one of the two conditions.
 *
 * To enable locally, add to .env.local:
 *   DEV_AUTH_BYPASS=true
 *
 * To go back to normal Supabase login locally, remove that line (or set it
 * to "false") and restart `next dev`.
 * ============================================================================
 */
const DEV_AUTH_BYPASS_ENABLED =
  process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "true";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  if (DEV_AUTH_BYPASS_ENABLED) {
    // Skips Supabase auth + admin_users verification entirely. Never reached
    // outside local development — see guard conditions above.
    return <DashboardShell>{children}</DashboardShell>;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .single();

  if (!adminUser) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
