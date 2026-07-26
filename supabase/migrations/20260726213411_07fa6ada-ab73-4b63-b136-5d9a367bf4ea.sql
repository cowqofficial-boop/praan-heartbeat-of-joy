CREATE TABLE public.shop_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  published boolean NOT NULL DEFAULT false,
  shop_name text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  logo_url text,
  contact_method text NOT NULL DEFAULT 'whatsapp',
  contact_value text NOT NULL DEFAULT '',
  social_instagram text,
  social_facebook text,
  social_linkedin text,
  social_x text,
  social_youtube text,
  social_website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shop_settings_published_slug_idx ON public.shop_settings (slug) WHERE published;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shop_settings TO authenticated;
GRANT SELECT ON public.shop_settings TO anon;
GRANT ALL ON public.shop_settings TO service_role;

ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their shop settings"
  ON public.shop_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Published shops are publicly readable"
  ON public.shop_settings FOR SELECT TO anon
  USING (published);

CREATE TRIGGER update_shop_settings_updated_at
  BEFORE UPDATE ON public.shop_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_shop_published(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shop_settings
    WHERE user_id = _user_id AND published
  )
$$;

ALTER TABLE public.generations ADD COLUMN public_visible boolean NOT NULL DEFAULT false;
ALTER TABLE public.stock_items ADD COLUMN public_visible boolean NOT NULL DEFAULT false;

GRANT SELECT ON public.generations TO anon;
GRANT SELECT ON public.stock_items TO anon;

CREATE POLICY "Public shop listings are readable"
  ON public.generations FOR SELECT TO anon
  USING (public_visible AND user_id IS NOT NULL AND public.is_shop_published(user_id));

CREATE POLICY "Public shop stock items are readable"
  ON public.stock_items FOR SELECT TO anon
  USING (public_visible AND public.is_shop_published(user_id));