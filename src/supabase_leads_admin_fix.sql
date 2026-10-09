-- Shrika Dreams: Leads admin access for local DEV_AUTH_BYPASS and server-side admin client.
-- Run this once in Supabase SQL Editor.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.leads
TO service_role;

GRANT SELECT
ON TABLE public.projects, public.builders, public.localities
TO service_role;
