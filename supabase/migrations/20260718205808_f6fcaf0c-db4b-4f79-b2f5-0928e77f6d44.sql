
-- 1. Social channel connections (Instagram / Facebook Page / WhatsApp).
--    Tokens are encrypted before insert by server code, so no auth/anon read grant.
CREATE TABLE public.social_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('instagram','facebook_page','whatsapp')),
  account_id text NOT NULL,
  account_name text,
  access_token_ciphertext text NOT NULL,
  token_expires_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  needs_reconnect boolean NOT NULL DEFAULT false,
  last_refreshed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel)
);

-- Server-only table. Only service_role reads/writes; owners read a SAFE view (below).
GRANT ALL ON public.social_connections TO service_role;
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role only" ON public.social_connections FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_social_connections_updated_at
  BEFORE UPDATE ON public.social_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Owner-safe view — never exposes the encrypted token.
CREATE VIEW public.my_social_connections
WITH (security_invoker = true)
AS
SELECT id, user_id, channel, account_id, account_name,
       token_expires_at, needs_reconnect, last_refreshed_at,
       created_at, updated_at
FROM public.social_connections
WHERE user_id = auth.uid();

GRANT SELECT ON public.my_social_connections TO authenticated;

-- 3. Short-lived OAuth state (used as the `state` param on the Meta authorize URL).
CREATE TABLE public.oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);
GRANT ALL ON public.oauth_states TO service_role;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role only" ON public.oauth_states FOR ALL TO service_role USING (true) WITH CHECK (true);
