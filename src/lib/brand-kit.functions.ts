import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { geminiGenerateImage } from "./gemini.server";

export type BrandKit = {
  business_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  sells_what: string;
  sells_to: string;
  tone: string;
  model_gender: string | null;
  model_age: string | null;
  model_skin: string | null;
  model_body: string | null;
  model_region: string | null;
  brand_model_enabled: boolean;
  brand_model_url: string | null;
  brand_model_source: "ai" | "user";
  brand_model_photos: string[];
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
      model_gender: data.model_gender ?? null,
      model_age: data.model_age ?? null,
      model_skin: data.model_skin ?? null,
      model_body: data.model_body ?? null,
      model_region: data.model_region ?? null,
      brand_model_enabled: data.brand_model_enabled ?? false,
      brand_model_url: data.brand_model_url ?? null,
      brand_model_source: data.brand_model_source ?? "ai",
      brand_model_photos: (data.brand_model_photos ?? []).slice(0, 3),
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

// ---------- Brand model portrait ----------

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function describeModelPrefs(k: {
  model_gender?: string | null;
  model_age?: string | null;
  model_skin?: string | null;
  model_body?: string | null;
  model_region?: string | null;
}): string {
  const parts: string[] = [];
  if (k.model_gender) parts.push(k.model_gender);
  if (k.model_age) parts.push(`aged ${k.model_age}`);
  if (k.model_skin) parts.push(`${k.model_skin} skin`);
  if (k.model_body) parts.push(`${k.model_body} build`);
  if (k.model_region) parts.push(`${k.model_region} regional look`);
  return parts.length > 0 ? parts.join(", ") : "";
}

export const generateBrandModelPortrait = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { seedImageUrl?: string | null } = {}) => d)
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: kit } = await supabaseAdmin
      .from("brand_kits")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    const prefs = describeModelPrefs(kit ?? {});
    const who = prefs
      ? `The model is: ${prefs}.`
      : "Choose a natural-looking Indian adult with a warm, pleasant, approachable presence.";

    // Use a seed image if provided (e.g. a product photo to inform styling context).
    // Otherwise generate from a neutral 1x1 white pixel so the model has an image input.
    const WHITE_PX =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    let seed: { mimeType: string; b64: string } = { mimeType: "image/png", b64: WHITE_PX };
    if (data.seedImageUrl) {
      try {
        const res = await fetch(data.seedImageUrl);
        if (res.ok) {
          const mime = res.headers.get("content-type") || "image/jpeg";
          const buf = new Uint8Array(await res.arrayBuffer());
          let bin = "";
          for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
          seed = { mimeType: mime, b64: btoa(bin) };
        }
      } catch { /* fall back to white pixel */ }
    }

    const prompt = `Portrait of one person for a brand model reference. ${who}
Photorealistic, natural pose, natural indoor daylight, plain neutral background, head-and-shoulders framing centered, calm pleasant expression, hands and fingers correct, no props, no text, no logo, no watermark. This is a reference portrait to be reused across a shop's product photography, so the person should look consistent, believable, and ordinary — not a fashion cover, not an editorial shot.`;

    const out = await geminiGenerateImage({
      prompt,
      reference: seed,
    });

    const path = `brand-models/${context.userId}/${Date.now()}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("praan")
      .upload(path, b64ToBytes(out.b64), { contentType: "image/png", upsert: true });
    if (upErr) throw new Error(upErr.message);
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("praan")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (sErr || !signed) throw new Error(sErr?.message ?? "sign failed");

    const url = signed.signedUrl;
    const { error: updErr } = await supabaseAdmin
      .from("brand_kits")
      .update({ brand_model_url: url, brand_model_enabled: true })
      .eq("user_id", context.userId);
    if (updErr) throw new Error(updErr.message);
    return { url };
  });

export const setBrandModelEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { enabled: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("brand_kits")
      .update({ brand_model_enabled: data.enabled })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
