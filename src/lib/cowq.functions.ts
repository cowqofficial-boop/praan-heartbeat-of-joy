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

// ---------- Image generation ----------

const NO_PEOPLE =
  "Absolutely no people, no humans, no hands, no fingers, no arms, no models, no figures, no silhouettes — not even blurred in the background.";

// Applied to EVERY image prompt. Locks the output toward real photography instead of AI-art gloss.
const PHOTO_REALISM = [
  "This is a real photograph, not a render or illustration.",
  "Shot on a full-frame camera with an 85mm lens at f/4, natural window light coming from the left, soft directional shadow falling to the right, gentle falloff — never flat, even, shadowless studio lighting.",
  "True-to-life colour, neutral white balance, no saturation boost, no contrast punch, no colour grading.",
  "Real surface texture visible — unpolished wood grain, woven cloth weave, matte paper, brushed concrete, plain plaster wall — with tiny natural imperfections (a faint mark, a slight crease, a bit of dust).",
  "Subtle honest shadow, natural highlights only where light actually falls. No artificial rim light, no glow, no halo, no bloom, no lens flare, no vignette.",
  "Photograph the product exactly as it is — do not idealise, smooth, polish, prettify, or reinterpret it.",
].join(" ");

// Words that push image models toward the plastic AI look. Never include any of these.
const BANNED_LOOK =
  "Do NOT use or evoke any of: glossy, glowing, vibrant, hyper-realistic, ultra-detailed, cinematic lighting, dramatic lighting, 8K, HDR, professional studio lighting, floating, levitating, gradient background, product hovering in mid-air, seamless void, perfect seamless backdrop, glass reflection floor, polished mirror surface, magazine gloss.";

// The four shots are the same physical object photographed in different settings.
const SAME_OBJECT =
  "This is the SAME physical object shown in the reference photos, just photographed in a different setting — identical wear, identical marks, identical colour, identical detail as every other shot in this set.";

// Absolute product fidelity — the single most important rule.
const PRODUCT_FIDELITY =
  "Preserve the EXACT colour, EXACT texture, EXACT pattern, EXACT proportions and EVERY visible detail of the product as shown in the reference photos — including any small marks, stitching, weave, label placement, print alignment, and material finish. Change ONLY the background and the lighting. Never redraw, restyle, smooth, upscale, idealise or reinterpret the product itself. If any detail is unclear from the references, keep it plain rather than invent.";

type StyleDef = { kind: string; prompt: string; hasPerson?: boolean };

const PRODUCT_STYLES: StyleDef[] = [
  {
    kind: "white",
    prompt:
      "White-background e-commerce shot for Amazon/Flipkart. Product placed on a clean matte white paper sweep (not a perfect void — a real paper surface, faint texture visible). Soft natural window light from the left, gentle real contact shadow beneath the product falling slightly to the right. Product centred with generous margin on all four sides. No props, no text.",
  },
  {
    kind: "studio",
    prompt:
      "Product resting on an ordinary matte surface — unpolished light wood with visible grain, or plain neutral linen with soft creases. Soft daylight from a nearby window, honest side shadow, quiet neutral background wall slightly out of focus. Minimal styling. Real photograph, not staged perfection.",
  },
  {
    kind: "lifestyle",
    prompt:
      "First decide where this specific product actually lives in a real Indian home or small workplace — a speaker on a wooden desk beside a notebook, a spice jar on a kitchen shelf beside a steel dabba, a cushion on a cotton-covered sofa, a mug on a breakfast table with a folded newspaper. Never a shop, market stall, bazaar, workshop or warehouse unless the product is shop equipment. Keep the scene simple: one clear ordinary surface, at most two or three small everyday props that genuinely belong. Real morning daylight from a window, natural shadows, product the clear hero, uncrowded. No text.",
  },
  {
    kind: "flatlay",
    prompt:
      "Overhead shot from directly above on a real textured neutral surface — plain linen, unpolished wood, or matte craft paper with visible fibre. Two or three tasteful everyday props that clearly belong with this product's real use, arranged naturally (not perfectly symmetrical). Soft daylight, real soft shadows on the surface, product centred and clearly the hero. No text.",
  },
];

function personStyles(modelLine: string, brandModelBinding: string, isDraped: boolean): StyleDef[] {
  const drapeRules = `If it is a draped Indian garment (saree, dupatta, lehenga, stole), the COMPLETE drape must be visible and correctly formed in the frame: pleats neat at the waist, pallu over the LEFT shoulder falling to the back, border continuous and unbroken along the whole length, full length of the garment from shoulder to hem visible. If the correct drape cannot be produced with confidence, prefer a well-lit product-only shot to a badly draped or badly cropped model shot.`;
  const bodyRules = `Natural relaxed pose, hands and fingers correct (five fingers, no distortion), arms held slightly away from the body so the garment is not hidden, face calm and pleasant with a genuine relaxed expression — no fashion-editorial posing. The person is a clearly adult model — 25 to 40 years old, unmistakably an adult. Never a child, teenager or minor.`;
  const skinRules = `Natural skin texture with visible pores, fine hair and normal skin tone variation. NO skin smoothing, NO beauty retouching, NO airbrush, NO plastic complexion, NO glowing skin. Small honest details — a stray hair, faint under-eye tone, an ordinary mark — are welcome. Hair is real hair with individual strands, not a smooth cap.`;
  const FRAMING_HARD_RULE = `HARD FRAMING RULE — the entire product must be ENTIRELY WITHIN THE FRAME, fully visible from every side, with clear margin on all four sides, NEVER cut off by any edge of the image. Do not crop into the product. If framing forces a choice between showing the model's face and showing the whole garment, ALWAYS show the whole garment — crop the face, never the product.`;
  const whitePrompt = isDraped
    ? "White-background e-commerce shot of the exact same draped garment from the references — same colour, weave, border and pattern. Present it WITHOUT a person: neatly folded on a clean matte white paper sweep OR partially draped over a plain wooden hanger/stand so the fabric, border and pallu read clearly. Soft natural window light from the left, real soft contact shadow, centred with generous margin. Never a flat rectangle of cloth. No person, no hands, no mannequin face, no text."
    : "White-background e-commerce shot for Amazon/Flipkart. Product on a clean matte white paper sweep (not a perfect void — a real paper surface, faint texture visible). Soft natural window light from the left, gentle real contact shadow. Centred with generous even margin on all four sides. No props, no text. No person.";
  return [
    { kind: "white", prompt: whitePrompt },
    {
      kind: "studio",
      prompt:
        "The same garment on or against a quiet ordinary indoor backdrop — a plain plaster wall with soft light falloff, or a wooden panel with visible grain. Soft daylight from a nearby window, gentle real side shadow, minimal styling. Product centred with clear even margin on all four sides — nothing touching the frame edge. No people.",
    },
    {
      kind: "onmodel_full",
      hasPerson: true,
      prompt: `On-model FULL-BODY shot: one adult person wearing the product, framed from ABOVE THE HEAD down to BELOW THE FEET (or at minimum to mid-calf for full-length garments). The ENTIRE garment must be visible top to bottom with clear margin — for a saree, that means the complete drape: pleats at the waist, pallu over the left shoulder falling to the back, and the border continuous along the whole length; for a kurta, dress or lehenga, shoulder to hem fully in frame. Straight-on view, model standing naturally with arms held slightly away from the body so no part of the garment is hidden. ${FRAMING_HARD_RULE} ${modelLine} ${brandModelBinding} ${PRODUCT_FIDELITY} ${drapeRules} ${bodyRules} ${skinRules} Soft natural indoor daylight from a nearby window, plain ordinary neutral wall behind the model, real soft shadow. Photograph, not fashion editorial.`,
    },
    {
      kind: "onmodel_detail",
      hasPerson: true,
      prompt: `On-model THREE-QUARTER / WAIST-UP detail shot of the same adult person: closer framing to show fabric, weave, border, neckline and how the garment falls — but NEVER a tight crop into the product. Frame from head to waist at minimum so the viewer still understands what they are looking at; the section of the product shown must be entirely within the frame with clear margin, never becoming an abstract patch of colour. ${FRAMING_HARD_RULE} ${modelLine} ${brandModelBinding} ${PRODUCT_FIDELITY} ${drapeRules} ${bodyRules} ${skinRules} Soft natural indoor daylight, plain ordinary neutral wall behind the model, real soft shadow.`,
    },
  ];
}


// Kidswear: never a person. Product-focused shots — folded, on a hanger, plain surface, or ghost-mannequin.
const KIDSWEAR_STYLES: StyleDef[] = [
  {
    kind: "white",
    prompt:
      "White-background e-commerce shot of the exact same children's garment from the references — same colour, pattern, print and stitching. Laid flat and neatly arranged on a clean matte white paper sweep so the front is clearly visible and the shape reads well. Soft natural window light from the left, real soft contact shadow, centred, no props, no text. Absolutely no person, no child, no adult, no hands, no mannequin face.",
  },
  {
    kind: "hanger",
    prompt:
      "The same children's garment on a plain wooden or white clothing hanger against an ordinary neutral wall, soft daylight from a nearby window, real soft shadow on the wall, showing the full shape and length of the garment. No person, no child, no hands, no mannequin face.",
  },
  {
    kind: "ghost",
    prompt:
      "The same children's garment in ghost-mannequin style: the garment appears filled out and holds its natural shape as if worn, but there is NO person and NO visible mannequin — the inside is hollow. Plain ordinary neutral backdrop, soft natural daylight, real soft shadow. Absolutely no child, no adult, no hands, no face.",
  },
  {
    kind: "flatlay",
    prompt:
      "The same children's garment shot from directly above on a real textured neutral surface — plain linen or unpolished wood with visible grain — neatly arranged. One or two tasteful child-appropriate props that clearly belong (a small folded blanket, a wooden toy at a distance) — never a child, never hands, never a person. Soft daylight, real soft shadows, garment centred.",
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

async function getBrandModelContext(userId?: string | null, modelId?: string | null): Promise<{
  modelLine: string;
  brandModelRefs: { b64: string; mime: string }[];
  brandModelBinding: string;
  personSource: "ai" | "user";
  occasionScene: string;
}> {
  let modelLine =
    "Choose a clearly adult model (25 to 40 years old) who genuinely fits this product's real buyer — natural-looking Indian adult, warm approachable presence. Never a child, never a teenager.";
  let brandModelRefs: { b64: string; mime: string }[] = [];
  let brandModelBinding = "";
  let personSource: "ai" | "user" = "ai";
  let occasionScene = "";
  if (!userId) return { modelLine, brandModelRefs, brandModelBinding, personSource, occasionScene };

  const sb = await admin();
  const { data: kit } = await sb
    .from("brand_kits")
    .select("model_gender, model_age, model_skin, model_body, model_region, model_nationality, model_cultural_style, model_occasion, model_hair, model_expression, model_pose, model_custom_look, brand_model_enabled, brand_model_url, brand_model_source, brand_model_photos")
    .eq("user_id", userId)
    .maybeSingle();
  if (!kit) return { modelLine, brandModelRefs, brandModelBinding, personSource, occasionScene };

  const { describeModelPrefs, describeModelStyling, describeOccasionScene } = await import("./brand-kit.functions");
  const prefs = describeModelPrefs(kit);
  if (prefs) modelLine = `The model is: ${prefs}. Always a clearly adult person, 25 to 40 years old.`;
  const styling = describeModelStyling(kit);
  if (styling) modelLine = `${modelLine} ${styling}`;
  occasionScene = describeOccasionScene(kit);
  if (!kit.brand_model_enabled && !modelId)
    return { modelLine, brandModelRefs, brandModelBinding, personSource, occasionScene };

  let source = (kit.brand_model_source as "ai" | "user" | null) ?? "ai";
  let photos = source === "user"
    ? ((kit.brand_model_photos as string[] | null) ?? []).filter(Boolean)
    : (kit.brand_model_url ? [kit.brand_model_url] : []);

  // An explicitly chosen saved model wins over the active brand-kit model.
  if (modelId) {
    const { data: chosen } = await sb
      .from("brand_models")
      .select("photos")
      .eq("user_id", userId)
      .eq("id", modelId)
      .maybeSingle();
    const chosenPhotos = ((chosen?.photos as string[] | null) ?? []).filter(Boolean);
    if (chosenPhotos.length > 0) {
      photos = chosenPhotos;
      source = "user";
    }
  }
  const loaded: { b64: string; mime: string }[] = [];
  for (const p of photos.slice(0, 5)) {
    try { loaded.push(await fetchAsBase64(p)); } catch { /* skip */ }
  }
  if (loaded.length === 0) return { modelLine, brandModelRefs, brandModelBinding, personSource, occasionScene };
  brandModelRefs = loaded;
  personSource = source;
  brandModelBinding = source === "user"
    ? "Reuse the exact same REAL person shown in the final reference photos — same face, same skin tone, same build, same hair — so this shop's photos all feature one consistent model. Keep their real facial features faithful. The person is clearly an adult."
    : "Reuse the exact same person shown in the final reference portrait — same face, same skin tone, same build — so this shop's photos all feature one consistent brand model. The person is clearly an adult.";
  return { modelLine, brandModelRefs, brandModelBinding, personSource, occasionScene };
}

async function generateOneImage(
  refs: { b64: string; mime: string }[],
  prompt: string,
  targetSize = 2048,
  allowPerson = false,
): Promise<string> {
  const sizeHint = `Render at ${targetSize} by ${targetSize} pixels, square 1:1, high detail. The subject must be entirely within the frame with generous even margin on all four sides — nothing important may touch or exceed any edge of the image, so it stays uncropped when reframed to vertical.`;
  const multiHint =
    refs.length > 1
      ? `You are given ${refs.length} reference images. Use ALL of them together. The FIRST images are photos of the same single product from different angles — use them jointly to keep the product's true shape, colour, material, branding, wear and any labels faithful from every side; if the references disagree, keep whatever appears in the majority of references. Any final references (if present) are photos of one real PERSON from different angles — use them together to keep that same person's face, skin tone, hair and build consistent; reuse that exact person.`
      : "Keep the product identical to the reference photo — same shape, colour, material, branding and label.";
  const peopleRule = allowPerson ? "" : NO_PEOPLE;

  async function runOnce(attempt: number, extraGuidance = ""): Promise<string> {
    const full = `${prompt} ${SAME_OBJECT} ${PRODUCT_FIDELITY} ${PHOTO_REALISM} ${BANNED_LOOK} ${sizeHint} ${peopleRule} ${multiHint} ${extraGuidance}`.trim();
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
      try {
        return await runOnce(
          attemptCount,
          "PREVIOUS ATTEMPT CROPPED THE PRODUCT. Pull the camera BACK and zoom OUT significantly so the entire garment and person fit comfortably inside the frame with clear empty margin on all four sides. Prioritise showing the whole product over showing the model's face — crop the face at the top if you must, but never crop the product.",
        );
      } catch (err) {
        console.error(`[generation] crop retry failed; accepting first image error=${err instanceof Error ? err.message : String(err)}`);
        return first;
      }
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

    const memoryVoice = (await import("./brand-memory.server")).loadBrandMemoryContext
      ? (await (await import("./brand-memory.server")).loadBrandMemoryContext(userId)).voice
      : "";

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
