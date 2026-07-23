CREATE TABLE public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  browser_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  refund_sub integer NOT NULL DEFAULT 0,
  refund_pack integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'succeeded', 'refunded', 'failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.generation_jobs TO service_role;

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_generation_jobs_updated_at
  BEFORE UPDATE ON public.generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();