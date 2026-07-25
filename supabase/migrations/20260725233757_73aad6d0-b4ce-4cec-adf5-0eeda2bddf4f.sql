CREATE TABLE public.product_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  generation_id uuid NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL,
  video_type text NOT NULL,
  duration_sec integer NOT NULL,
  ratio text NOT NULL,
  script text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued',
  video_url text,
  thumb_url text,
  provider_request_id text,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  credits_spent integer NOT NULL DEFAULT 0,
  refund_sub integer NOT NULL DEFAULT 0,
  refund_pack integer NOT NULL DEFAULT 0,
  refunded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_videos TO authenticated;
GRANT ALL ON public.product_videos TO service_role;

ALTER TABLE public.product_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their videos"
  ON public.product_videos FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners delete their videos"
  ON public.product_videos FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX product_videos_generation_idx ON public.product_videos (generation_id, created_at DESC);
CREATE INDEX product_videos_user_idx ON public.product_videos (user_id, created_at DESC);
CREATE INDEX product_videos_batch_idx ON public.product_videos (batch_id);

CREATE TRIGGER update_product_videos_updated_at
  BEFORE UPDATE ON public.product_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.product_videos
  ADD CONSTRAINT product_videos_type_chk CHECK (video_type IN ('ad','usage','presenter')),
  ADD CONSTRAINT product_videos_ratio_chk CHECK (ratio IN ('9:16','1:1','16:9')),
  ADD CONSTRAINT product_videos_duration_chk CHECK (duration_sec IN (5,8)),
  ADD CONSTRAINT product_videos_status_chk CHECK (status IN ('queued','running','ready','failed','refunded'));