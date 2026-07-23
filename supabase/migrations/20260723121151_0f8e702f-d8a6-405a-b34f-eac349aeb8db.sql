UPDATE public.plans SET credits = 300 WHERE id = 'free';

UPDATE public.user_credits
  SET subscription_credits = GREATEST(subscription_credits, 300),
      updated_at = now()
  WHERE plan_id = 'free';

CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_credits (user_id, plan_id, subscription_credits)
    VALUES (NEW.id, 'free', 300)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;