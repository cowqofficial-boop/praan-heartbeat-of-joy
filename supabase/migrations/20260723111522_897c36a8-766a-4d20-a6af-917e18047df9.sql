-- Plans
INSERT INTO public.plans (id, kind, name, credits, price_inr, interval, features) VALUES
  ('free',      'free',         'Free',    200,  0,     NULL,    '{"library":true,"calendar":false,"brand_kit":true,"watermark":true,"priority":false,"stock":true,"auto_post":false,"bulk_upload":false,"multi_brand":false}'::jsonb),
  ('starter_m', 'subscription', 'Starter', 800,  999,   'month', '{"library":true,"calendar":false,"brand_kit":true,"watermark":false,"priority":false,"stock":true,"auto_post":false,"bulk_upload":false,"multi_brand":false}'::jsonb),
  ('starter_y', 'subscription', 'Starter', 800,  9990,  'year',  '{"library":true,"calendar":false,"brand_kit":true,"watermark":false,"priority":false,"stock":true,"auto_post":false,"bulk_upload":false,"multi_brand":false}'::jsonb),
  ('growth_m',  'subscription', 'Growth',  2400, 2999,  'month', '{"library":true,"calendar":true, "brand_kit":true,"watermark":false,"priority":false,"stock":true,"auto_post":true, "bulk_upload":false,"multi_brand":false}'::jsonb),
  ('growth_y',  'subscription', 'Growth',  2400, 29990, 'year',  '{"library":true,"calendar":true, "brand_kit":true,"watermark":false,"priority":false,"stock":true,"auto_post":true, "bulk_upload":false,"multi_brand":false}'::jsonb),
  ('pro_m',     'subscription', 'Pro',     5500, 6999,  'month', '{"library":true,"calendar":true, "brand_kit":true,"watermark":false,"priority":true, "stock":true,"auto_post":true, "bulk_upload":true, "multi_brand":true}'::jsonb),
  ('pro_y',     'subscription', 'Pro',     5500, 69990, 'year',  '{"library":true,"calendar":true, "brand_kit":true,"watermark":false,"priority":true, "stock":true,"auto_post":true, "bulk_upload":true, "multi_brand":true}'::jsonb),
  ('pack_300',  'pack',         '300 credits',  300,  599,  NULL, '{}'::jsonb),
  ('pack_800',  'pack',         '800 credits',  800,  1399, NULL, '{}'::jsonb),
  ('pack_2000', 'pack',         '2,000 credits',2000, 3199, NULL, '{}'::jsonb),
  ('pack_5000', 'pack',         '5,000 credits',5000, 7499, NULL, '{}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  kind = EXCLUDED.kind,
  name = EXCLUDED.name,
  credits = EXCLUDED.credits,
  price_inr = EXCLUDED.price_inr,
  interval = EXCLUDED.interval,
  features = EXCLUDED.features;

UPDATE public.user_credits SET plan_id = 'free' WHERE plan_id IN ('pack_10','pack_25','pack_60');
DELETE FROM public.razorpay_plans WHERE plan_id IN ('pack_10','pack_25','pack_60');
DELETE FROM public.plans WHERE id IN ('pack_10','pack_25','pack_60');

-- Reset every user to new Free 200
UPDATE public.user_credits
  SET plan_id = 'free',
      subscription_credits = 200,
      pack_credits = 0,
      period_start = NULL,
      period_end = NULL,
      razorpay_subscription_id = NULL,
      updated_at = now();

CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, plan_id, subscription_credits)
    VALUES (NEW.id, 'free', 200)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

-- Spend / refund helpers (bucket-aware; monthly first)
CREATE OR REPLACE FUNCTION public.spend_credits(_user_id uuid, _amount integer)
RETURNS TABLE(ok boolean, took_sub integer, took_pack integer, balance integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s integer; p integer; ts integer; tp integer;
BEGIN
  INSERT INTO public.user_credits (user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT subscription_credits, pack_credits INTO s, p
    FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;
  IF (COALESCE(s,0) + COALESCE(p,0)) < _amount THEN
    RETURN QUERY SELECT false, 0, 0, COALESCE(s,0) + COALESCE(p,0); RETURN;
  END IF;
  ts := LEAST(COALESCE(s,0), _amount);
  tp := _amount - ts;
  UPDATE public.user_credits
    SET subscription_credits = subscription_credits - ts,
        pack_credits = pack_credits - tp,
        updated_at = now()
    WHERE user_id = _user_id;
  RETURN QUERY SELECT true, ts, tp, (COALESCE(s,0) - ts) + (COALESCE(p,0) - tp);
END; $$;

CREATE OR REPLACE FUNCTION public.refund_credits(_user_id uuid, _sub integer, _pack integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.user_credits
    SET subscription_credits = subscription_credits + COALESCE(_sub, 0),
        pack_credits = pack_credits + COALESCE(_pack, 0),
        updated_at = now()
    WHERE user_id = _user_id;
END; $$;

-- Stock management
CREATE TABLE public.stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.generations(id) ON DELETE SET NULL,
  name text NOT NULL,
  sku text,
  quantity integer NOT NULL DEFAULT 0,
  low_stock_alert integer NOT NULL DEFAULT 3,
  cost_price_paise integer NOT NULL DEFAULT 0,
  selling_price_paise integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;
GRANT ALL ON public.stock_items TO service_role;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own stock"   ON public.stock_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts own stock" ON public.stock_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates own stock" ON public.stock_items FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner deletes own stock" ON public.stock_items FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_stock_items_user ON public.stock_items(user_id, updated_at DESC);
CREATE INDEX idx_stock_items_product ON public.stock_items(product_id);
CREATE TRIGGER stock_items_updated BEFORE UPDATE ON public.stock_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL CHECK (reason IN ('sold','restocked','damaged','returned','adjustment')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own movements"   ON public.stock_movements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts own movements" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_stock_movements_item ON public.stock_movements(stock_item_id, created_at DESC);
CREATE INDEX idx_stock_movements_user ON public.stock_movements(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.apply_stock_movement(
  _stock_item_id uuid, _delta integer, _reason text, _note text DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _owner uuid; _new_qty integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT user_id INTO _owner FROM public.stock_items WHERE id = _stock_item_id FOR UPDATE;
  IF _owner IS NULL OR _owner <> _uid THEN RAISE EXCEPTION 'Not your stock item'; END IF;
  IF _reason NOT IN ('sold','restocked','damaged','returned','adjustment') THEN
    RAISE EXCEPTION 'Invalid reason';
  END IF;
  UPDATE public.stock_items
    SET quantity = GREATEST(quantity + _delta, 0), updated_at = now()
    WHERE id = _stock_item_id
    RETURNING quantity INTO _new_qty;
  INSERT INTO public.stock_movements (user_id, stock_item_id, delta, reason, note)
    VALUES (_uid, _stock_item_id, _delta, _reason, _note);
  RETURN _new_qty;
END; $$;
