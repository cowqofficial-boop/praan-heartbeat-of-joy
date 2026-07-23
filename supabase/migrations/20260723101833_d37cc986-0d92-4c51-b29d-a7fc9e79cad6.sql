
ALTER TABLE public.brand_kits
  ADD COLUMN IF NOT EXISTS brand_model_source text NOT NULL DEFAULT 'ai',
  ADD COLUMN IF NOT EXISTS brand_model_photos jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.brand_kits
  DROP CONSTRAINT IF EXISTS brand_kits_brand_model_source_check;
ALTER TABLE public.brand_kits
  ADD CONSTRAINT brand_kits_brand_model_source_check
  CHECK (brand_model_source IN ('ai','user'));
