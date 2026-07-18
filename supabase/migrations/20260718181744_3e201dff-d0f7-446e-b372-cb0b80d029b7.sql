
CREATE TABLE public.generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  browser_id TEXT NOT NULL,
  original_image_url TEXT,
  product_name TEXT,
  price NUMERIC,
  detail TEXT,
  category TEXT,
  generated_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  copy JSONB,
  csv_url TEXT,
  feedback_rating INTEGER,
  feedback_text TEXT
);
GRANT SELECT, INSERT, UPDATE ON public.generations TO anon, authenticated;
GRANT ALL ON public.generations TO service_role;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read generations" ON public.generations FOR SELECT USING (true);
CREATE POLICY "Anyone can insert generations" ON public.generations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update generations" ON public.generations FOR UPDATE USING (true) WITH CHECK (true);

CREATE TABLE public.daily_usage (
  browser_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT current_date,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (browser_id, date)
);
GRANT SELECT, INSERT, UPDATE ON public.daily_usage TO anon, authenticated;
GRANT ALL ON public.daily_usage TO service_role;
ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read daily_usage" ON public.daily_usage FOR SELECT USING (true);
CREATE POLICY "Anyone can insert daily_usage" ON public.daily_usage FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update daily_usage" ON public.daily_usage FOR UPDATE USING (true) WITH CHECK (true);
