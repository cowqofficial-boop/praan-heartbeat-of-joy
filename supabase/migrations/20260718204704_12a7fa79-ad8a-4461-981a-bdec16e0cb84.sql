
-- Plans catalog
CREATE TABLE public.plans (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('free','subscription','pack')),
  name text NOT NULL,
  credits integer NOT NULL,
  price_inr integer NOT NULL,
  interval text CHECK (interval IN ('month','year')),
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read plans" ON public.plans FOR SELECT USING (true);

INSERT INTO public.plans (id, kind, name, credits, price_inr, interval, features, sort_order) VALUES
  ('free',       'free',         'Free',         3,   0,     NULL,    '{"library":true,"calendar":false,"brand_kit":true,"watermark":true,"priority":false}'::jsonb, 0),
  ('starter_m',  'subscription', 'Starter',      15,  999,   'month', '{"library":true,"calendar":false,"brand_kit":true,"watermark":false,"priority":false}'::jsonb, 10),
  ('starter_y',  'subscription', 'Starter',      15,  9990,  'year',  '{"library":true,"calendar":false,"brand_kit":true,"watermark":false,"priority":false}'::jsonb, 11),
  ('growth_m',   'subscription', 'Growth',       50,  2999,  'month', '{"library":true,"calendar":true,"brand_kit":true,"watermark":false,"priority":false}'::jsonb, 20),
  ('growth_y',   'subscription', 'Growth',       50,  29990, 'year',  '{"library":true,"calendar":true,"brand_kit":true,"watermark":false,"priority":false}'::jsonb, 21),
  ('pro_m',      'subscription', 'Pro',          150, 6999,  'month', '{"library":true,"calendar":true,"brand_kit":true,"watermark":false,"priority":true}'::jsonb, 30),
  ('pro_y',      'subscription', 'Pro',          150, 69990, 'year',  '{"library":true,"calendar":true,"brand_kit":true,"watermark":false,"priority":true}'::jsonb, 31),
  ('pack_10',    'pack',         '10 products',  10,  799,   NULL,    '{"library":true,"calendar":false,"brand_kit":true,"watermark":false,"priority":false}'::jsonb, 40),
  ('pack_25',    'pack',         '25 products',  25,  1749,  NULL,    '{"library":true,"calendar":false,"brand_kit":true,"watermark":false,"priority":false}'::jsonb, 41),
  ('pack_60',    'pack',         '60 products',  60,  3499,  NULL,    '{"library":true,"calendar":false,"brand_kit":true,"watermark":false,"priority":false}'::jsonb, 42);

-- Per-user credit ledger and current plan
CREATE TABLE public.user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL DEFAULT 'free' REFERENCES public.plans(id),
  subscription_credits integer NOT NULL DEFAULT 3,
  pack_credits integer NOT NULL DEFAULT 0,
  period_start timestamptz,
  period_end timestamptz,
  razorpay_subscription_id text,
  razorpay_customer_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own credits"   ON public.user_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own credits" ON public.user_credits FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Invoices / payment history
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL REFERENCES public.plans(id),
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_subscription_id text,
  razorpay_invoice_id text,
  invoice_url text,
  amount_inr integer NOT NULL,
  credits_granted integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed','refunded')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_user_created_idx ON public.payments (user_id, created_at DESC);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);

-- Cached Razorpay plan ids (backend only)
CREATE TABLE public.razorpay_plans (
  plan_id text PRIMARY KEY REFERENCES public.plans(id),
  razorpay_plan_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.razorpay_plans TO service_role;
ALTER TABLE public.razorpay_plans ENABLE ROW LEVEL SECURITY;

-- Credit consumption helper: subscription credits first, then pack credits.
-- Returns true on success, false if not enough credits.
CREATE OR REPLACE FUNCTION public.consume_credit(_user_id uuid, _amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s integer;
  p integer;
  take_s integer;
  take_p integer;
BEGIN
  -- Ensure a row exists (free tier).
  INSERT INTO public.user_credits (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT subscription_credits, pack_credits INTO s, p
    FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;

  IF (COALESCE(s,0) + COALESCE(p,0)) < _amount THEN
    RETURN false;
  END IF;

  take_s := LEAST(COALESCE(s,0), _amount);
  take_p := _amount - take_s;

  UPDATE public.user_credits
    SET subscription_credits = subscription_credits - take_s,
        pack_credits = pack_credits - take_p
    WHERE user_id = _user_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_credit(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.consume_credit(uuid, integer) TO service_role;

-- Seed credits automatically for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, plan_id, subscription_credits)
    VALUES (NEW.id, 'free', 3)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();
