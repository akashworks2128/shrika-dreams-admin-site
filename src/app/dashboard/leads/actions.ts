"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const DEV_AUTH_BYPASS_ENABLED =
  process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "true";

async function getMutationClient() {
  if (DEV_AUTH_BYPASS_ENABLED) {
    return createAdminClient();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You are not signed in.");

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) throw new Error("You do not have permission to manage leads.");
  return supabase;
}

export async function updateLeadStatusAction(leadId: string, status: string) {
  const allowed = ["New", "Contacted", "Follow-up", "Closed"];
  if (!leadId || !allowed.includes(status)) throw new Error("Invalid lead status.");

  const supabase = await getMutationClient();
  const { data, error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId)
    .select("id,status")
    .maybeSingle();

  if (error) throw new Error(`Could not update lead status: ${error.message}`);
  if (!data) throw new Error("Lead was not found or could not be updated.");

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateLeadDetailsAction(input: {
  leadId: string;
  status: string;
  notes: string;
  nextFollowUpDate: string;
  nextFollowUpTime: string;
}) {
  const allowed = ["New", "Contacted", "Follow-up", "Closed"];
  if (!input.leadId || !allowed.includes(input.status)) throw new Error("Invalid lead details.");

  const supabase = await getMutationClient();
  const { data, error } = await supabase
    .from("leads")
    .update({
      status: input.status,
      notes: input.notes.trim() || null,
      next_follow_up_date: input.nextFollowUpDate || null,
      next_follow_up_time: input.nextFollowUpTime || null,
    })
    .eq("id", input.leadId)
    .select("id,status,notes,next_follow_up_date,next_follow_up_time")
    .maybeSingle();

  if (error) throw new Error(`Could not save lead details: ${error.message}`);
  if (!data) throw new Error("Lead was not found or could not be updated.");

  revalidatePath("/dashboard/leads");
  revalidatePath("/dashboard");
  return { ok: true };
}
