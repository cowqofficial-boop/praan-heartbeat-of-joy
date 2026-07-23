import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CostRow = {
  id: string;
  created_at: string;
  product_name: string | null;
  user_id: string | null;
  text_model: string | null;
  image_model: string | null;
  image_count: number | null;
  image_resolution: number | null;
};

export const listRecentGenerations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: rErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (rErr) throw new Error(rErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("generations")
      .select("id, created_at, product_name, user_id, gen_metadata")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r): CostRow => {
      const m = (r.gen_metadata ?? {}) as Record<string, unknown>;
      return {
        id: r.id as string,
        created_at: r.created_at as string,
        product_name: r.product_name as string | null,
        user_id: r.user_id as string | null,
        text_model: (m.text_model as string) ?? null,
        image_model: (m.image_model as string) ?? null,
        image_count: (m.image_count as number) ?? null,
        image_resolution: (m.image_resolution as number) ?? null,
      };
    });
  });
