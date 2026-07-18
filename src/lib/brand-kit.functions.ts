import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BrandKit = {
  business_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  sells_what: string;
  sells_to: string;
  tone: string;
};

export const getMyBrandKit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("brand_kits")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as (BrandKit & { user_id: string }) | null;
  });

export const saveMyBrandKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<BrandKit>) => d)
  .handler(async ({ context, data }) => {
    const row = {
      user_id: context.userId,
      business_name: (data.business_name ?? "").slice(0, 120),
      logo_url: data.logo_url ?? null,
      primary_color: data.primary_color ?? "#E0402F",
      accent_color: data.accent_color ?? "#F5A623",
      sells_what: (data.sells_what ?? "").slice(0, 240),
      sells_to: (data.sells_to ?? "").slice(0, 240),
      tone: data.tone ?? "friendly",
    };
    const { error } = await context.supabase
      .from("brand_kits")
      .upsert(row, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const uploadBrandLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dataUrl: string }) => d)
  .handler(async ({ context, data }) => {
    const m = /^data:([^;]+);base64,(.+)$/.exec(data.dataUrl);
    if (!m) throw new Error("Invalid image");
    const mime = m[1];
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ext = mime.split("/")[1] || "png";
    const path = `logos/${context.userId}/${Date.now()}.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from("praan")
      .upload(path, bytes, { contentType: mime, upsert: true });
    if (error) throw new Error(error.message);
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("praan")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (sErr || !signed) throw new Error(sErr?.message ?? "sign failed");
    return { url: signed.signedUrl };
  });
