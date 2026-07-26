CREATE TABLE public.brand_memory (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  learned jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_confirmed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_memory TO authenticated;
GRANT ALL ON public.brand_memory TO service_role;

ALTER TABLE public.brand_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own brand memory"
  ON public.brand_memory FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_brand_memory_updated_at
  BEFORE UPDATE ON public.brand_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.brand_memory_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  surface text NOT NULL,
  generation_id uuid,
  original_text text,
  edited_text text,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX brand_memory_events_user_created_idx
  ON public.brand_memory_events (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_memory_events TO authenticated;
GRANT ALL ON public.brand_memory_events TO service_role;

ALTER TABLE public.brand_memory_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own brand memory events"
  ON public.brand_memory_events FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);