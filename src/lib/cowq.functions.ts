import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { buildShopifyCsv, slugify } from "./csv";
import {
  GEMINI_IMAGE_MODEL,
  GEMINI_TEXT_MODEL,
  geminiGenerateImage,
  geminiGenerateText,
  parseJsonLoose,
} from "./gemini.server";
import {
  admin,
  b64ToBytes,
  fetchAsBase64,
  generateOneImage,
  getBrandModelContext,
  getGenerationStyles,
  uploadBytes,
} from "./image-gen.server";


// ---------- Upload ----------

/**
 * Hands the browser a short-lived signed URL so the photo goes straight to
 * storage instead of being base64-inflated through this worker.
 */
export const createUploadTicket = createServerFn({ method: "POST" })
  .inputValidator((d: { browserId: string; ext?: string }) => d)
  .handler(async ({ data }) => {
    const ext = (data.ext || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg";
    const path = `originals/${data.browserId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const sb = await admin();
    const { data: ticket, error } = await sb.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !ticket) throw new Error(`upload ticket failed: ${error?.message}`);
    return { path, token: ticket.token, bucket: BUCKET };
  });

/** Returns a long-lived signed read URL for a freshly uploaded original. */
export const signUploadedOriginal = createServerFn({ method: "POST" })
  .inputValidator((d: { path: string }) => d)
  .handler(async ({ data }) => {
    if (!data.path.startsWith("originals/")) throw new Error("Invalid path");
    return { url: await signedUrl(data.path) };
  });



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
      modelId?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    const userId = (await import("./credits.server").then((m) => m.currentUserId())) ?? null;
    const { COSTS } = await import("./plans");
    const PRODUCT_COST = COSTS.product;
    let refundInfo: { userId: string; sub: number; pack: number } | null = null;

    if (userId) {
      const sb = await admin();
      const { data: rows, error } = await sb.rpc("spend_credits", {
        _user_id: userId,
        _amount: PRODUCT_COST,
      });
      if (error) throw new Error(`credit check failed: ${error.message}`);
      const first = Array.isArray(rows) ? rows[0] : rows;
      if (!first?.ok) {
        const have = first?.balance ?? 0;
        throw new Error(`NO_CREDITS:${PRODUCT_COST}:${have}`);
      }
      refundInfo = { userId: userId, sub: first.took_sub ?? 0, pack: first.took_pack ?? 0 };
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
      const { modelLine, brandModelRefs, brandModelBinding, personSource, occasionScene } =
        await getBrandModelContext(userId, data.modelId ?? null);


      const styles = data.isKidswear
        ? KIDSWEAR_STYLES
        : data.needsPerson
          ? personStyles(modelLine, brandModelBinding, !!data.isDrapedGarment)
          : PRODUCT_STYLES;

      const memoryCtx = await (await import("./brand-memory.server")).loadBrandMemoryContext(userId);
      const contextLine = `Product: ${data.productName}. Category: ${data.category}.${occasionScene ? " " + occasionScene : ""}${memoryCtx.photo ? " " + memoryCtx.photo : ""}`;

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
  .inputValidator(
    (d: {
      browserId: string;
      userId?: string | null;
      action?: "product" | "service_photo" | "service_no_photo";
    }) => d,
  )
  .handler(async ({ data }) => {
    const userId = (await import("./credits.server").then((m) => m.currentUserId())) ?? null;
    const { COSTS } = await import("./plans");
    const action = data.action ?? "product";
    const productCost = COSTS[action];
    const sb = await admin();

    let refundSub = 0;
    let refundPack = 0;
    let reserved = false;

    try {
      if (userId) {
        const { data: rows, error } = await sb.rpc("spend_credits", {
          _user_id: userId,
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
          user_id: userId ?? null,
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
        if (userId) {
          await sb.rpc("refund_credits", { _user_id: userId, _sub: refundSub, _pack: refundPack });
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
      modelId?: string | null;
      styleIndex: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const userId = (await import("./credits.server").then((m) => m.currentUserId())) ?? null;
    await ensureGenerationReserved(data.jobId, data.browserId);
    const urls = data.imageUrls && data.imageUrls.length > 0
      ? data.imageUrls
      : data.imageUrl
        ? [data.imageUrl]
        : [];
    if (urls.length === 0) throw new Error("No image provided");

    const { modelLine, brandModelRefs, brandModelBinding, personSource, occasionScene } = await getBrandModelContext(userId, data.modelId ?? null);
    const styles = getGenerationStyles(data, modelLine, brandModelBinding);
    const style = styles[data.styleIndex];
    if (!style) throw new Error("Photo style was not found. Try again.");

    const started = Date.now();
    try {
      console.info(`[generation] photo start job=${data.jobId} style=${style.kind} index=${data.styleIndex}`);
      const productRefs = await Promise.all(urls.slice(0, 5).map((u) => fetchAsBase64(u)));
      const memoryCtx = await (await import("./brand-memory.server")).loadBrandMemoryContext(userId);
      const contextLine = `Product: ${data.productName}. Category: ${data.category}.${occasionScene ? " " + occasionScene : ""}${memoryCtx.photo ? " " + memoryCtx.photo : ""}`;
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
    const userId = (await import("./credits.server").then((m) => m.currentUserId())) ?? null;
    if (data.jobId) await ensureGenerationReserved(data.jobId, data.browserId);
    // Look up brand kit if signed in.
    let brand: {
      business_name: string;
      sells_what: string;
      sells_to: string;
      tone: string;
    } | null = null;
    if (userId) {
      const sbLookup = await admin();
      const { data: bk } = await sbLookup
        .from("brand_kits")
        .select("business_name, sells_what, sells_to, tone")
        .eq("user_id", userId)
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

    const { loadBrandMemoryContext } = await import("./brand-memory.server");
    const memoryVoice = (await loadBrandMemoryContext(userId)).voice;

    const sys = `You are a plain-speaking Indian shopkeeper who writes product listings. You explain why THIS specific product is worth buying — with concrete facts, not filler.

${brandLines}
${toneLine}
${memoryVoice ? "\n" + memoryVoice + "\n" : ""}
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
    if (data.jobId) await ensureGenerationReserved(data.jobId, data.browserId);

    const sb = await admin();
    const { data: row, error } = await sb
      .from("generations")
      .insert({
        browser_id: data.browserId,
        user_id: userId ?? null,
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
    if (data.jobId) {
      try {
        await markGenerationSucceeded(data.jobId, data.browserId);
      } catch (err) {
        console.error(`[generation] mark succeeded failed job=${data.jobId} error=${err instanceof Error ? err.message : String(err)}`);
      }
    }
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
  .inputValidator((d: { id: string; browserId?: string }) => d)
  .handler(async ({ data }) => {
    const sb = await admin();
    const authHeader = getRequestHeader("authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      if (!token) throw new Error("Unauthorized");
      const { data: authData, error: authError } = await sb.auth.getUser(token);
      if (authError || !authData.user) throw new Error("Unauthorized");
      const { data: row, error } = await sb
        .from("generations")
        .select("*")
        .eq("id", data.id)
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return row;
    }

    if (!data.browserId) return null;
    const { data: row, error } = await sb
      .from("generations")
      .select("*")
      .eq("id", data.id)
      .eq("browser_id", data.browserId)
      .is("user_id", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });
