-- Adds the lead follow-up columns used by /api/leads/update and leads-data.ts.
-- Safe to run more than once. Run in Supabase SQL Editor.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS next_follow_up_date date,
  ADD COLUMN IF NOT EXISTS next_follow_up_time time,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

NOTIFY pgrst, 'reload schema';
