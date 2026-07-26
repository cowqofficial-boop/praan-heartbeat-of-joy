ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS service_details jsonb;

ALTER TABLE public.generations
  ADD CONSTRAINT generations_kind_check CHECK (kind IN ('product','service'));

CREATE INDEX IF NOT EXISTS generations_user_kind_created_idx
  ON public.generations (user_id, kind, created_at DESC);

ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'product';

ALTER TABLE public.stock_items
  ADD CONSTRAINT stock_items_kind_check CHECK (kind IN ('product','service'));

CREATE INDEX IF NOT EXISTS stock_items_user_kind_idx
  ON public.stock_items (user_id, kind);