import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const BUCKET = "praan";

function apiKey(): string {
  const k = process.env.LOVABLE_API_KEY;
  if (!k) throw new Error("Missing LOVABLE_API_KEY");
  return k;
}

// ---------- Post types ----------

export const POST_TYPES = [
  "hero",
  "in_use",
  "one_feature",
  "why_this_one",
  "offer",
  "festival",
  "question",
  "care_and_use",
  "fresh_stock",
  "customer_voice",
] as const;
export type PostType = (typeof POST_TYPES)[number];

export const POST_TYPE_LABELS: Record<PostType, string> = {
  hero: "Hero shot",
  in_use: "In use",
  one_feature: "One feature",
  why_this_one: "Why this one",
  offer: "Offer",
  festival: "Festival",
  question: "Question",
  care_and_use: "Care & use",
  fresh_stock: "Fresh stock",
  customer_voice: "Customer voice",
};

const NO_PEOPLE =
  "Absolutely no people, no humans, no hands, no fingers, no arms, no models, no figures, no silhouettes — not even blurred in the background.";

const IMAGE_PROMPTS: Record<PostType, string> = {
  hero: "Clean studio hero shot on a pure white background, soft even lighting, subtle contact shadow, product centred with generous margin, straight-on angle, catalogue-grade, photorealistic.",
  in_use:
    "Lifestyle scene in the real place this specific product actually lives — a speaker on a desk, a kurta on a wardrobe rail, a spice jar on a kitchen shelf, a cushion on a sofa. Two or three tasteful props that clearly belong. Soft natural daylight, product is unmistakably the hero, no text.",
  one_feature:
    "Extreme close-up on ONE distinctive detail of the product (a stitch, a weave, a finish, a knob, a label). Macro-style, sharp focus on the detail, product surface fills most of the frame, warm soft lighting.",
  why_this_one:
    "Premium comparison-style hero: the product on a warm neutral surface with a soft directional light, single small hint of a lower-quality alternative implied by texture only (never shown). Rich, confident, magazine-catalogue look.",
  offer:
    "Same clean studio setting as a catalogue shot, with a small tasteful printed 'SALE' or discount tag prop tucked beside the product (never a big banner or overlay text). Bright cheerful lighting, festive but not gaudy.",
  festival:
    "Product photographed on a festive Indian setting — diyas, marigold garlands, brass, silk fabric, or rangoli edges peeking in — appropriate to the nearest festival. Warm golden lighting. Product remains the clear hero, uncrowded.",
  question:
    "Same product on a bright, cheerful flat-lay with generous negative space at the top for a question to sit in the viewer's mind. Playful arrangement, one or two friendly props.",
  care_and_use:
    "Product photographed alongside its real care items — e.g. a soft cloth, a wooden brush, a small dish of water — arranged neatly on a warm neutral surface. Instructional, calm mood.",
  fresh_stock:
    "Product presented as if just unboxed: subtle craft paper, twine, or a folded card nearby, on a light wooden or linen surface. Bright morning light, 'just in' energy, uncluttered.",
  customer_voice:
    "Product resting naturally in a warm cozy home setting — bedside table, kitchen counter, study desk — as if a happy owner just set it down. Lived-in, soft evening lamp light, one personal touch nearby (a book, a chai cup, keys).",
};

// ---------- Indian festivals (rough) ----------

const FESTIVALS: { date: string; name: string }[] = [
  { date: "01-14", name: "Makar Sankranti / Pongal" },
  { date: "01-26", name: "Republic Day" },
  { date: "02-14", name: "Valentine's Day" },
  { date: "03-08", name: "Holi" },
  { date: "04-14", name: "Baisakhi" },
  { date: "05-01", name: "Labour Day" },
  { date: "07-07", name: "Rath Yatra" },
  { date: "08-15", name: "Independence Day" },
  { date: "08-19", name: "Raksha Bandhan" },
  { date: "08-26", name: "Janmashtami" },
  { date: "09-07", name: "Ganesh Chaturthi" },
  { date: "10-02", name: "Gandhi Jayanti" },
  { date: "10-12", name: "Dussehra" },
  { date: "10-20", name: "Karva Chauth" },
  { date: "10-31", name: "Dhanteras" },
  { date: "11-01", name: "Diwali" },
  { date: "11-15", name: "Bhai Dooj" },
  { date: "12-25", name: "Christmas" },
  { date: "12-31", name: "New Year's Eve" },
];

function nearestFestival(fromISO: string): { name: string; date: string } {
  const from = new Date(fromISO + "T00:00:00Z");
  let best: { name: string; date: string; diff: number } | null = null;
  for (let yr = 0; yr <= 1; yr++) {
    for (const f of FESTIVALS) {
      const year = from.getUTCFullYear() + yr;
      const d = new Date(`${year}-${f.date}T00:00:00Z`);
      const diff = d.getTime() - from.getTime();
      if (diff < -3 * 86400000) continue;
      if (!best || Math.abs(diff) < Math.abs(best.diff)) {
        best = { name: f.name, date: d.toISOString().slice(0, 10), diff };
      }
    }
  }
  return best ?? { name: "the next festival", date: fromISO };
}

// ---------- helpers ----------

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function fetchAsBase64(url: string): Promise<{ b64: string; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch image failed: ${res.status}`);
  const mime = res.headers.get("content-type") || "image/jpeg";
  const buf = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return { b64: btoa(bin), mime };
}

// ---------- Plan builder ----------

type Product = {
  id: string;
  name: string;
  category: string | null;
  refUrl: string | null;
};

function buildSchedule(products: Product[], startISO: string) {
  const days: {
    day_index: number;
    post_date: string;
    post_type: PostType;
    product: Product;
  }[] = [];
  if (products.length === 0) return days;

  const types = [...POST_TYPES];
  // shuffle stably by index-based rotation so no back-to-back same type
  let productCursor = 0;
  let typeCursor = 0;
  let lastKey = "";
  for (let i = 0; i < 30; i++) {
    // pick a (product, type) that isn't identical to yesterday
    let picked: { product: Product; type: PostType } | null = null;
    for (let attempt = 0; attempt < products.length * types.length; attempt++) {
      const p = products[(productCursor + attempt) % products.length];
      const t = types[(typeCursor + Math.floor(attempt / products.length)) % types.length];
      const key = `${p.id}|${t}`;
      if (key !== lastKey) {
        picked = { product: p, type: t };
        productCursor = (productCursor + attempt + 1) % products.length;
        typeCursor = (typeCursor + 1) % types.length;
        lastKey = key;
        break;
      }
    }
    if (!picked) {
      picked = { product: products[i % products.length], type: types[i % types.length] };
      lastKey = `${picked.product.id}|${picked.type}`;
    }
    days.push({
      day_index: i,
      post_date: addDays(startISO, i),
      post_type: picked.type,
      product: picked.product,
    });
  }
  return days;
}

// ---------- Server fns ----------

export const getOrCreatePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { month: string }) => d) // first-of-month ISO
  .handler(async ({ context, data }) => {
    const sb = context.supabase;
    const monthStart = data.month.slice(0, 7) + "-01";

    // existing?
    const { data: existing } = await sb
      .from("content_plans")
      .select("id, status, month")
      .eq("user_id", context.userId)
      .eq("month", monthStart)
      .maybeSingle();
    if (existing) return { plan_id: existing.id, status: existing.status, created: false };

    // load products
    const { data: prods, error: pe } = await sb
      .from("generations")
      .select("id, product_name, category, generated_images, original_image_url")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (pe) throw new Error(pe.message);
    const products: Product[] = (prods ?? []).map((p) => {
      const imgs = (p.generated_images ?? []) as Array<{ kind: string; ratio: string; url: string }>;
      const ref =
        imgs.find((i) => i.kind === "white" && i.ratio === "1:1")?.url ??
        imgs[0]?.url ??
        p.original_image_url;
      return {
        id: p.id,
        name: p.product_name ?? "Product",
        category: p.category,
        refUrl: ref ?? null,
      };
    });
    if (products.length === 0) throw new Error("NO_PRODUCTS");

    // create plan
    const { data: plan, error: perr } = await sb
      .from("content_plans")
      .insert({ user_id: context.userId, month: monthStart, status: "generating" })
      .select("id")
      .single();
    if (perr || !plan) throw new Error(perr?.message ?? "plan insert failed");

    // starting date = today if in this month, otherwise first of month
    const today = new Date().toISOString().slice(0, 10);
    const start = today.startsWith(monthStart.slice(0, 7)) ? today : monthStart;
    const schedule = buildSchedule(products, start);

    const rows = schedule.map((s) => ({
      plan_id: plan.id,
      user_id: context.userId,
      product_id: s.product.id,
      post_date: s.post_date,
      day_index: s.day_index,
      post_type: s.post_type,
      product_name: s.product.name,
      product_ref_url: s.product.refUrl,
      status: "pending" as const,
    }));
    const { error: ie } = await sb.from("content_posts").insert(rows);
    if (ie) throw new Error(ie.message);

    return { plan_id: plan.id, status: "generating", created: true };
  });

export const listPlanPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan_id: string }) => d)
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("content_posts")
      .select(
        "id, plan_id, product_id, post_date, day_index, post_type, product_name, image_url, caption, hashtags, status, posted, error",
      )
      .eq("plan_id", data.plan_id)
      .eq("user_id", context.userId)
      .order("day_index", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const markPosted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { post_id: string; posted: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("content_posts")
      .update({ posted: data.posted })
      .eq("id", data.post_id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Generation of one post ----------

async function generatePostArtifacts(post: {
  id: string;
  post_type: PostType;
  product_name: string | null;
  product_ref_url: string | null;
  post_date: string;
  user_id: string;
  brand: {
    business_name?: string;
    sells_to?: string;
    tone?: string;
    accent_color?: string;
  };
}) {
  if (!post.product_ref_url) throw new Error("Missing product reference image");
  const { b64: refB64, mime: refMime } = await fetchAsBase64(post.product_ref_url);

  // ---- Image ----
  const stylePrompt = IMAGE_PROMPTS[post.post_type];
  const fest =
    post.post_type === "festival" ? nearestFestival(post.post_date) : { name: "", date: "" };
  const festHint = post.post_type === "festival" ? ` Festival: ${fest.name}.` : "";
  const context = `Product: ${post.product_name ?? "Product"}.${festHint}`;
  const ratioHint =
    "Square 1:1 aspect ratio, 1024x1024. The full product must be centred and completely visible with comfortable margin — nothing important cropped.";
  const imgBody = {
    model: "google/gemini-2.5-flash-image",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `${context} ${stylePrompt} ${ratioHint} ${NO_PEOPLE} Keep product identical to the reference photo in shape, colour, branding and label.`,
          },
          { type: "image_url", image_url: { url: `data:${refMime};base64,${refB64}` } },
        ],
      },
    ],
    modalities: ["image", "text"],
  };
  const imgRes = await fetch(`${GATEWAY}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify(imgBody),
  });
  if (!imgRes.ok) throw new Error(`image gen: ${imgRes.status} ${await imgRes.text()}`);
  const imgJson = (await imgRes.json()) as { data?: { b64_json: string }[] };
  const imgB64 = imgJson.data?.[0]?.b64_json;
  if (!imgB64) throw new Error("no image returned");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const bytes = b64ToBytes(imgB64);
  const path = `calendar/${post.user_id}/${post.id}.png`;
  const up = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/png", upsert: true });
  if (up.error) throw new Error(`upload: ${up.error.message}`);
  const signed = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signed.error || !signed.data) throw new Error("sign failed");
  const imageUrl = signed.data.signedUrl;

  // ---- Caption ----
  const brandTone =
    post.brand.tone === "premium"
      ? "confident, understated, quality-first"
      : post.brand.tone === "value"
        ? "warm, direct, value-for-money, price-savvy"
        : post.brand.tone === "traditional"
          ? "warm, respectful, rooted in Indian tradition"
          : "friendly, conversational, warm";
  const audience = post.brand.sells_to || "everyday Indian shoppers";
  const biz = post.brand.business_name || "our shop";

  const typeBrief: Record<PostType, string> = {
    hero: "Introduce the product plainly. One clear line of what it is and one line of why it matters. No fluff.",
    in_use: "Show it in real daily use. Paint a small, specific scene where a buyer would actually reach for it.",
    one_feature:
      "Zoom in on ONE concrete detail (stitch, finish, size, ingredient) and explain in one line why that detail matters.",
    why_this_one:
      "Explain what makes this one better than the cheap alternative. Concrete comparison, not generic praise.",
    offer:
      "Announce a clear discount or bundle. State the offer up front. Keep urgency real, not shouty.",
    festival: `Tie the product to ${fest.name} in a natural, useful way — a real gift, a real festive use.`,
    question:
      "Open with a specific question the target buyer will actually have opinions on. Invite a reply.",
    care_and_use:
      "Give 2-3 short, concrete care or usage tips. Practical, no filler.",
    fresh_stock:
      "New arrival / back in stock energy. State plainly that it's just in, and one line on why it goes fast.",
    customer_voice:
      "Written in a happy buyer's own words as a short review. Start with 'Bought this from ...' or similar; end with a plain-language recommendation. Clearly reads like a review.",
  };

  const sys = `You write Instagram/WhatsApp posts for an Indian small-business seller called ${biz}. Target buyer: ${audience}. Tone: ${brandTone}. Rules: open with the most useful, concrete fact. No filler words like elevate, unleash, embrace, on the go, game-changer, must-have. Use rupees (₹) when talking price. Keep it human — a knowledgeable shopkeeper, not a marketing agency. Reply with a compact JSON object only, no prose, no markdown fences.`;

  const user = `Product: ${post.product_name ?? "our product"}.
Post type: ${POST_TYPE_LABELS[post.post_type]}.
Brief: ${typeBrief[post.post_type]}
Return JSON: {"caption": string (2-4 short paragraphs, 400-700 chars, line breaks between paragraphs), "hashtags": string (10-15 relevant Indian-market hashtags space-separated starting with #)}`;

  const capRes = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    }),
  });
  if (!capRes.ok) throw new Error(`caption: ${capRes.status} ${await capRes.text()}`);
  const capJson = (await capRes.json()) as { choices: { message: { content: string } }[] };
  let txt = capJson.choices?.[0]?.message?.content?.trim() ?? "";
  txt = txt.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let caption = "";
  let hashtags = "";
  try {
    const j = JSON.parse(txt);
    caption = String(j.caption ?? "").trim();
    hashtags = String(j.hashtags ?? "").trim();
  } catch {
    const m = txt.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const j = JSON.parse(m[0]);
        caption = String(j.caption ?? "").trim();
        hashtags = String(j.hashtags ?? "").trim();
      } catch {
        /* ignore */
      }
    }
  }
  if (!caption) caption = txt.slice(0, 700);

  return { image_url: imageUrl, caption, hashtags };
}

export const generateOnePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { post_id?: string; plan_id: string }) => d)
  .handler(async ({ context, data }) => {
    const sb = context.supabase;

    // atomically pick and lock one pending post (or the requested one)
    type Target = {
      id: string;
      post_type: PostType;
      product_name: string | null;
      product_ref_url: string | null;
      post_date: string;
    };
    let target: Target | null = null;

    if (data.post_id) {
      const { data: row } = await sb
        .from("content_posts")
        .update({ status: "generating", error: null })
        .eq("id", data.post_id)
        .eq("user_id", context.userId)
        .select("id, post_type, product_name, product_ref_url, post_date")
        .single();
      target = (row ?? null) as Target | null;
    } else {
      // find one pending, then claim it
      const { data: candidates } = await sb
        .from("content_posts")
        .select("id")
        .eq("plan_id", data.plan_id)
        .eq("user_id", context.userId)
        .eq("status", "pending")
        .order("day_index", { ascending: true })
        .limit(1);
      const first = candidates?.[0];
      if (!first) return { done: true as const };
      const { data: claimed } = await sb
        .from("content_posts")
        .update({ status: "generating" })
        .eq("id", first.id)
        .eq("status", "pending")
        .select("id, post_type, product_name, product_ref_url, post_date")
        .maybeSingle();
      if (!claimed) return { done: false as const, skipped: true as const };
      target = claimed as unknown as Target;
    }
    if (!target) return { done: true as const };

    // fetch brand kit
    const { data: brand } = await sb
      .from("brand_kits")
      .select("business_name, sells_to, tone, accent_color")
      .eq("user_id", context.userId)
      .maybeSingle();

    try {
      const out = await generatePostArtifacts({
        id: target.id,
        post_type: target.post_type as PostType,
        product_name: target.product_name,
        product_ref_url: target.product_ref_url,
        post_date: target.post_date,
        user_id: context.userId,
        brand: (brand ?? {}) as {
          business_name?: string;
          sells_to?: string;
          tone?: string;
          accent_color?: string;
        },
      });
      await sb
        .from("content_posts")
        .update({
          status: "ready",
          image_url: out.image_url,
          caption: out.caption,
          hashtags: out.hashtags,
          error: null,
        })
        .eq("id", target.id);

      // mark plan ready if all done
      const { data: remaining } = await sb
        .from("content_posts")
        .select("id")
        .eq("plan_id", data.plan_id)
        .in("status", ["pending", "generating"])
        .limit(1);
      if (!remaining || remaining.length === 0) {
        await sb.from("content_plans").update({ status: "ready" }).eq("id", data.plan_id);
      }

      return { done: false as const, post_id: target.id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sb
        .from("content_posts")
        .update({ status: "error", error: msg.slice(0, 500) })
        .eq("id", target.id);
      return { done: false as const, post_id: target.id, error: msg };
    }
  });
