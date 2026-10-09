import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const DEV_AUTH_BYPASS_ENABLED =
  process.env.NODE_ENV === "development" && process.env.DEV_AUTH_BYPASS === "true";

async function getReadClient() {
  if (DEV_AUTH_BYPASS_ENABLED) return createAdminClient();
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) throw new Error("You are not signed in.");
  const { data, error } = await authClient.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error || !data) throw new Error("You do not have permission to export leads.");
  // Use the service-role key if configured, otherwise the admin's own session (RLS allows admins).
  if (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) return createAdminClient();
  return authClient;
}

function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  // Leads come from the public site: neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    const supabase = await getReadClient();
    const { data: rows, error } = await supabase
      .from("leads")
      .select("name,phone,email,whatsapp,preferred_contact,message,project_id,builder_id,locality_id,property_type,bhk,budget,source,status,notes,next_follow_up_date,next_follow_up_time,created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const leads = rows ?? [];
    const ids = {
      project: Array.from(new Set(leads.map((r) => r.project_id).filter(Boolean))),
      builder: Array.from(new Set(leads.map((r) => r.builder_id).filter(Boolean))),
      locality: Array.from(new Set(leads.map((r) => r.locality_id).filter(Boolean))),
    };
    const [projects, builders, localities] = await Promise.all([
      ids.project.length ? supabase.from("projects").select("id,name").in("id", ids.project) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      ids.builder.length ? supabase.from("builders").select("id,name").in("id", ids.builder) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      ids.locality.length ? supabase.from("localities").select("id,name").in("id", ids.locality) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ]);
    const lookup = (items: { id: string; name: string }[] | null) => new Map((items ?? []).map((item) => [item.id, item.name]));
    const pm = lookup(projects.data as { id: string; name: string }[]);
    const bm = lookup(builders.data as { id: string; name: string }[]);
    const lm = lookup(localities.data as { id: string; name: string }[]);
    const headers = ["Name","Phone","Email","WhatsApp","Preferred Contact","Project","Builder","Locality","Property Type","BHK","Budget","Message","Source","Status","Notes","Next Follow-up Date","Next Follow-up Time","Created At"];
    const lines = [headers.map(csvCell).join(",")];
    for (const r of leads) {
      lines.push([
        r.name,r.phone,r.email,r.whatsapp,r.preferred_contact,
        r.project_id ? pm.get(r.project_id) : "",
        r.builder_id ? bm.get(r.builder_id) : "",
        r.locality_id ? lm.get(r.locality_id) : "",
        r.property_type,r.bhk,r.budget,r.message,r.source,r.status,r.notes,
        r.next_follow_up_date,r.next_follow_up_time,r.created_at,
      ].map(csvCell).join(","));
    }
    return new NextResponse("\ufeff" + lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="shrika-dreams-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not export leads.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
