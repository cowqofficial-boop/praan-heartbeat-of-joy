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

function personStyles(modelLine: string, brandModelBinding: string): StyleDef[] {
  const drapeRules = `If it is a draped Indian garment, the drape must be correct: sarees pleated at the waist with the pallu over the LEFT shoulder; dupattas placed properly. If the correct drape cannot be produced with confidence, prefer a well-lit product-only shot to a badly draped model shot.`;
  const bodyRules = `Natural pose, natural light, hands and fingers correct (five fingers, no distortion), face calm and pleasant, nothing exaggerated, no fashion-editorial posing, no text, no logo, no watermark.`;
  const fidelity = `The garment/item must match the uploaded photos exactly — same colour, same pattern, same border, same length, same fittings. Do not restyle, do not recolour, do not shorten, do not embellish.`;
  return [
    {
      kind: "white",
      prompt:
        "Reproduce the exact same product from the input photo — same shape, colour, material, branding, and label. Place it on a pure clean white studio background suitable for Amazon/Flipkart, soft even lighting, subtle contact shadow, centred, no props, no text, high detail, photorealistic.",
    },
    {
      kind: "studio",
      prompt:
        "Same product from the input photo, kept faithful in every detail. Place it on or against a neutral warm studio backdrop with soft lighting, gentle side shadow, minimal styling, premium e-commerce look, photorealistic. No people.",
    },
    {
      kind: "onmodel_full",
      hasPerson: true,
      prompt: `On-model FULL view: one person wearing/using the product so that the WHOLE product is clearly visible from head to toe (or the equivalent full view for the item). ${modelLine} ${brandModelBinding} ${fidelity} ${drapeRules} ${bodyRules} Soft natural daylight, plain neutral background, photorealistic, catalogue-quality.`,
    },
    {
      kind: "onmodel_detail",
      hasPerson: true,
      prompt: `On-model CLOSE view of the same person: closer framing on the product to show fabric, detail, fit or how it sits — e.g. jewellery near the neckline, saree pallu detail, shoe on foot, watch on wrist, bag held at the side. ${modelLine} ${brandModelBinding} ${fidelity} ${drapeRules} ${bodyRules} Soft natural daylight, plain neutral background, photorealistic.`,
    },
  ];
}

async function generateOneImage(
  refs: { b64: string; mime: string }[],
  prompt: string,
  targetSize = 2048,
  allowPerson = false,
): Promise<string> {
  const sizeHint = `Render at ${targetSize} by ${targetSize} pixels, square 1:1, photorealistic, catalogue-quality, high detail. Subject centred with generous margin so nothing important is cropped when reframed to vertical.`;
  const multiHint =
    refs.length > 1
      ? `You are given ${refs.length} reference images. The FIRST images are photos of the same single product from different angles — use them together to keep the product's true shape, colour, material, branding and any labels faithful from every side. Any final reference (if present) is a PERSON portrait to keep the model's face and appearance consistent — reuse that same person.`
      : "Keep the product identical to the reference photo — same shape, colour, material, branding and label.";
  const peopleRule = allowPerson ? "" : NO_PEOPLE;
  const full = `${prompt} ${sizeHint} ${peopleRule} ${multiHint}`;
  const [primary, ...extras] = refs;
  const out = await geminiGenerateImage({
    prompt: full,
    reference: { mimeType: primary.mime, b64: primary.b64 },
    extraReferences: extras.map((e) => ({ mimeType: e.mime, b64: e.b64 })),
  });
  return out.b64;
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
    }) => d,
  )
  .handler(async ({ data }) => {
    if (data.userId) {
      const sb = await admin();
      const { data: ok, error } = await sb.rpc("consume_credit", {
        _user_id: data.userId,
        _amount: 1,
      });
      if (error) throw new Error(`credit check failed: ${error.message}`);
      if (!ok) throw new Error("NO_CREDITS");
    } else {
      await checkAndIncrementLimit(data.browserId);
    }
    const urls = data.imageUrls && data.imageUrls.length > 0
      ? data.imageUrls
      : data.imageUrl
        ? [data.imageUrl]
        : [];
    if (urls.length === 0) throw new Error("No image provided");
    const productRefs = await Promise.all(urls.slice(0, 5).map((u) => fetchAsBase64(u)));

    // Look up brand kit for model prefs + saved brand model (signed-in only).
    let modelLine =
      "Choose a model who genuinely fits this product's real buyer — natural-looking Indian adult, warm approachable presence.";
    let brandModelRef: { b64: string; mime: string } | null = null;
    let brandModelBinding = "";
    if (data.userId) {
      const sb = await admin();
      const { data: kit } = await sb
        .from("brand_kits")
        .select("model_gender, model_age, model_skin, model_body, model_region, brand_model_enabled, brand_model_url")
        .eq("user_id", data.userId)
        .maybeSingle();
      if (kit) {
        const { describeModelPrefs } = await import("./brand-kit.functions");
        const prefs = describeModelPrefs(kit);
        if (prefs) modelLine = `The model is: ${prefs}.`;
        if (kit.brand_model_enabled && kit.brand_model_url) {
          try {
            brandModelRef = await fetchAsBase64(kit.brand_model_url);
            brandModelBinding =
              "Reuse the exact same person shown in the final reference portrait — same face, same skin tone, same build — so this shop's photos all feature one consistent brand model.";
          } catch {
            brandModelRef = null;
          }
        }
      }
    }

    const styles = data.needsPerson
      ? personStyles(modelLine, brandModelBinding)
      : PRODUCT_STYLES;

    const contextLine = `Product: ${data.productName}. Category: ${data.category}.`;

    // Generate ONCE per style at 2048 (square); reuse the URL for both 1:1 and 9:16
    // to halve API cost — the browser crops to 9:16 at download time.
    const tasks: Promise<{ kind: string; url: string }>[] = styles.map((style) => (async () => {
      const refs = style.hasPerson && brandModelRef
        ? [...productRefs, brandModelRef]
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
    // Return both ratios pointing to the same underlying URL so downstream code is unchanged.
    const images = base.flatMap((b) => [
      { kind: b.kind, ratio: "1:1" as const, url: b.url },
      { kind: b.kind, ratio: "9:16" as const, url: b.url },
    ]);
    return {
      images,
      meta: {
        image_model: GEMINI_IMAGE_MODEL,
        image_count: base.length,
        image_resolution: 2048,
        input_photo_count: productRefs.length,
      },
    };
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
      meta?: { image_model?: string; image_count?: number; image_resolution?: number } | null;
    }) => d,
  )
  .handler(async ({ data }) => {
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
        },
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(`save failed: ${error?.message}`);
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
