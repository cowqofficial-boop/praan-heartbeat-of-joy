
-- Restore grants stripped by the earlier hardening migration.
-- service_role must always have full access (used by server functions via admin client).
GRANT ALL ON public.generations TO service_role;
GRANT ALL ON public.daily_usage TO service_role;
GRANT ALL ON public.generation_jobs TO service_role;

-- Signed-in users read/write their own rows via RLS on generations.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generations TO authenticated;

-- daily_usage and generation_jobs are internal bookkeeping — only touched by server functions
-- via the admin client. No anon/authenticated grants needed (RLS + no grants = locked).
