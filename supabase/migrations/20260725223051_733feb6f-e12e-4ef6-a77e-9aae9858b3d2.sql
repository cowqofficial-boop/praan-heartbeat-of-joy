CREATE TABLE public.brand_models (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My model',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_models TO authenticated;
GRANT ALL ON public.brand_models TO service_role;

ALTER TABLE public.brand_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own saved models"
  ON public.brand_models FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_brand_models_user ON public.brand_models (user_id, created_at DESC);

CREATE TRIGGER trg_brand_models_updated_at BEFORE UPDATE ON public.brand_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();