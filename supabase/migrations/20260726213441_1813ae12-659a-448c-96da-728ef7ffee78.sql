DROP POLICY "Public shop listings are readable" ON public.generations;
DROP POLICY "Public shop stock items are readable" ON public.stock_items;
DROP FUNCTION IF EXISTS public.is_shop_published(uuid);

CREATE POLICY "Public shop listings are readable"
  ON public.generations FOR SELECT TO anon
  USING (
    public_visible
    AND user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shop_settings s
      WHERE s.user_id = generations.user_id AND s.published
    )
  );

CREATE POLICY "Public shop stock items are readable"
  ON public.stock_items FOR SELECT TO anon
  USING (
    public_visible
    AND EXISTS (
      SELECT 1 FROM public.shop_settings s
      WHERE s.user_id = stock_items.user_id AND s.published
    )
  );