// Shared server-only image generation: storage helpers, guardrail prompt
// blocks, shot styles and the single-image renderer.
// Used by full generation AND by single-component regeneration so the two can
// never drift apart on safety or house style.
import { geminiGenerateImage, geminiGenerateText } from "./gemini.server";

const BUCKET = "praan";

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function signedUrl(path: string, expires = 60 * 60 * 24 * 30): Promise<string> {
  const sb = await admin();
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, expires);
  if (error || !data) throw new Error(`sign failed: ${error?.message}`);
  return data.signedUrl;
}

export async function uploadBytes(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const sb = await admin();
  const { error } = await sb.storage.from(BUCKET).upload(path, bytes, {
    contentType,
    upsert: true,
  });
  if (error) throw new Error(`upload failed: ${error.message}`);
  return signedUrl(path);
}

export async function fetchAsBase64(url: string): Promise<{ b64: string; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch image failed: ${res.status}`);
  const mime = res.headers.get("content-type") || "image/jpeg";
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  const b64 = btoa(bin);
  return { b64, mime };
}

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- Image generation ----------

export const NO_PEOPLE =
  "Absolutely no people, no humans, no hands, no fingers, no arms, no models, no figures, no silhouettes — not even blurred in the background.";

// Applied to EVERY image prompt. Locks the output toward real photography instead of AI-art gloss.
export const PHOTO_REALISM = [
  "This is a real photograph, not a render or illustration.",
  "Shot on a full-frame camera with an 85mm lens at f/4, natural window light coming from the left, soft directional shadow falling to the right, gentle falloff — never flat, even, shadowless studio lighting.",
  "True-to-life colour, neutral white balance, no saturation boost, no contrast punch, no colour grading.",
  "Real surface texture visible — unpolished wood grain, woven cloth weave, matte paper, brushed concrete, plain plaster wall — with tiny natural imperfections (a faint mark, a slight crease, a bit of dust).",
  "Subtle honest shadow, natural highlights only where light actually falls. No artificial rim light, no glow, no halo, no bloom, no lens flare, no vignette.",
  "Photograph the product exactly as it is — do not idealise, smooth, polish, prettify, or reinterpret it.",
].join(" ");

// Words that push image models toward the plastic AI look. Never include any of these.
export const BANNED_LOOK =
  "Do NOT use or evoke any of: glossy, glowing, vibrant, hyper-realistic, ultra-detailed, cinematic lighting, dramatic lighting, 8K, HDR, professional studio lighting, floating, levitating, gradient background, product hovering in mid-air, seamless void, perfect seamless backdrop, glass reflection floor, polished mirror surface, magazine gloss.";

// The four shots are the same physical object photographed in different settings.
export const SAME_OBJECT =
  "This is the SAME physical object shown in the reference photos, just photographed in a different setting — identical wear, identical marks, identical colour, identical detail as every other shot in this set.";

// Absolute product fidelity — the single most important rule.
export const PRODUCT_FIDELITY =
  "Preserve the EXACT colour, EXACT texture, EXACT pattern, EXACT proportions and EVERY visible detail of the product as shown in the reference photos — including any small marks, stitching, weave, label placement, print alignment, and material finish. Change ONLY the background and the lighting. Never redraw, restyle, smooth, upscale, idealise or reinterpret the product itself. If any detail is unclear from the references, keep it plain rather than invent.";

export type StyleDef = { kind: string; prompt: string; hasPerson?: boolean };

export const PRODUCT_STYLES: StyleDef[] = [
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

export function personStyles(modelLine: string, brandModelBinding: string, isDraped: boolean): StyleDef[] {
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
export const KIDSWEAR_STYLES: StyleDef[] = [
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

export function getGenerationStyles(data: {
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

export async function getBrandModelContext(userId?: string | null, modelId?: string | null): Promise<{
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

export async function generateOneImage(
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

