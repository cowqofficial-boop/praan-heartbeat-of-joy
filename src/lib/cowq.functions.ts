import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildShopifyCsv, slugify } from "./csv";
import {
  GEMINI_IMAGE_MODEL,
  GEMINI_TEXT_MODEL,
  geminiGenerateImage,
  geminiGenerateText,
  parseJsonLoose,
} from "./gemini.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

const BUCKET = "praan";

async function signedUrl(path: string, expires = 60 * 60 * 24 * 30): Promise<string> {
  const sb = await admin();
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, expires);
  if (error || !data) throw new Error(`sign failed: ${error?.message}`);
  return data.signedUrl;
}

async function uploadBytes(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const sb = await admin();
  const { error } = await sb.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`upload failed: ${error.message}`);
  return signedUrl(path);
}

async function fetchAsBase64(url: string): Promise<{ b64: string; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch image failed: ${res.status}`);
  const mime = res.headers.get("content-type") || "image/jpeg";
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const b64 = btoa(bin);
  return { b64, mime };
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- Upload ----------

export const uploadOriginal = createServerFn({ method: "POST" })
  .inputValidator((d: { dataUrl: string; browserId: string }) => d)
  .handler(async ({ data }) => {
    const m = /^data:([^;]+);base64,(.+)$/.exec(data.dataUrl);
    if (!m) throw new Error("Invalid image");
    const mime = m[1];
    const bytes = b64ToBytes(m[2]);
    const ext = mime.split("/")[1] || "jpg";
    const path = `originals/${data.browserId}/${Date.now()}.${ext}`;
    const url = await uploadBytes(path, bytes, mime);
    return { url, path };
  });

// ---------- Identify ----------

const IdentifiedSchema = z.object({
  name: z.string(),
  category: z.string(),
  material: z.string(),
  color: z.string(),
  features: z.array(z.string()),
  needs_person: z.boolean().optional(),
  is_kidswear: z.boolean().optional(),
  is_draped_garment: z.boolean().optional(),
});

export const identifyProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { imageUrl?: string; imageUrls?: string[] }) => d)
  .handler(async ({ data }) => {
    const urls = data.imageUrls && data.imageUrls.length > 0
      ? data.imageUrls
      : data.imageUrl
        ? [data.imageUrl]
        : [];
    if (urls.length === 0) throw new Error("No image provided");
    const refs = await Promise.all(urls.slice(0, 5).map((u) => fetchAsBase64(u)));
    const imageParts = refs.map((r) => ({ inlineData: { mimeType: r.mime, data: r.b64 } }));
    const guidance =
      refs.length > 1
        ? `You are shown ${refs.length} photos of the SAME single product taken from different angles (front, back, close-up, label, etc.). Combine them into one accurate understanding of the item — its true shape from every side, its material, its true colour, any text or labels, and how it is constructed. The first photo is the primary reference.`
        : "You are shown one photo of a product.";
    const text = await geminiGenerateText({
      systemInstruction:
        "You identify products from photos for Indian e-commerce sellers. Reply with a compact JSON object only, no prose, no markdown fences.",
      parts: [
        ...imageParts,
        {
          text: `${guidance}\n\nIdentify this product. Return JSON: {"name": short product name (max 6 words, sentence case), "category": one broad category like Kitchen, Home Decor, Fashion, Beauty, Electronics, "material": main material or empty, "color": main color or empty, "features": array of exactly 3 short key features, "needs_person": true ONLY if this product is normally shown worn, held, or used by a person to sell it well — clothing, ethnic wear (saree, kurta, lehenga, dupatta), jewellery, footwear, bags, eyewear, watches, scarves, cosmetics and beauty products applied to skin/face. false for electronics, home decor, furniture, kitchenware, food, drink, stationery, toys, tools, plants, packaged goods. "is_kidswear": true if this is clothing, footwear, or apparel intended for children under 18 (kidswear, babywear, school uniforms, kids' shoes). Otherwise false. "is_draped_garment": true only for draped Indian garments like saree, dupatta, lehenga fabric, stole; false for stitched garments (kurta, shirt, dress, trouser, blouse).}`,
        },
      ],
      responseMimeType: "application/json",
      temperature: 0.2,
    });
    const parsed = parseJsonLoose<unknown>(text) ?? {};
    const r = IdentifiedSchema.safeParse(parsed);
    const val = r.success
      ? r.data
      : { name: "Product", category: "General", material: "", color: "", features: [], needs_person: false, is_kidswear: false, is_draped_garment: false };
    while (val.features.length < 3) val.features.push("");
    val.features = val.features.slice(0, 3);
    return {
      ...val,
      needs_person: val.needs_person ?? false,
      is_kidswear: val.is_kidswear ?? false,
      is_draped_garment: val.is_draped_garment ?? false,
    };
  });




// ---------- Rate limit ----------

const DAILY_LIMIT = 5;

async function checkAndIncrementLimit(browserId: string): Promise<void> {
  const sb = await admin();
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await sb
    .from("daily_usage")
    .select("count")
    .eq("browser_id", browserId)
    .eq("date", today)
    .maybeSingle();
  const count = existing?.count ?? 0;
  if (count >= DAILY_LIMIT) {
    throw new Error("DAILY_LIMIT");
  }
  if (existing) {
    await sb
      .from("daily_usage")
      .update({ count: count + 1 })
      .eq("browser_id", browserId)
      .eq("date", today);
  } else {
    await sb.from("daily_usage").insert({ browser_id: browserId, date: today, count: 1 });
  }
}

async function decrementLimit(browserId: string): Promise<void> {
  const sb = await admin();
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await sb
    .from("daily_usage")
    .select("count")
    .eq("browser_id", browserId)
    .eq("date", today)
    .maybeSingle();
  if (!existing) return;
  await sb
    .from("daily_usage")
    .update({ count: Math.max((existing.count ?? 1) - 1, 0) })
    .eq("browser_id", browserId)
    .eq("date", today);
}

async function refundGenerationReservation(jobId: string, browserId: string, reason: string): Promise<boolean> {
  const sb = await admin();
  const { data: job, error } = await sb
    .from("generation_jobs")
    .select("id, user_id, refund_sub, refund_pack, status")
    .eq("id", jobId)
    .eq("browser_id", browserId)
    .maybeSingle();
  if (error || !job || job.status !== "reserved") return false;
  if (job.user_id) {
    await sb.rpc("refund_credits", {
      _user_id: job.user_id,
      _sub: job.refund_sub ?? 0,
      _pack: job.refund_pack ?? 0,
    });
  } else {
    await decrementLimit(browserId);
  }
  await sb
    .from("generation_jobs")
    .update({ status: "refunded", error: reason.slice(0, 1000) })
    .eq("id", jobId)
    .eq("status", "reserved");
  console.info(`[generation] refunded job=${jobId} browser=${browserId} reason=${reason.slice(0, 240)}`);
  return true;
}

async function ensureGenerationReserved(jobId: string, browserId: string): Promise<void> {
  const sb = await admin();
  const { data: job, error } = await sb
    .from("generation_jobs")
    .select("status")
    .eq("id", jobId)
    .eq("browser_id", browserId)
    .maybeSingle();
  if (error || !job) throw new Error("Generation job was not found. Try again.");
  if (job.status !== "reserved") throw new Error("GENERATION_JOB_CLOSED");
}

async function markGenerationSucceeded(jobId: string, browserId: string): Promise<void> {
  const sb = await admin();
  await sb
    .from("generation_jobs")
    .update({ status: "succeeded", error: null })
    .eq("id", jobId)
    .eq("browser_id", browserId)
    .eq("status", "reserved");
}

// ---------- Image generation ----------

const NO_PEOPLE =
  "Absolutely no people, no humans, no hands, no fingers, no arms, no models, no figures, no silhouettes — not even blurred in the background.";

type StyleDef = { kind: string; prompt: string; hasPerson?: boolean };

const PRODUCT_STYLES: StyleDef[] = [
  {
    kind: "white",
    prompt:
      "Reproduce the exact same product from the input photo — same shape, colour, material, branding, and label. Place it on a pure clean white studio background suitable for Amazon/Flipkart, soft even lighting, subtle contact shadow, centred, no props, no text, high detail, photorealistic.",
  },
  {
    kind: "studio",
    prompt:
      "Same product from the input photo, kept faithful in every detail. Place it on a neutral warm surface with soft studio lighting, gentle side shadow, minimal styling, premium e-commerce look, photorealistic.",
  },
  {
    kind: "lifestyle",
    prompt:
      "Same product from the input photo, kept faithful. First determine where this specific product is actually used or kept in real life, then set the scene in exactly that place — e.g. a speaker on a desk or bedside table, a spice jar on a kitchen shelf, a cushion on a sofa, a mug on a breakfast table. Never use a generic shop, market stall, bazaar, workshop, or warehouse backdrop unless the product itself is shop equipment. Keep the scene simple: one clear surface, at most two or three small props that genuinely belong with this product. The product remains the clear hero, centred and uncrowded. Soft natural daylight, shallow depth of field, photorealistic, no text.",
  },
  {
    kind: "flatlay",
    prompt:
      "Same product from the input photo, kept faithful. Styled overhead flat-lay on a textured neutral surface with two or three tasteful props that clearly belong with this product's real use. Balanced composition, soft daylight, product centred and clearly the hero, no text.",
  },
];

function personStyles(modelLine: string, brandModelBinding: string, isDraped: boolean): StyleDef[] {
  const drapeRules = `If it is a draped Indian garment (saree, dupatta, lehenga, stole), the COMPLETE drape must be visible and correctly formed in the frame: pleats neat at the waist, pallu over the LEFT shoulder falling to the back, border continuous and unbroken along the whole length, full length of the garment from shoulder to hem visible. If the correct drape cannot be produced with confidence, prefer a well-lit product-only shot to a badly draped or badly cropped model shot.`;
  const bodyRules = `Natural pose, natural light, hands and fingers correct (five fingers, no distortion), arms held slightly away from the body so the garment is not hidden, face calm and pleasant, nothing exaggerated, no fashion-editorial posing, no text, no logo, no watermark. The person is a clearly adult model — 25 to 40 years old, unmistakably an adult. Never depict a child, teenager, or minor.`;
  const fidelity = `The garment/item must match the uploaded photos exactly — same colour, same pattern, same border, same length, same fittings. Do not restyle, do not recolour, do not shorten, do not embellish.`;
  const FRAMING_HARD_RULE = `HARD FRAMING RULE — the entire product must be ENTIRELY WITHIN THE FRAME, fully visible from every side, with clear margin on all four sides, NEVER cut off by any edge of the image. Do not crop into the product. If framing forces a choice between showing the model's face and showing the whole garment, ALWAYS show the whole garment — crop the face, never the product.`;
  const whitePrompt = isDraped
    ? "Reproduce the exact same draped garment from the input photo — same colour, weave, border, and pattern. Present it for e-commerce WITHOUT a person: neatly folded on a clean white surface OR partially draped over a plain wooden hanger/stand so the fabric, border and pallu/pattern read clearly. Pure clean white studio background suitable for Amazon/Flipkart marketplace main image, soft even lighting, subtle contact shadow, centred, generous margin on all four sides so nothing touches the frame edge, no props, no text, high detail, photorealistic. Never a flat rectangle of cloth. No person, no hands, no mannequin face."
    : "Reproduce the exact same product from the input photo — same shape, colour, material, branding, and label. Place it on a pure clean white studio background suitable for Amazon/Flipkart marketplace main image, soft even lighting, subtle contact shadow, centred, generous even margin on all four sides so nothing touches the frame edge, no props, no text, high detail, photorealistic. No person.";
  return [
    { kind: "white", prompt: whitePrompt },
    {
      kind: "studio",
      prompt:
        "Same product from the input photo, kept faithful in every detail. Place it on or against a neutral warm studio backdrop with soft lighting, gentle side shadow, minimal styling, premium e-commerce look. Product centred with clear even margin on all four sides — nothing touching the frame edge. Photorealistic. No people.",
    },
    {
      kind: "onmodel_full",
      hasPerson: true,
      prompt: `On-model FULL-BODY shot: one adult person wearing the product, framed from ABOVE THE HEAD down to BELOW THE FEET (or at minimum to mid-calf for full-length garments). The ENTIRE garment must be visible top to bottom with clear margin — for a saree, that means the complete drape: pleats at the waist, pallu over the left shoulder falling to the back, and the border continuous along the whole length; for a kurta, dress or lehenga, shoulder to hem fully in frame. Straight-on view, model standing naturally with arms held slightly away from the body so no part of the garment is hidden. ${FRAMING_HARD_RULE} ${modelLine} ${brandModelBinding} ${fidelity} ${drapeRules} ${bodyRules} Soft natural daylight, plain neutral background, photorealistic, catalogue-quality.`,
    },
    {
      kind: "onmodel_detail",
      hasPerson: true,
      prompt: `On-model THREE-QUARTER / WAIST-UP detail shot of the same adult person: closer framing to show fabric, weave, border, neckline and how the garment falls — but NEVER a tight crop into the product. Frame from head to waist at minimum so the viewer still understands what they are looking at; the section of the product shown must be entirely within the frame with clear margin, never becoming an abstract patch of colour. ${FRAMING_HARD_RULE} ${modelLine} ${brandModelBinding} ${fidelity} ${drapeRules} ${bodyRules} Soft natural daylight, plain neutral background, photorealistic.`,
    },
  ];
}


// Kidswear: never a person. Product-focused shots — folded, on a hanger, plain surface, or ghost-mannequin.
const KIDSWEAR_STYLES: StyleDef[] = [
  {
    kind: "white",
    prompt:
      "Reproduce the exact same children's garment from the input photo — same colour, pattern, print, and stitching. Present it on a pure clean white studio background, laid flat and neatly arranged so the front is clearly visible and the shape reads well. Marketplace main image quality, soft even lighting, subtle contact shadow, centred, no props, no text, photorealistic. Absolutely no person, no child, no adult, no hands, no mannequin face.",
  },
  {
    kind: "hanger",
    prompt:
      "Same children's garment from the input photo, kept faithful. Presented on a plain wooden or white clothing hanger against a soft neutral studio backdrop, gently lit, showing the full shape and length of the garment. No person, no child, no hands, no mannequin face.",
  },
  {
    kind: "ghost",
    prompt:
      "Same children's garment from the input photo, kept faithful. Ghost-mannequin style: the garment appears filled out and holds its natural shape as if worn, but there is NO person and NO visible mannequin — the inside is hollow. Plain soft neutral studio background, even lighting, photorealistic e-commerce catalogue look. Absolutely no child, no adult, no hands, no face.",
  },
  {
    kind: "flatlay",
    prompt:
      "Same children's garment from the input photo, kept faithful. Overhead flat-lay on a soft neutral textured surface, neatly arranged, one or two tasteful child-appropriate props that clearly belong (a small folded blanket, a wooden toy at a distance) — never a child, never hands, never a person. Balanced composition, soft daylight, garment centred, photorealistic.",
  },
];

function getGenerationStyles(data: {
  needsPerson?: boolean;
  isKidswear?: boolean;
  isDrapedGarment?: boolean;
}, modelLine: string, brandModelBinding: string): StyleDef[] {
  return data.isKidswear
    ? KIDSWEAR_STYLES
    : data.needsPerson
      ? personStyles(modelLine, brandModelBinding, !!data.isDrapedGarment)
      : PRODUCT_STYLES;
}

async function getBrandModelContext(userId?: string | null): Promise<{
  modelLine: string;
  brandModelRefs: { b64: string; mime: string }[];
  brandModelBinding: string;
  personSource: "ai" | "user";
}> {
  let modelLine =
    "Choose a clearly adult model (25 to 40 years old) who genuinely fits this product's real buyer — natural-looking Indian adult, warm approachable presence. Never a child, never a teenager.";
  let brandModelRefs: { b64: string; mime: string }[] = [];
  let brandModelBinding = "";
  let personSource: "ai" | "user" = "ai";
  if (!userId) return { modelLine, brandModelRefs, brandModelBinding, personSource };

  const sb = await admin();
  const { data: kit } = await sb
    .from("brand_kits")
    .select("model_gender, model_age, model_skin, model_body, model_region, brand_model_enabled, brand_model_url, brand_model_source, brand_model_photos")
    .eq("user_id", userId)
    .maybeSingle();
  if (!kit) return { modelLine, brandModelRefs, brandModelBinding, personSource };

  const { describeModelPrefs } = await import("./brand-kit.functions");
  const prefs = describeModelPrefs(kit);
  if (prefs) modelLine = `The model is: ${prefs}. Always a clearly adult person, 25 to 40 years old.`;
  if (!kit.brand_model_enabled) return { modelLine, brandModelRefs, brandModelBinding, personSource };

  const source = (kit.brand_model_source as "ai" | "user" | null) ?? "ai";
  const photos = source === "user"
    ? ((kit.brand_model_photos as string[] | null) ?? []).filter(Boolean)
    : (kit.brand_model_url ? [kit.brand_model_url] : []);
  const loaded: { b64: string; mime: string }[] = [];
  for (const p of photos.slice(0, 3)) {
    try { loaded.push(await fetchAsBase64(p)); } catch { /* skip */ }
  }
  if (loaded.length === 0) return { modelLine, brandModelRefs, brandModelBinding, personSource };
  brandModelRefs = loaded;
  personSource = source;
  brandModelBinding = source === "user"
    ? "Reuse the exact same REAL person shown in the final reference photos — same face, same skin tone, same build, same hair — so this shop's photos all feature one consistent model. Keep their real facial features faithful. The person is clearly an adult."
    : "Reuse the exact same person shown in the final reference portrait — same face, same skin tone, same build — so this shop's photos all feature one consistent brand model. The person is clearly an adult.";
  return { modelLine, brandModelRefs, brandModelBinding, personSource };
}

async function generateOneImage(
  refs: { b64: string; mime: string }[],
  prompt: string,
  targetSize = 2048,
  allowPerson = false,
): Promise<string> {
  const sizeHint = `Render at ${targetSize} by ${targetSize} pixels, square 1:1, photorealistic, catalogue-quality, high detail. The subject must be entirely within the frame with generous even margin on all four sides — nothing important may touch or exceed any edge of the image, so it stays uncropped when reframed to vertical.`;
  const multiHint =
    refs.length > 1
      ? `You are given ${refs.length} reference images. The FIRST images are photos of the same single product from different angles — use them together to keep the product's true shape, colour, material, branding and any labels faithful from every side. Any final reference (if present) is a PERSON portrait to keep the model's face and appearance consistent — reuse that same person.`
      : "Keep the product identical to the reference photo — same shape, colour, material, branding and label.";
  const peopleRule = allowPerson ? "" : NO_PEOPLE;

  async function runOnce(attempt: number, extraGuidance = ""): Promise<string> {
    const full = `${prompt} ${sizeHint} ${peopleRule} ${multiHint} ${extraGuidance}`.trim();
    const [primary, ...extras] = refs;
    console.info(`[generation] image attempt=${attempt} allow_person=${allowPerson}`);
    const out = await geminiGenerateImage({
      prompt: full,
      reference: { mimeType: primary.mime, b64: primary.b64 },
      extraReferences: extras.map((e) => ({ mimeType: e.mime, b64: e.b64 })),
    });
    return out.b64;
  }

  let attemptCount = 1;
  const first = await runOnce(attemptCount);
  if (!allowPerson) return first;

  // On-model shots: verify the product isn't cropped at any frame edge; retry once free if it is.
  try {
    const verdict = await geminiGenerateText({
      parts: [
        { inlineData: { mimeType: "image/png", data: first } },
        {
          text:
            'Look at this on-model photo. Is any part of the garment/product cut off by the top, bottom, left, or right edge of the image, or does the product touch a frame edge with no visible margin? Answer with ONLY the single word "yes" or "no".',
        },
      ],
      temperature: 0,
      maxOutputTokens: 4,
    });
    if (/^\s*yes\b/i.test(verdict)) {
      if (attemptCount >= 2) return first;
      attemptCount += 1;
      console.warn(`[generation] crop retry attempt=${attemptCount} max=2`);
      const retry = await runOnce(
        attemptCount,
        "PREVIOUS ATTEMPT CROPPED THE PRODUCT. Pull the camera BACK and zoom OUT significantly so the entire garment and person fit comfortably inside the frame with clear empty margin on all four sides. Prioritise showing the whole product over showing the model's face — crop the face at the top if you must, but never crop the product.",
      );
      return retry;
    }
  } catch {
    // Verification is best-effort; if it fails, keep the first image.
  }
  return first;
}


export const generateImages = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      browserId: string;
      userId?: string | null;
      imageUrl?: string;
      imageUrls?: string[];
      productName: string;
      category: string;
      needsPerson?: boolean;
      isKidswear?: boolean;
      isDrapedGarment?: boolean;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { COSTS } = await import("./plans");
    const PRODUCT_COST = COSTS.product;
    let refundInfo: { userId: string; sub: number; pack: number } | null = null;

    if (data.userId) {
      const sb = await admin();
      const { data: rows, error } = await sb.rpc("spend_credits", {
        _user_id: data.userId,
        _amount: PRODUCT_COST,
      });
      if (error) throw new Error(`credit check failed: ${error.message}`);
      const first = Array.isArray(rows) ? rows[0] : rows;
      if (!first?.ok) {
        const have = first?.balance ?? 0;
        throw new Error(`NO_CREDITS:${PRODUCT_COST}:${have}`);
      }
      refundInfo = { userId: data.userId, sub: first.took_sub ?? 0, pack: first.took_pack ?? 0 };
    } else {
      await checkAndIncrementLimit(data.browserId);
    }

    try {
      const urls = data.imageUrls && data.imageUrls.length > 0
        ? data.imageUrls
        : data.imageUrl
          ? [data.imageUrl]
          : [];
      if (urls.length === 0) throw new Error("No image provided");
      const productRefs = await Promise.all(urls.slice(0, 5).map((u) => fetchAsBase64(u)));

      // Look up brand kit for model prefs + saved brand model (signed-in only).
      let modelLine =
        "Choose a clearly adult model (25 to 40 years old) who genuinely fits this product's real buyer — natural-looking Indian adult, warm approachable presence. Never a child, never a teenager.";
      let brandModelRefs: { b64: string; mime: string }[] = [];
      let brandModelBinding = "";
      let personSource: "ai" | "user" = "ai";
      if (data.userId) {
        const sb = await admin();
        const { data: kit } = await sb
          .from("brand_kits")
          .select("model_gender, model_age, model_skin, model_body, model_region, brand_model_enabled, brand_model_url, brand_model_source, brand_model_photos")
          .eq("user_id", data.userId)
          .maybeSingle();
        if (kit) {
          const { describeModelPrefs } = await import("./brand-kit.functions");
          const prefs = describeModelPrefs(kit);
          if (prefs) modelLine = `The model is: ${prefs}. Always a clearly adult person, 25 to 40 years old.`;
          if (kit.brand_model_enabled) {
            const source = (kit.brand_model_source as "ai" | "user" | null) ?? "ai";
            const photos = source === "user"
              ? ((kit.brand_model_photos as string[] | null) ?? []).filter(Boolean)
              : (kit.brand_model_url ? [kit.brand_model_url] : []);
            const loaded: { b64: string; mime: string }[] = [];
            for (const p of photos.slice(0, 3)) {
              try { loaded.push(await fetchAsBase64(p)); } catch { /* skip */ }
            }
            if (loaded.length > 0) {
              brandModelRefs = loaded;
              personSource = source;
              brandModelBinding = source === "user"
                ? "Reuse the exact same REAL person shown in the final reference photos — same face, same skin tone, same build, same hair — so this shop's photos all feature one consistent model. Keep their real facial features faithful. The person is clearly an adult."
                : "Reuse the exact same person shown in the final reference portrait — same face, same skin tone, same build — so this shop's photos all feature one consistent brand model. The person is clearly an adult.";
            }
          }
        }
      }

      const styles = data.isKidswear
        ? KIDSWEAR_STYLES
        : data.needsPerson
          ? personStyles(modelLine, brandModelBinding, !!data.isDrapedGarment)
          : PRODUCT_STYLES;

      const contextLine = `Product: ${data.productName}. Category: ${data.category}.`;

      const tasks: Promise<{ kind: string; url: string }>[] = styles.map((style) => (async () => {
        const refs = style.hasPerson && brandModelRefs.length > 0
          ? [...productRefs, ...brandModelRefs]
          : productRefs;
        const b64 = await generateOneImage(refs, `${contextLine} ${style.prompt}`, 2048, !!style.hasPerson);
        const bytes = b64ToBytes(b64);
        const path = `generated/${data.browserId}/${Date.now()}-${style.kind}.png`;
        const url = await uploadBytes(path, bytes, "image/png");
        return { kind: style.kind, url };
      })());
      const settled = await Promise.allSettled(tasks);
      const base = settled
        .filter((r): r is PromiseFulfilledResult<{ kind: string; url: string }> => r.status === "fulfilled")
        .map((r) => r.value);
      if (base.length === 0) {
        const firstErr = settled.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
        const detail = firstErr ? (firstErr.reason instanceof Error ? firstErr.reason.message : String(firstErr.reason)) : "";
        throw new Error(detail || "No photos came through. Try again.");
      }
      const images = base.flatMap((b) => [
        { kind: b.kind, ratio: "1:1" as const, url: b.url },
        { kind: b.kind, ratio: "9:16" as const, url: b.url },
      ]);
      // Success — do not refund.
      refundInfo = null;
      return {
        images,
        meta: {
          image_model: GEMINI_IMAGE_MODEL,
          image_count: base.length,
          image_resolution: 2048,
          input_photo_count: productRefs.length,
          person_source: personSource,
        },
      };
    } catch (err) {
      // Automatic refund on our-side failure.
      if (refundInfo) {
        try {
          const sb = await admin();
          await sb.rpc("refund_credits", {
            _user_id: refundInfo.userId,
            _sub: refundInfo.sub,
            _pack: refundInfo.pack,
          });
        } catch { /* swallow refund errors */ }
      }
      throw err;
    }
  });

export const startGenerationJob = createServerFn({ method: "POST" })
  .inputValidator((d: { browserId: string; userId?: string | null }) => d)
  .handler(async ({ data }) => {
    const { COSTS } = await import("./plans");
    const productCost = COSTS.product;
    const sb = await admin();
    let refundSub = 0;
    let refundPack = 0;
    let reserved = false;

    try {
      if (data.userId) {
        const { data: rows, error } = await sb.rpc("spend_credits", {
          _user_id: data.userId,
          _amount: productCost,
        });
        if (error) throw new Error(`credit check failed: ${error.message}`);
        const first = Array.isArray(rows) ? rows[0] : rows;
        if (!first?.ok) {
          const have = first?.balance ?? 0;
          throw new Error(`NO_CREDITS:${productCost}:${have}`);
        }
        refundSub = first.took_sub ?? 0;
        refundPack = first.took_pack ?? 0;
      } else {
        await checkAndIncrementLimit(data.browserId);
      }
      reserved = true;

      const { data: row, error } = await sb
        .from("generation_jobs")
        .insert({
          browser_id: data.browserId,
          user_id: data.userId ?? null,
          refund_sub: refundSub,
          refund_pack: refundPack,
          status: "reserved",
        })
        .select("id")
        .single();
      if (error || !row) throw new Error(`generation start failed: ${error?.message ?? "no job"}`);
      console.info(`[generation] start job=${row.id} browser=${data.browserId} cost=${productCost}`);
      return { jobId: row.id as string, cost: productCost };
    } catch (err) {
      if (reserved) {
        if (data.userId) {
          await sb.rpc("refund_credits", { _user_id: data.userId, _sub: refundSub, _pack: refundPack });
        } else {
          await decrementLimit(data.browserId);
        }
      }
      throw err;
    }
  });

export const refundGenerationJob = createServerFn({ method: "POST" })
  .inputValidator((d: { jobId: string; browserId: string; reason: string }) => d)
  .handler(async ({ data }) => {
    const refunded = await refundGenerationReservation(data.jobId, data.browserId, data.reason);
    return { refunded };
  });

export const generateImageForJob = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      jobId: string;
      browserId: string;
      userId?: string | null;
      imageUrl?: string;
      imageUrls?: string[];
      productName: string;
      category: string;
      needsPerson?: boolean;
      isKidswear?: boolean;
      isDrapedGarment?: boolean;
      styleIndex: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    await ensureGenerationReserved(data.jobId, data.browserId);
    const urls = data.imageUrls && data.imageUrls.length > 0
      ? data.imageUrls
      : data.imageUrl
        ? [data.imageUrl]
        : [];
    if (urls.length === 0) throw new Error("No image provided");

    const { modelLine, brandModelRefs, brandModelBinding, personSource } = await getBrandModelContext(data.userId);
    const styles = getGenerationStyles(data, modelLine, brandModelBinding);
    const style = styles[data.styleIndex];
    if (!style) throw new Error("Photo style was not found. Try again.");

    const started = Date.now();
    try {
      console.info(`[generation] photo start job=${data.jobId} style=${style.kind} index=${data.styleIndex}`);
      const productRefs = await Promise.all(urls.slice(0, 5).map((u) => fetchAsBase64(u)));
      const contextLine = `Product: ${data.productName}. Category: ${data.category}.`;
      const refs = style.hasPerson && brandModelRefs.length > 0
        ? [...productRefs, ...brandModelRefs]
        : productRefs;
      const b64 = await generateOneImage(refs, `${contextLine} ${style.prompt}`, 2048, !!style.hasPerson);
      await ensureGenerationReserved(data.jobId, data.browserId);
      const bytes = b64ToBytes(b64);
      const suffix = Math.random().toString(36).slice(2, 8);
      const path = `generated/${data.browserId}/${Date.now()}-${suffix}-${style.kind}.png`;
      const url = await uploadBytes(path, bytes, "image/png");
      console.info(`[generation] photo done job=${data.jobId} style=${style.kind} duration_ms=${Date.now() - started}`);
      return {
        kind: style.kind,
        images: [
          { kind: style.kind, ratio: "1:1" as const, url },
          { kind: style.kind, ratio: "9:16" as const, url },
        ],
        meta: {
          image_model: GEMINI_IMAGE_MODEL,
          image_count: 1,
          image_resolution: 2048,
          input_photo_count: productRefs.length,
          person_source: personSource,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[generation] photo failed job=${data.jobId} style=${style.kind} duration_ms=${Date.now() - started} error=${message}`);
      throw err;
    }
  });






// ---------- Copy generation ----------

const CopySchema = z.object({
  seoTitle: z.string(),
  description: z.string(),
  bullets: z.array(z.string()),
  tags: z.array(z.string()),
  instagram: z.string(),
  instagramHashtags: z.array(z.string()),
  whatsapp: z.string(),
  festival: z.string(),
});

export const generateCopyAndSave = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      jobId?: string | null;
      browserId: string;
      userId?: string | null;
      originalImageUrl: string;
      productName: string;
      price: string;
      detail: string;
      category: string;
      material: string;
      color: string;
      features: string[];
      images: { kind: string; ratio: string; url: string }[];
      meta?: { image_model?: string; image_count?: number; image_resolution?: number; person_source?: "ai" | "user" } | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    if (data.jobId) await ensureGenerationReserved(data.jobId, data.browserId);
    // Look up brand kit if signed in.
    let brand: {
      business_name: string;
      sells_what: string;
      sells_to: string;
      tone: string;
    } | null = null;
    if (data.userId) {
      const sbLookup = await admin();
      const { data: bk } = await sbLookup
        .from("brand_kits")
        .select("business_name, sells_what, sells_to, tone")
        .eq("user_id", data.userId)
        .maybeSingle();
      if (bk) brand = bk;
    }

    const toneLine =
      brand?.tone === "premium"
        ? "Voice: premium, understated, confident. No exclamation marks."
        : brand?.tone === "value"
          ? "Voice: value-for-money, practical, direct. Emphasise durability and price."
          : brand?.tone === "traditional"
            ? "Voice: traditional, warm, respectful. Comfortable with Hindi/regional words where natural."
            : "Voice: friendly, plain-speaking, warm.";

    const brandLines = brand
      ? `Brand: ${brand.business_name || "unnamed"}. Sells: ${brand.sells_what || "n/a"}. Target buyer: ${brand.sells_to || "general Indian shoppers"}.`
      : `Brand: independent Indian seller. Target buyer: general Indian shoppers.`;

    const sys = `You are a plain-speaking Indian shopkeeper who writes product listings. You explain why THIS specific product is worth buying — with concrete facts, not filler.

${brandLines}
${toneLine}

Hard rules:
- Open with the single most useful thing about the product. Never restate what the product obviously is.
- Every bullet must contain a concrete fact: a material, a size, a use, a benefit someone can picture. Never a bullet that only describes the colour.
- Never state the obvious ("this yellow speaker is yellow", "has a handle making it easy to carry").
- Banned phrases (never use, in any form): "on the go", "elevate", "adds a pop", "perfect for every", "take your X anywhere", "grab yours today", "unleash", "curated", "lifestyle".
- Sentence case. No ALL CAPS. No emoji spam. Confident, specific, no filler.
- Match the target buyer's language and priorities. Write like a good shopkeeper who knows the product — every sentence earns its place.`;

    const userPrompt = `Write a full listing for this product.

Product: ${data.productName}
Category: ${data.category}
Material: ${data.material || "unknown"}
Colour: ${data.color || "unknown"}
Price: ₹${data.price}
Key detail from seller: ${data.detail || "none"}
Features: ${data.features.filter(Boolean).join("; ") || "n/a"}

Return a JSON object only (no prose, no markdown fences) with these exact keys:
{
  "seoTitle": "under 200 characters, keyword-rich, sentence case, no ALL CAPS",
  "description": "exactly three short paragraphs separated by \\n\\n. Every sentence must earn its place. First paragraph opens with the most useful thing about the product, not a restatement of what it is.",
  "bullets": [exactly 5 bullets under 120 chars each, each with a concrete fact — material, size, use, or specific benefit. No colour-only bullets. No banned phrases.],
  "tags": [exactly 15 search tags, single or two-word, lowercase],
  "instagram": "Instagram caption with a strong specific first line, 2-4 short lines, no banned phrases",
  "instagramHashtags": [exactly 10 hashtags including the # symbol],
  "whatsapp": "WhatsApp broadcast message under 300 characters with 1-2 emojis, specific not generic",
  "festival": "one festival or offer line, single sentence"
}`;

    const raw = await geminiGenerateText({
      systemInstruction: sys,
      parts: [{ text: userPrompt }],
      responseMimeType: "application/json",
      temperature: 0.8,
      maxOutputTokens: 3072,
    });
    const parsed = parseJsonLoose<unknown>(raw) ?? {};
    const r = CopySchema.safeParse(parsed);
    if (!r.success) throw new Error("Listing text didn't come through cleanly. Try again.");
    const copy = r.data;

    // Build CSV
    const handle = slugify(data.productName);
    const bodyHtml =
      `<p>${copy.description.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</p>` +
      `<ul>${copy.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>`;
    const csv = buildShopifyCsv({
      handle,
      title: copy.seoTitle,
      bodyHtml,
      vendor: "",
      type: data.category,
      tags: copy.tags,
      price: data.price,
      seoTitle: copy.seoTitle,
      seoDescription: copy.description.slice(0, 160),
      imageUrls: data.images.map((i) => i.url),
    });
    const csvBytes = new TextEncoder().encode(csv);
    const csvPath = `csv/${data.browserId}/${Date.now()}-${handle}.csv`;
    const csvUrl = await uploadBytes(csvPath, csvBytes, "text/csv");

    const sb = await admin();
    const { data: row, error } = await sb
      .from("generations")
      .insert({
        browser_id: data.browserId,
        user_id: data.userId ?? null,
        original_image_url: data.originalImageUrl,
        product_name: data.productName,
        price: Number(data.price) || null,
        detail: data.detail,
        category: data.category,
        generated_images: data.images,
        copy,
        csv_url: csvUrl,
        gen_metadata: {
          text_model: GEMINI_TEXT_MODEL,
          image_model: data.meta?.image_model ?? GEMINI_IMAGE_MODEL,
          image_count: data.meta?.image_count ?? 0,
          image_resolution: data.meta?.image_resolution ?? 2048,
          person_source: data.meta?.person_source ?? "ai",
        },
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(`save failed: ${error?.message}`);
    if (data.jobId) await markGenerationSucceeded(data.jobId, data.browserId);
    return { id: row.id as string, copy, csvUrl };
  });

// ---------- Feedback ----------

export const submitFeedback = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; rating: 1 | -1; text?: string }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb
      .from("generations")
      .update({ feedback_rating: data.rating, feedback_text: data.text ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Read one ----------

export const getGeneration = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: row, error } = await sb
      .from("generations")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
