
-- 1) Drop permissive "true" policies. Access is server-side only via service role.
DROP POLICY IF EXISTS "Anyone can insert generations" ON public.generations;
DROP POLICY IF EXISTS "Anyone can read generations" ON public.generations;
DROP POLICY IF EXISTS "Anyone can update generations" ON public.generations;

DROP POLICY IF EXISTS "Anyone can insert daily_usage" ON public.daily_usage;
DROP POLICY IF EXISTS "Anyone can read daily_usage" ON public.daily_usage;
DROP POLICY IF EXISTS "Anyone can update daily_usage" ON public.daily_usage;

-- daily_usage is fully server-managed; revoke direct client access.
REVOKE ALL ON public.daily_usage FROM anon, authenticated;

-- generations: keep owner-scoped policies for signed-in reads/updates/deletes (already present).
-- Anon has no direct table access; the anon "view results" path goes through
-- getGeneration server function (service role).
REVOKE ALL ON public.generations FROM anon;

-- 2) SECURITY DEFINER hardening.
-- Credit + user-provisioning routines must never be callable from the client.
REVOKE EXECUTE ON FUNCTION public.consume_credit(uuid, integer)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.spend_credits(uuid, integer)      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refund_credits(uuid, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_credits()         FROM PUBLIC, anon, authenticated;

-- apply_stock_movement: user-callable, but stop bypassing RLS.
-- It already validates auth.uid() internally, and stock_items/stock_movements
-- policies restrict to auth.uid() = user_id, so INVOKER is correct.
ALTER FUNCTION public.apply_stock_movement(uuid, integer, text, text) SECURITY INVOKER;

-- has_role: called with auth.uid() from policies and server code; user_roles
-- RLS permits the caller to read their own row, so INVOKER is sufficient.
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
