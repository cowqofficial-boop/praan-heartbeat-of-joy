import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { geminiGenerateImage } from "./gemini.server";
import { COSTS, planModelSlots } from "./plans";


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
  model_nationality: string | null;
  model_cultural_style: string | null;
  model_occasion: string | null;
  model_hair: string | null;
  model_expression: string | null;
  model_pose: string | null;

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
      primary_color: data.primary_color ?? "#3D5AFE",
      accent_color: data.accent_color ?? "#FF2FA3",
      sells_what: (data.sells_what ?? "").slice(0, 240),
      sells_to: (data.sells_to ?? "").slice(0, 240),
      tone: data.tone ?? "friendly",
      model_gender: data.model_gender ?? null,
      model_age: data.model_age ?? null,
      model_skin: data.model_skin ?? null,
      model_body: data.model_body ?? null,
      model_region: data.model_region ?? null,
      model_nationality: data.model_nationality ?? null,
      model_cultural_style: data.model_cultural_style ?? null,
      model_occasion: data.model_occasion ?? null,
      model_hair: data.model_hair ?? null,
      model_expression: data.model_expression ?? null,
      model_pose: data.model_pose ?? null,

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
  model_nationality?: string | null;
  model_hair?: string | null;
  model_expression?: string | null;
  model_pose?: string | null;
}): string {
  const parts: string[] = [];
  if (k.model_gender) parts.push(k.model_gender);
  if (k.model_age) parts.push(`aged ${k.model_age}`);
  if (k.model_nationality)
    parts.push(`overall appearance is ${NATIONALITY_PROMPT[k.model_nationality] ?? k.model_nationality}`);
  if (k.model_skin) parts.push(`${k.model_skin} skin`);
  if (k.model_body) parts.push(`${k.model_body} build`);
  if (k.model_region) parts.push(`${k.model_region} regional look`);
  if (k.model_hair) parts.push(`${HAIR_PROMPT[k.model_hair] ?? k.model_hair} hair`);
  if (k.model_expression) parts.push(`${EXPRESSION_PROMPT[k.model_expression] ?? k.model_expression} expression`);
  return parts.length > 0 ? parts.join(", ") : "";
}

const NATIONALITY_PROMPT: Record<string, string> = {
  indian: "Indian",
  pakistani: "Pakistani",
  bangladeshi: "Bangladeshi",
  sri_lankan: "Sri Lankan",
  nepali: "Nepali",
  middle_eastern: "Middle Eastern / Arab",
  southeast_asian: "Southeast Asian",
  east_asian: "East Asian",
  african: "African",
  european: "European / Western",
  latin_american: "Latin American",
};

const HAIR_PROMPT: Record<string, string> = {
  short: "short",
  long: "long",
  tied: "neatly tied-up",
  covered: "covered (scarf or dupatta over the hair)",
};

const EXPRESSION_PROMPT: Record<string, string> = {
  smile: "a warm, genuine smile",
  neutral: "a calm, neutral",
  confident: "a confident, self-assured",
};

const POSE_PROMPT: Record<string, string> = {
  standing: "Pose the model standing naturally, full or three-quarter length, product clearly visible.",
  closeup: "Frame a close-up detail shot that shows the product on the person up close, cropped tight on the product area.",
  holding: "Pose the model holding and showing the product in hand, product clearly presented to the camera.",
};

// Attire / adornment guidance only — never a statement about a person's faith,
// and never tied to skin tone or facial features (those are separate seller fields).
const CULTURAL_PROMPT: Record<string, string> = {
  hindu_traditional:
    "Style the model in traditional Indian attire (saree or salwar kameez). Add culturally appropriate adornments, all clearly visible: a bindi on the forehead, a mangalsutra or traditional necklace, bangles on the wrists, and small ear studs or jhumkas. If the drape suits it, a subtle line of sindoor in the hair parting. Keep it tasteful and everyday, not bridal.",
  muslim_hijab:
    "Style the model wearing a neatly draped hijab clearly visible and fully covering the hair, with modest full-coverage clothing (long sleeves, modest neckline). Simple, elegant styling — optional subtle earrings or a delicate necklace.",
  sikh_turban:
    "Style the model in attire suited to Punjabi Sikh presentation. For a woman: a salwar kameez with a dupatta, optionally draped over the head; simple traditional jewellery. For a man: a neatly tied turban and a kara (steel bangle) on the wrist, both clearly visible.",
  christian:
    "Style the model in modest smart-casual or church-going Western attire. Optional simple cross pendant necklace, understated jewellery.",
  south_indian:
    "Style the model in South Indian traditional attire, all details clearly visible: a silk saree with a contrasting gold border, jasmine flowers (gajra) in the hair, temple-style gold jewellery — jhumkas, a gold necklace, bangles, and a bindi.",
  north_indian:
    "Style the model in North Indian traditional attire, all details clearly visible: a salwar kameez with dupatta or a kurta with churidar, a bindi, jhumkas or studs, bangles, and a light necklace.",
  modern_western:
    "Style the model in clean, modern Western everyday clothing. Minimal, contemporary jewellery.",
  none: "",
};

const OCCASION_SCENE: Record<string, string> = {
  diwali: "Occasion styling: Diwali. Warm evening lamp light, subtle diyas, marigold and rangoli hints in the setting — kept simple and never covering the product.",
  wedding: "Occasion styling: an Indian wedding. Richer, more formal setting and warm celebratory light, with restrained floral decor in the background.",
  navratri: "Occasion styling: Navratri. Bright festive colours, simple mirror-work and garba-season decor hints in the background.",
  eid: "Occasion styling: Eid. Elegant evening setting, crescent-moon and lantern hints, warm restrained decor.",
  christmas: "Occasion styling: Christmas. Cool evening light with warm fairy lights, pine and simple ornament hints in the background.",
  summer: "Occasion styling: summer. Bright natural daylight, light airy surfaces, fresh uncluttered setting.",
  festive: "Occasion styling: a general Indian festive moment. Warm celebratory light and simple festive props in the background.",
  everyday: "",
};

const OCCASION_ATTIRE: Record<string, string> = {
  diwali: "Dress the model in festive Diwali attire — celebratory but wearable, not costume.",
  wedding: "Dress the model in formal wedding-guest attire, richer fabrics and jewellery.",
  navratri: "Dress the model in bright Navratri festive attire.",
  eid: "Dress the model in elegant Eid attire, modest and well put together.",
  christmas: "Dress the model in smart festive Christmas attire.",
  summer: "Dress the model in light summer clothing suited to hot weather.",
  festive: "Dress the model in festive attire, celebratory but everyday-wearable.",
  everyday: "",
};

/** Attire/styling guidance for on-model shots only. */
export function describeModelStyling(k: {
  model_cultural_style?: string | null;
  model_occasion?: string | null;
  model_pose?: string | null;
}): string {
  const parts = [
    k.model_cultural_style ? CULTURAL_PROMPT[k.model_cultural_style] ?? "" : "",
    k.model_occasion ? OCCASION_ATTIRE[k.model_occasion] ?? "" : "",
    k.model_pose ? POSE_PROMPT[k.model_pose] ?? "" : "",
  ].filter(Boolean);
  return parts.join(" ");
}

/** Scene/prop/lighting guidance — applies to every shot, on-model or product-only. */
export function describeOccasionScene(k: { model_occasion?: string | null }): string {
  return (k.model_occasion ? OCCASION_SCENE[k.model_occasion] ?? "" : "");
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

// ---------- Real (user-uploaded) brand model photos ----------

function extractStoragePath(url: string): string | null {
  // Match .../object/(sign|public)/<bucket>/<path>?...
  const m = /\/object\/(?:sign|public)\/[^/]+\/([^?]+)/.exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

export const uploadBrandModelPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      dataUrls: string[];
      consentAgreed: boolean;
      consentAdult: boolean;
      consentNotPublicFigure: boolean;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    if (!data.consentAgreed || !data.consentAdult || !data.consentNotPublicFigure) {
      throw new Error("You must confirm all three statements before uploading.");
    }
    if (!Array.isArray(data.dataUrls) || data.dataUrls.length === 0) {
      throw new Error("Add at least one photo.");
    }
    const dataUrls = data.dataUrls.slice(0, 3);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Remove any previously uploaded real-model photos first.
    const { data: existing } = await supabaseAdmin
      .from("brand_kits")
      .select("brand_model_photos")
      .eq("user_id", context.userId)
      .maybeSingle();
    const prev = (existing?.brand_model_photos ?? []) as string[];
    if (prev.length > 0) {
      const paths = prev.map(extractStoragePath).filter((p): p is string => !!p);
      if (paths.length > 0) await supabaseAdmin.storage.from("praan").remove(paths);
    }

    const urls: string[] = [];
    for (let i = 0; i < dataUrls.length; i++) {
      const url = dataUrls[i];
      const m = /^data:([^;]+);base64,(.+)$/.exec(url);
      if (!m) throw new Error("Invalid image");
      const mime = m[1];
      const bin = atob(m[2]);
      const bytes = new Uint8Array(bin.length);
      for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
      const ext = mime.split("/")[1] || "png";
      const path = `brand-models/${context.userId}/real-${Date.now()}-${i}.${ext}`;
      const { error } = await supabaseAdmin.storage
        .from("praan")
        .upload(path, bytes, { contentType: mime, upsert: true });
      if (error) throw new Error(error.message);
      const { data: signed, error: sErr } = await supabaseAdmin.storage
        .from("praan")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr || !signed) throw new Error(sErr?.message ?? "sign failed");
      urls.push(signed.signedUrl);
    }

    const { error: updErr } = await supabaseAdmin
      .from("brand_kits")
      .update({
        brand_model_photos: urls,
        brand_model_source: "user",
        brand_model_enabled: true,
        brand_model_url: urls[0],
      })
      .eq("user_id", context.userId);
    if (updErr) throw new Error(updErr.message);
    return { urls };
  });

export const removeRealBrandModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("brand_kits")
      .select("brand_model_photos")
      .eq("user_id", context.userId)
      .maybeSingle();
    const prev = (existing?.brand_model_photos ?? []) as string[];
    if (prev.length > 0) {
      const paths = prev.map(extractStoragePath).filter((p): p is string => !!p);
      if (paths.length > 0) await supabaseAdmin.storage.from("praan").remove(paths);
    }
    const { error } = await supabaseAdmin
      .from("brand_kits")
      .update({
        brand_model_photos: [],
        brand_model_source: "ai",
        brand_model_enabled: false,
        brand_model_url: null,
      })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Saved real models (slots by plan) ----------

export type SavedModel = {
  id: string;
  name: string;
  photos: string[];
  is_active: boolean;
  created_at: string;
};

const SAVE_MODEL_COST = COSTS.brand_model;

async function loadPlanState(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: credits } = await supabaseAdmin
    .from("user_credits")
    .select("plan_id, subscription_credits, pack_credits")
    .eq("user_id", userId)
    .maybeSingle();
  const planId = credits?.plan_id ?? "free";
  return {
    supabaseAdmin,
    planId,
    slots: planModelSlots(planId),
    balance: (credits?.subscription_credits ?? 0) + (credits?.pack_credits ?? 0),
  };
}

export const listMyBrandModels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin, planId, slots, balance } = await loadPlanState(context.userId);
    const { data, error } = await supabaseAdmin
      .from("brand_models")
      .select("id, name, photos, is_active, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return {
      models: (data ?? []) as SavedModel[],
      plan_id: planId,
      slots,
      balance,
      save_cost: SAVE_MODEL_COST,
    };
  });

export const saveBrandModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      name: string;
      dataUrls: string[];
      consentAgreed: boolean;
      consentAdult: boolean;
      consentNotPublicFigure: boolean;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    if (!data.consentAgreed || !data.consentAdult || !data.consentNotPublicFigure) {
      throw new Error("You must confirm all three statements before uploading.");
    }
    if (!Array.isArray(data.dataUrls) || data.dataUrls.length === 0) {
      throw new Error("Add at least one photo.");
    }
    const { supabaseAdmin, slots } = await loadPlanState(context.userId);
    if (slots === 0) {
      throw new Error("Saved models are on Growth & Pro. Upgrade your plan to save a model.");
    }
    const { count } = await supabaseAdmin
      .from("brand_models")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId);
    if ((count ?? 0) >= slots) {
      throw new Error(`Your plan saves ${slots} model${slots === 1 ? "" : "s"}. Remove one first.`);
    }

    // Charge before storing — a saved model is a stored asset.
    const { data: rows, error: spendErr } = await supabaseAdmin.rpc("spend_credits", {
      _user_id: context.userId,
      _amount: SAVE_MODEL_COST,
    });
    if (spendErr) throw new Error(spendErr.message);
    const spend = Array.isArray(rows) ? rows[0] : rows;
    if (!spend?.ok) {
      throw new Error(`NO_CREDITS:${SAVE_MODEL_COST}:${spend?.balance ?? 0}`);
    }

    try {
      const urls: string[] = [];
      for (let i = 0; i < data.dataUrls.slice(0, 5).length; i++) {
        const m = /^data:([^;]+);base64,(.+)$/.exec(data.dataUrls[i]);
        if (!m) throw new Error("Invalid image");
        const mime = m[1];
        const ext = mime.split("/")[1] || "png";
        const path = `brand-models/${context.userId}/saved-${Date.now()}-${i}.${ext}`;
        const { error } = await supabaseAdmin.storage
          .from("praan")
          .upload(path, b64ToBytes(m[2]), { contentType: mime, upsert: true });
        if (error) throw new Error(error.message);
        const { data: signed, error: sErr } = await supabaseAdmin.storage
          .from("praan")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (sErr || !signed) throw new Error(sErr?.message ?? "sign failed");
        urls.push(signed.signedUrl);
      }

      const name = (data.name || "My model").trim().slice(0, 40) || "My model";
      const { data: inserted, error: insErr } = await supabaseAdmin
        .from("brand_models")
        .insert({ user_id: context.userId, name, photos: urls, is_active: true })
        .select("id, name, photos, is_active, created_at")
        .single();
      if (insErr) throw new Error(insErr.message);

      await supabaseAdmin
        .from("brand_models")
        .update({ is_active: false })
        .eq("user_id", context.userId)
        .neq("id", inserted.id);
      await applyActiveModelToKit(supabaseAdmin, context.userId, urls);

      return { model: inserted as SavedModel };
    } catch (e) {
      await supabaseAdmin.rpc("refund_credits", {
        _user_id: context.userId,
        _sub: spend.took_sub ?? 0,
        _pack: spend.took_pack ?? 0,
      });
      throw e;
    }
  });

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function applyActiveModelToKit(sb: Admin, userId: string, photos: string[]) {
  await sb
    .from("brand_kits")
    .upsert(
      {
        user_id: userId,
        brand_model_photos: photos,
        brand_model_source: photos.length > 0 ? "user" : "ai",
        brand_model_enabled: photos.length > 0,
        brand_model_url: photos[0] ?? null,
      },
      { onConflict: "user_id" },
    );
}

export const setActiveBrandModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("brand_models")
      .select("id, photos")
      .eq("user_id", context.userId)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("That model no longer exists.");
    await supabaseAdmin
      .from("brand_models")
      .update({ is_active: false })
      .eq("user_id", context.userId);
    await supabaseAdmin
      .from("brand_models")
      .update({ is_active: true })
      .eq("user_id", context.userId)
      .eq("id", data.id);
    await applyActiveModelToKit(supabaseAdmin, context.userId, (row.photos ?? []) as string[]);
    return { ok: true };
  });

export const renameBrandModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const name = (data.name || "").trim().slice(0, 40) || "My model";
    const { error } = await supabaseAdmin
      .from("brand_models")
      .update({ name })
      .eq("user_id", context.userId)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, name };
  });

export const deleteBrandModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("brand_models")
      .select("id, photos, is_active")
      .eq("user_id", context.userId)
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { ok: true };
    const paths = ((row.photos ?? []) as string[]).map(extractStoragePath).filter((p): p is string => !!p);
    if (paths.length > 0) await supabaseAdmin.storage.from("praan").remove(paths);
    const { error } = await supabaseAdmin
      .from("brand_models")
      .delete()
      .eq("user_id", context.userId)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row.is_active) {
      const { data: next } = await supabaseAdmin
        .from("brand_models")
        .select("id, photos")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (next) {
        await supabaseAdmin.from("brand_models").update({ is_active: true }).eq("id", next.id);
        await applyActiveModelToKit(supabaseAdmin, context.userId, (next.photos ?? []) as string[]);
      } else {
        await applyActiveModelToKit(supabaseAdmin, context.userId, []);
      }
    }
    return { ok: true };
  });

