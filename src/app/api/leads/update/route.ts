import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const ALLOWED_STATUSES = ["New", "Contacted", "Follow-up", "Closed"] as const;
const DEV_AUTH_BYPASS_ENABLED =
  process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "true";

async function getMutationClient() {
  if (DEV_AUTH_BYPASS_ENABLED) return createAdminClient();

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("You are not signed in.");

  const { data, error } = await authClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) throw new Error("You do not have permission to manage leads.");

  // Admin is verified above. Use the service-role client when a secret key is
  // configured; otherwise fall back to the signed-in admin's own session, which
  // the admin RLS policies on `leads` already allow. This keeps status changes
  // working when SUPABASE_SECRET_KEY has not been added to .env.local.
  if (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createAdminClient();
  }
  return authClient;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const leadId = typeof body.leadId === "string" ? body.leadId : "";
    const status = typeof body.status === "string" ? body.status : "";
    const notes = typeof body.notes === "string" ? body.notes : undefined;
    const nextFollowUpDate = typeof body.nextFollowUpDate === "string" ? body.nextFollowUpDate : undefined;
    const nextFollowUpTime = typeof body.nextFollowUpTime === "string" ? body.nextFollowUpTime : undefined;

    if (!leadId || !ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
      return NextResponse.json({ ok: false, error: "Invalid lead status." }, { status: 400 });
    }

    const supabase = await getMutationClient();
    const payload: Record<string, string | null> = { status };
    if (notes !== undefined) payload.notes = notes.trim() || null;
    if (nextFollowUpDate !== undefined) payload.next_follow_up_date = nextFollowUpDate || null;
    if (nextFollowUpTime !== undefined) payload.next_follow_up_time = nextFollowUpTime || null;

    const { data, error } = await supabase
      .from("leads")
      .update(payload)
      .eq("id", leadId)
      .select("id,status,notes,next_follow_up_date,next_follow_up_time")
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ ok: false, error: "Lead was not found or could not be updated." }, { status: 404 });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/leads");

    return NextResponse.json({ ok: true, lead: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update lead.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
