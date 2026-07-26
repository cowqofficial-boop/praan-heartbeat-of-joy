// Server-only service generation: poster image + listing copy + save.
// Reuses the same Gemini client and storage helpers as products.

import { z } from "zod";
import { geminiGenerateImage, geminiGenerateText, parseJsonLoose, GEMINI_IMAGE_MODEL } from "./gemini.server";
import {
  SERVICE_IMAGE_GUARDRAILS,
  fallbackCta,
  sanitizeServiceText,
  type ServiceDetails,
} from "./service";

const BUCKET = "praan";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function signedUrl(path: string, expires = 60 * 60 * 24 * 30): Promise<string> {
  const sb = await admin();
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(path, expires);
  if (error || !data) throw new Error(`sign failed: ${error?.message}`);
  return data.signedUrl;
}

async function uploadBytes(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
  const sb = await admin();
  const { error } = await sb.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
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
  return { b64: btoa(bin), mime };
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const REALISM =
  "Real photography, not a render. Natural light, true-to-life colour, honest texture, no glow, no bloom, no lens flare, no HDR, no magazine gloss.";

/** Poster built from the seller's own photo — the real workspace/work, styled cleanly. */
function photoPosterPrompt(name: string, category: string, priceLine: string, photoMemory = ""): string {
  return [
    `Turn this photograph into a clean, honest promotional poster for a service called "${name}"${category ? ` (${category})` : ""}.`,
    "Keep the real scene from the photo exactly as it is — same place, same tools, same work, same people if any. Only improve framing, lighting balance and clarity, and add calm empty space for a short title.",
    priceLine,
    photoMemory,
    REALISM,
    SERVICE_IMAGE_GUARDRAILS,
    "Square 1:1, 2048 by 2048 pixels, generous margin on all four sides.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** No photo: typographic / iconographic poster only. Never photorealistic people or results. */
function graphicPosterPrompt(name: string, category: string, priceLine: string): string {
  return [
    `Design a flat graphic promotional poster for a service called "${name}"${category ? ` (${category})` : ""}.`,
    "Style: typographic and iconographic only — bold clean lettering, simple line icons, flat shapes, generous negative space, a calm two- or three-colour palette.",
    "Absolutely no photographs, no photorealistic imagery, no people, no faces, no hands, no depiction of work being done or of any result.",
    priceLine,
    SERVICE_IMAGE_GUARDRAILS,
    "Square 1:1, 2048 by 2048 pixels, text spelled correctly, nothing touching the edges.",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateServicePoster(opts: {
  browserId: string;
  userId?: string | null;
  name: string;
  category: string;
  photoUrl: string | null;
  priceLabel: string | null;
}): Promise<{ url: string; hadPhoto: boolean }> {
  const priceLine = opts.priceLabel
    ? `You may render the price "${opts.priceLabel}" as small clean text. No other claims or numbers.`
    : "Do not render any price or numbers.";
  const photoMemory = (
    await (await import("./brand-memory.server")).loadBrandMemoryContext(opts.userId)
  ).photo;
  const started = Date.now();
  let out: { mimeType: string; b64: string };
  if (opts.photoUrl) {
    const ref = await fetchAsBase64(opts.photoUrl);
    out = await geminiGenerateImage({
      prompt: photoPosterPrompt(opts.name, opts.category, priceLine, photoMemory),
      reference: { mimeType: ref.mime, b64: ref.b64 },
    });
  } else {
    // The image model here still expects a reference; a blank canvas keeps the
    // request valid while the prompt drives a purely graphic poster.
    const blank = blankCanvasPng();
    out = await geminiGenerateImage({
      prompt: graphicPosterPrompt(opts.name, opts.category, priceLine),
      reference: { mimeType: "image/png", b64: blank },
    });
  }
  const bytes = b64ToBytes(out.b64);
  const suffix = Math.random().toString(36).slice(2, 8);
  const path = `generated/${opts.browserId}/${Date.now()}-${suffix}-service-poster.png`;
  const url = await uploadBytes(path, bytes, "image/png");
  console.info(
    `[service] poster done photo=${!!opts.photoUrl} duration_ms=${Date.now() - started}`,
  );
  return { url, hadPhoto: !!opts.photoUrl };
}

/** 8x8 white PNG, base64. Used only as a neutral canvas for graphic posters. */
function blankCanvasPng(): string {
  return "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFElEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC";
}

const ServiceCopySchema = z.object({
  seoTitle: z.string(),
  description: z.string(),
  bullets: z.array(z.string()),
  tags: z.array(z.string()),
  instagram: z.string(),
  instagramHashtags: z.array(z.string()),
  whatsapp: z.string(),
  ctaLine: z.string(),
});

export type ServiceCopy = z.infer<typeof ServiceCopySchema>;

export async function generateServiceCopy(opts: {
  userId: string | null;
  name: string;
  details: ServiceDetails;
}): Promise<ServiceCopy> {
  let brand: { business_name: string; sells_what: string; sells_to: string; tone: string } | null = null;
  if (opts.userId) {
    const sb = await admin();
    const { data: bk } = await sb
      .from("brand_kits")
      .select("business_name, sells_what, sells_to, tone")
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (bk) brand = bk;
  }

  const toneLine =
    brand?.tone === "premium"
      ? "Voice: premium, understated, confident. No exclamation marks."
      : brand?.tone === "value"
        ? "Voice: value-for-money, practical, direct."
        : brand?.tone === "traditional"
          ? "Voice: traditional, warm, respectful."
          : "Voice: friendly, plain-speaking, warm.";

  const brandLines = brand
    ? `Business: ${brand.business_name || "unnamed"}. Sells: ${brand.sells_what || "n/a"}. Target customer: ${brand.sells_to || "general Indian customers"}.`
    : "Business: independent Indian service provider. Target customer: general Indian customers.";

  const d = opts.details;
  const tierLines = d.tiers.length
    ? d.tiers
        .map((t, i) => `Package ${i + 1}: ${t.name} — ₹${t.price}. Includes: ${t.inclusions.filter(Boolean).join("; ") || "n/a"}`)
        .join("\n")
    : d.flatPrice
      ? `Single price: ₹${d.flatPrice}`
      : "No price given.";

  const contactLine =
    d.contact.method === "phone"
      ? `Customers book by calling ${d.contact.value}.`
      : d.contact.method === "whatsapp"
        ? `Customers book on WhatsApp at ${d.contact.value}.`
        : "Customers book by sending a message.";

  const memoryVoice = (
    await (await import("./brand-memory.server")).loadBrandMemoryContext(opts.userId)
  ).voice;

  const sys = `You are a plain-speaking Indian shopkeeper writing a listing for a SERVICE you provide. You explain why THIS service is worth booking — with concrete facts, not filler.

${brandLines}
${toneLine}
${memoryVoice ? "\n" + memoryVoice + "\n" : ""}
Hard rules:
- Open with the single most useful thing about the service. Never restate what the service obviously is.
- Every bullet must contain a concrete fact: what's included, how long it takes, what's covered, what the customer gets. Never a vague bullet.
- Never claim reviews, ratings, testimonials, awards, guarantees, or results you were not given.
- Never invent numbers — no "500+ happy customers", no "10 years' experience" unless the seller said so.
- Banned phrases (never use, in any form): "on the go", "elevate", "adds a pop", "perfect for every", "take your X anywhere", "grab yours today", "unleash", "curated", "lifestyle".
- Sentence case. No ALL CAPS. No emoji spam. Confident, specific, no filler.`;

  const userPrompt = `Write a full listing for this service.

Service: ${opts.name}
Category: ${d.category || "unspecified"}
What's included (from the seller): ${d.description || "not given"}
Pricing:
${tierLines}
Booking: ${contactLine}

Return a JSON object only (no prose, no markdown fences) with these exact keys:
{
  "seoTitle": "under 200 characters, sentence case, says what the service is and who it's for",
  "description": "exactly three short paragraphs separated by \\n\\n. First paragraph opens with the most useful thing about this service. Second covers what's included and roughly how long it takes. Third covers why this provider's version is worth choosing — based only on facts given.",
  "bullets": [exactly 5 bullets under 120 chars each, each a concrete fact about what's included, covered, or how it runs],
  "tags": [exactly 15 search tags, single or two-word, lowercase],
  "instagram": "Instagram caption with a strong specific first line, 2-4 short lines",
  "instagramHashtags": [exactly 10 hashtags including the # symbol],
  "whatsapp": "WhatsApp broadcast message under 300 characters with 1-2 emojis, specific not generic",
  "ctaLine": "one short booking call-to-action sentence using exactly this booking method: ${contactLine}"
}`;

  const raw = await geminiGenerateText({
    systemInstruction: sys,
    parts: [{ text: userPrompt }],
    responseMimeType: "application/json",
    temperature: 0.8,
    maxOutputTokens: 3072,
  });
  const parsed = parseJsonLoose<unknown>(raw) ?? {};
  const r = ServiceCopySchema.safeParse(parsed);
  if (!r.success) throw new Error("Listing text didn't come through cleanly. Try again.");
  const copy = r.data;
  if (!copy.ctaLine.trim()) copy.ctaLine = fallbackCta(d.contact, opts.name);
  return copy;
}

export function normalizeServiceDetails(input: {
  category?: string | null;
  description?: string | null;
  flatPrice?: string | null;
  tiers?: Array<{ name?: string; price?: string; inclusions?: string[] }> | null;
  contact?: { method?: string; value?: string } | null;
  hadPhoto: boolean;
}): ServiceDetails {
  const method = (["phone", "whatsapp", "message"].includes(String(input.contact?.method))
    ? input.contact!.method
    : "message") as ServiceDetails["contact"]["method"];
  return {
    category: sanitizeServiceText(input.category, 80),
    description: sanitizeServiceText(input.description, 600),
    flatPrice: (input.flatPrice ?? "").toString().replace(/[^\d.]/g, "").slice(0, 12) || null,
    tiers: (input.tiers ?? [])
      .slice(0, 3)
      .map((t) => ({
        name: sanitizeServiceText(t.name, 40),
        price: String(t.price ?? "").replace(/[^\d.]/g, "").slice(0, 12),
        inclusions: (t.inclusions ?? []).slice(0, 3).map((i) => sanitizeServiceText(i, 120)).filter(Boolean),
      }))
      .filter((t) => t.name || t.price),
    contact: { method, value: sanitizeServiceText(input.contact?.value, 40) },
    hadPhoto: input.hadPhoto,
  };
}

export const SERVICE_IMAGE_MODEL = GEMINI_IMAGE_MODEL;
