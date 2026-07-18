import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildShopifyCsv, slugify } from "./csv";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function apiKey(): string {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("Missing LOVABLE_API_KEY");
  return k;
}

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
});

export const identifyProduct = createServerFn({ method: "POST" })
  .inputValidator((d: { imageUrl: string }) => d)
  .handler(async ({ data }) => {
    const { b64, mime } = await fetchAsBase64(data.imageUrl);
    const body = {
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You identify products from a photo for Indian e-commerce sellers. Reply with a compact JSON object only, no prose, no markdown fences.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: 'Identify this product. Return JSON: {"name": short product name (max 6 words, sentence case), "category": one broad category like Kitchen, Home Decor, Fashion, Beauty, Electronics, "material": main material or empty, "color": main color or empty, "features": array of exactly 3 short key features}',
            },
            { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
          ],
        },
      ],
    };
    const res = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey()}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`identify failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    let text = json.choices?.[0]?.message?.content?.trim() ?? "";
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m2 = text.match(/\{[\s\S]*\}/);
      parsed = m2 ? JSON.parse(m2[0]) : {};
    }
    const r = IdentifiedSchema.safeParse(parsed);
    const val = r.success
      ? r.data
      : { name: "Product", category: "General", material: "", color: "", features: [] };
    if (val.features.length < 3) {
      while (val.features.length < 3) val.features.push("");
    }
    val.features = val.features.slice(0, 3);
    return val;
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

const IMAGE_STYLES = [
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
      "Same product from the input photo, kept faithful. First determine where this specific product is actually used or kept in real life, then set the scene in exactly that place — e.g. a speaker on a desk or bedside table, a kurta on a wardrobe rail or chair, a spice jar on a kitchen shelf, a cushion on a sofa, a mug on a breakfast table. Never use a generic shop, market stall, bazaar, workshop, or warehouse backdrop unless the product itself is shop equipment. Keep the scene simple: one clear surface, at most two or three small props that genuinely belong with this product. The product remains the clear hero, centred and uncrowded. Soft natural daylight, shallow depth of field, photorealistic, no text.",
  },
  {
    kind: "flatlay",
    prompt:
      "Same product from the input photo, kept faithful. Styled overhead flat-lay on a textured neutral surface with two or three tasteful props that clearly belong with this product's real use. Balanced composition, soft daylight, product centred and clearly the hero, no text.",
  },
];

async function generateOneImage(refB64: string, refMime: string, prompt: string, ratio: "1:1" | "9:16") {
  const ratioHint =
    ratio === "1:1"
      ? "Square 1:1 aspect ratio, 1024x1024. The full product must be centred and completely visible with comfortable margin — nothing important cropped."
      : "Vertical 9:16 aspect ratio, 1024x1820, tall portrait orientation. Product centred, fully visible.";
  const body = {
    model: "google/gemini-2.5-flash-image",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `${prompt} ${ratioHint} ${NO_PEOPLE}` },
          { type: "image_url", image_url: { url: `data:${refMime};base64,${refB64}` } },
        ],
      },
    ],
    modalities: ["image", "text"],
  };
  const res = await fetch(`${GATEWAY}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey()}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`image gen failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { data?: { b64_json: string }[] };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("image gen returned no image");
  return b64;
}

export const generateImages = createServerFn({ method: "POST" })
  .inputValidator(
    (d: { browserId: string; imageUrl: string; productName: string; category: string }) => d,
  )
  .handler(async ({ data }) => {
    await checkAndIncrementLimit(data.browserId);
    const { b64: refB64, mime: refMime } = await fetchAsBase64(data.imageUrl);
    const contextLine = `Product: ${data.productName}. Category: ${data.category}.`;

    const tasks: Promise<{ kind: string; ratio: "1:1" | "9:16"; url: string }>[] = [];
    for (const style of IMAGE_STYLES) {
      for (const ratio of ["1:1", "9:16"] as const) {
        tasks.push(
          (async () => {
            const b64 = await generateOneImage(
              refB64,
              refMime,
              `${contextLine} ${style.prompt}`,
              ratio,
            );
            const bytes = b64ToBytes(b64);
            const path = `generated/${data.browserId}/${Date.now()}-${style.kind}-${ratio.replace(":", "x")}.png`;
            const url = await uploadBytes(path, bytes, "image/png");
            return { kind: style.kind, ratio, url };
          })(),
        );
      }
    }
    const settled = await Promise.allSettled(tasks);
    const images = settled
      .filter((r): r is PromiseFulfilledResult<{ kind: string; ratio: "1:1" | "9:16"; url: string }> => r.status === "fulfilled")
      .map((r) => r.value);
    if (images.length === 0) throw new Error("No photos came through. Try again.");
    return { images };
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
      originalImageUrl: string;
      productName: string;
      price: string;
      detail: string;
      category: string;
      material: string;
      color: string;
      features: string[];
      images: { kind: string; ratio: string; url: string }[];
    }) => d,
  )
  .handler(async ({ data }) => {
    const sys = `You are an experienced Indian e-commerce copywriter. You write plain, confident English that Indian sellers use. Never use words like "elevate", "unleash", "curated", "lifestyle" as filler. Never use ALL CAPS. Sentence case. Be specific and concrete.`;

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
  "seoTitle": "under 200 characters, keyword-rich, no ALL CAPS",
  "description": "short scannable paragraphs separated by \\n\\n",
  "bullets": [exactly 5 benefit-led bullet points, each under 120 chars],
  "tags": [exactly 15 search tags, single or two-word, lowercase],
  "instagram": "Instagram caption with a strong first line, 2-4 short lines",
  "instagramHashtags": [exactly 10 hashtags including the # symbol],
  "whatsapp": "WhatsApp broadcast message under 300 characters with 1-2 emojis",
  "festival": "one festival or offer line, single sentence"
}`;

    const res = await fetch(`${GATEWAY}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey()}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`copy failed: ${res.status} ${await res.text()}`);
    const json = (await res.json()) as { choices: { message: { content: string } }[] };
    let text = json.choices?.[0]?.message?.content?.trim() ?? "";
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
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
        original_image_url: data.originalImageUrl,
        product_name: data.productName,
        price: Number(data.price) || null,
        detail: data.detail,
        category: data.category,
        generated_images: data.images,
        copy,
        csv_url: csvUrl,
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
