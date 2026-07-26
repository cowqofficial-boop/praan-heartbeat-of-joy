ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gstin text,
  ADD COLUMN IF NOT EXISTS invoice_business_name text,
  ADD COLUMN IF NOT EXISTS invoice_address text,
  ADD COLUMN IF NOT EXISTS invoice_state_code text;

CREATE SEQUENCE IF NOT EXISTS public.invoice_seq START 1;

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  invoice_no text NOT NULL UNIQUE,
  invoice_date timestamptz NOT NULL DEFAULT now(),
  plan_id text NOT NULL,
  plan_name text NOT NULL,
  buyer_name text,
  buyer_gstin text,
  buyer_address text,
  buyer_state_code text,
  total_paise integer NOT NULL DEFAULT 0,
  taxable_paise integer NOT NULL DEFAULT 0,
  cgst_paise integer NOT NULL DEFAULT 0,
  sgst_paise integer NOT NULL DEFAULT 0,
  igst_paise integer NOT NULL DEFAULT 0,
  is_gst_invoice boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
CREATE POLICY "Users can view their own invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS invoices_user_created_idx ON public.invoices (user_id, created_at DESC);

DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();