import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TourStatus = { completed: boolean; completed_at: string | null };

export const getTourStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TourStatus> => {
    const { data } = await context.supabase
      .from("user_preferences")
      .select("tour_completed_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    const completed_at = (data?.tour_completed_at as string | null) ?? null;
    return { completed: !!completed_at, completed_at };
  });

export const setTourCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date().toISOString();
    await context.supabase
      .from("user_preferences")
      .upsert(
        { user_id: context.userId, tour_completed_at: now, updated_at: now },
        { onConflict: "user_id" },
      );
    return { ok: true as const };
  });

export const resetTour = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const now = new Date().toISOString();
    await context.supabase
      .from("user_preferences")
      .upsert(
        { user_id: context.userId, tour_completed_at: null, updated_at: now },
        { onConflict: "user_id" },
      );
    return { ok: true as const };
  });
