import { redirect } from "next/navigation";

// The admin app has no standalone landing page — "/" always forwards to the
// dashboard. If the visitor isn't authenticated, the /dashboard layout's
// existing Supabase auth guard takes over from there and sends them to
// /login (unless the local dev bypass below is active).
export default function RootPage() {
  redirect("/dashboard");
}
