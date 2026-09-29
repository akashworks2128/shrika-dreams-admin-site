// Displayed admin name is intentionally a fixed label rather than a personal
// name pulled from admin_users, so no individual's name is ever exposed in
// the UI. This does not affect the admin_users authorization check in
// dashboard/layout.tsx, which still runs against the real Supabase row.
export const ADMIN_DISPLAY_NAME = "SHRIKA";
