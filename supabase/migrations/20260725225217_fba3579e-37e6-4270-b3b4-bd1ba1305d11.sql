ALTER TABLE public.brand_kits
  ADD COLUMN IF NOT EXISTS model_cultural_style text,
  ADD COLUMN IF NOT EXISTS model_occasion text,
  ADD COLUMN IF NOT EXISTS model_hair text,
  ADD COLUMN IF NOT EXISTS model_expression text,
  ADD COLUMN IF NOT EXISTS model_pose text;