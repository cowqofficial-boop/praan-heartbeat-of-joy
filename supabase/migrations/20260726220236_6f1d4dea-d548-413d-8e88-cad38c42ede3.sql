CREATE TABLE public.generation_components (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generation_id uuid NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  component_type text NOT NULL,
  component_key text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by text NOT NULL DEFAULT 'ai',
  credits_spent_total integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX generation_components_unique_idx
  ON public.generation_components (generation_id, component_type, COALESCE(component_key, ''));
CREATE INDEX generation_components_gen_idx ON public.generation_components (generation_id);
CREATE INDEX generation_components_user_idx ON public.generation_components (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_components TO authenticated;
GRANT ALL ON public.generation_components TO service_role;

ALTER TABLE public.generation_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own generation components"
  ON public.generation_components FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_generation_components_updated_at
  BEFORE UPDATE ON public.generation_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.generation_component_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id uuid NOT NULL REFERENCES public.generation_components(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'ai',
  credits_spent integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX generation_component_versions_component_idx
  ON public.generation_component_versions (component_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generation_component_versions TO authenticated;
GRANT ALL ON public.generation_component_versions TO service_role;

ALTER TABLE public.generation_component_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their own component versions"
  ON public.generation_component_versions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Keep only the 10 most recent versions per component.
CREATE OR REPLACE FUNCTION public.trim_component_versions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.generation_component_versions v
  WHERE v.component_id = NEW.component_id
    AND v.id NOT IN (
      SELECT id FROM public.generation_component_versions
      WHERE component_id = NEW.component_id
      ORDER BY created_at DESC
      LIMIT 10
    );
  RETURN NULL;
END;
$$;

CREATE TRIGGER trim_generation_component_versions
  AFTER INSERT ON public.generation_component_versions
  FOR EACH ROW EXECUTE FUNCTION public.trim_component_versions();