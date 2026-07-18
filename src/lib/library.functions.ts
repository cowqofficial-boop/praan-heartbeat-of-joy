import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LibraryItem = {
  id: string;
  product_name: string | null;
  created_at: string;
  original_image_url: string | null;
  generated_images: unknown;
};

export const listMyProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("generations")
      .select("id, product_name, created_at, original_image_url, generated_images")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as LibraryItem[];
  });

export const renameMyProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name: string }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("generations")
      .update({ product_name: data.name.slice(0, 120) })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("generations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * When a user signs up, claim any recent anonymous generations from this browser
 * so they show up in the library.
 */
export const claimAnonProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { browserId: string }) => d)
  .handler(async ({ context, data }) => {
    if (!data.browserId) return { claimed: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("generations")
      .update({ user_id: context.userId })
      .eq("browser_id", data.browserId)
      .is("user_id", null)
      .select("id");
    if (error) throw new Error(error.message);
    return { claimed: rows?.length ?? 0 };
  });
