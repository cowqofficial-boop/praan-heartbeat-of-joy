// Server-only engine behind modular editing.
//
// Components are materialised from the generation the seller already has, so
// nothing is duplicated: the generation stays the single source of truth and
// every component write is mirrored straight back into it. That keeps the
// library, shop, CSV, calendar and video pipelines working untouched.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  defFor,
  TEXT_COMPONENTS,
  type ComponentContent,
  type ComponentShape,
} from "./components";
import { geminiGenerateText } from "./gemini.server";
import {
  b64ToBytes,
  fetchAsBase64,
  generateOneImage,
  getBrandModelContext,
  KIDSWEAR_STYLES,
  personStyles,
  PRODUCT_STYLES,
  uploadBytes,
  type StyleDef,
} from "./image-gen.server";

type SB = SupabaseClient<Database>;

export type GenRow = {
  id: string;
  user_id: string | null;
  kind: string;
  product_name: string | null;
  category: string | null;
  price: number | null;
  detail: string | null;
  original_image_url: string | null;
  copy: Record<string, unknown> | null;
  generated_images: { kind: string; ratio: string; url: string }[] | null;
  browser_id: string;
};

export async function loadOwnedGeneration(sb: SB, id: string, userId: string): Promise<GenRow> {
  const { data, error } = await sb
    .from("generations")
    .select("id, user_id, kind, product_name, category, price, detail, original_image_url, copy, generated_images, browser_id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("That item was not found.");
  return data as unknown as GenRow;
}

/** The full set of components this generation should have, read off its stored copy and photos. */
export function deriveComponents(row: GenRow): { type: string; key: string | null; content: ComponentContent }[] {
  const copy = (row.copy ?? {}) as Record<string, unknown>;
  const out: { type: string; key: string | null; content: ComponentContent }[] = [];

  for (const def of TEXT_COMPONENTS) {
    const raw = copy[def.copyField as string];
    if (def.shape === "list") {
      const items = Array.isArray(raw) ? raw.map((v) => String(v)) : [];
      if (items.length === 0) continue;
      out.push({ type: def.type, key: null, content: { items } });
    } else {
      const text = typeof raw === "string" ? raw : "";
      if (!text.trim()) continue;
      out.push({ type: def.type, key: null, content: { text } });
    }
  }

  const seen = new Set<string>();
  for (const img of row.generated_images ?? []) {
    if (!img?.kind || seen.has(img.kind)) continue;
    seen.add(img.kind);
    const ratios = (row.generated_images ?? []).filter((i) => i.kind === img.kind).map((i) => i.ratio);
    out.push({ type: "image", key: img.kind, content: { url: img.url, kind: img.kind, ratios } });
  }
  return out;
}

/**
 * Makes sure a row exists for every derived component, and refreshes rows that
 * have drifted behind the generation (e.g. edited elsewhere in the app).
 */
export async function syncComponents(sb: SB, row: GenRow, userId: string) {
  const derived = deriveComponents(row);
  const { data: existing, error } = await sb
    .from("generation_components")
    .select("id, component_type, component_key, content, updated_by, updated_at, credits_spent_total")
    .eq("generation_id", row.id);
  if (error) throw new Error(error.message);

  const key = (t: string, k: string | null) => `${t}::${k ?? ""}`;
  const have = new Map((existing ?? []).map((e) => [key(e.component_type, e.component_key), e]));

  const toInsert = derived
    .filter((d) => !have.has(key(d.type, d.key)))
    .map((d) => ({
      generation_id: row.id,
      user_id: userId,
      component_type: d.type,
      component_key: d.key,
      content: d.content as never,
      updated_by: "ai",
    }));
  if (toInsert.length > 0) {
    const { error: insErr } = await sb.from("generation_components").insert(toInsert);
    if (insErr) throw new Error(insErr.message);
  }
  return derived;
}

// ---------- Mirroring back into the parent generation ----------

export async function mirrorToGeneration(
  sb: SB,
  row: GenRow,
  componentType: string,
  componentKey: string | null,
  content: ComponentContent,
) {
  if (componentType === "image") {
    const url = content.url;
    if (!url || !componentKey) return;
    const images = (row.generated_images ?? []).map((i) => (i.kind === componentKey ? { ...i, url } : i));
    const { error } = await sb.from("generations").update({ generated_images: images as never }).eq("id", row.id);
    if (error) throw new Error(error.message);
    row.generated_images = images;
    return;
  }
  const def = defFor(componentType);
  if (!def.copyField) return;
  const value = def.shape === "list" ? (content.items ?? []) : (content.text ?? "");
  const copy = { ...((row.copy ?? {}) as Record<string, unknown>), [def.copyField]: value };
  const { error } = await sb.from("generations").update({ copy: copy as never }).eq("id", row.id);
  if (error) throw new Error(error.message);
  row.copy = copy;
}

/** Stores the version that is being replaced, so nothing is ever lost. */
export async function pushVersion(
  sb: SB,
  componentId: string,
  userId: string,
  content: ComponentContent,
  source: "ai" | "seller",
  creditsSpent = 0,
) {
  await sb.from("generation_component_versions").insert({
    component_id: componentId,
    user_id: userId,
    content: content as never,
    source,
    credits_spent: creditsSpent,
  });
}

// ---------- Safety ----------

/**
 * The same rules a full generation runs under. Applied to every partial
 * rewrite too — a smaller job never gets a looser standard.
 */
export const COPY_GUARDRAILS = `Hard rules, no exceptions:
- Only use facts that are already present in the product information or the existing text. Never invent a material, a size, a certification, a guarantee, a discount or a delivery promise.
- Never write or imply a customer review, testimonial, rating, or "as seen on" claim.
- Never claim a price, offer or stock level that was not given to you.
- Never make medical, health, safety or legal claims.
- Never copy a brand slogan, trademark or another shop's wording.
- Never mention children, and never describe a person's body.
- Sentence case. No ALL CAPS. No emoji spam.
- Banned phrases in any form: "on the go", "elevate", "adds a pop", "perfect for every", "take your X anywhere", "grab yours today", "unleash", "curated", "lifestyle".
- Open with the most useful thing. Never restate the obvious. Every sentence earns its place.`;

const ACTION_INSTRUCTION: Record<string, string> = {
  rewrite: "Write a fresh version. Same facts, better writing.",
  shorten: "Cut this down. Keep every fact, remove every spare word.",
  expand: "Add useful detail that is already implied by the product information. Do not invent new facts.",
  premium: "Rewrite in a premium, understated, confident voice. No exclamation marks.",
  persuasive: "Rewrite so the reason to buy is sharper and more specific. No invented claims, no urgency tricks.",
  friendly: "Rewrite warmer and plain-speaking, like a shopkeeper talking to a regular customer.",
  grammar: "Fix grammar, spelling and punctuation only. Keep the wording and meaning as close to the original as possible.",
  local: "Rewrite the hashtags around what Indian buyers actually search for, including city and regional tags where they fit.",
  seasonal: "Rewrite the hashtags around the current Indian season or nearest festival.",
  minimal: "Return only five strong hashtags instead of ten.",
};

const IMAGE_ACTION_INSTRUCTION: Record<string, string> = {
  regenerate: "",
  angle: "Photograph the same product in the same kind of setting but from a clearly different camera angle to the previous shot.",
  lighting: "Keep the same setting and composition, but change the light — a different time of day and a different direction of natural light.",
  background: "Keep the product exactly as it is, but place it on a different ordinary real surface or setting that still suits it.",
};

/** Cleans a seller's free-text instruction before it reaches the model. */
export async function safeInstruction(input?: string | null): Promise<string> {
  if (!input) return "";
  const { sanitizeCustomLook } = await import("./brand-kit.functions");
  return sanitizeCustomLook(input) ?? "";
}

// ---------- Text regeneration ----------

export async function regenerateTextComponent(opts: {
  row: GenRow;
  componentType: string;
  shape: ComponentShape;
  current: ComponentContent;
  action: string;
  instruction: string;
  userId: string;
}): Promise<ComponentContent> {
  const { row, componentType, shape, current, action, instruction, userId } = opts;
  const def = defFor(componentType);
  const { loadBrandMemoryContext } = await import("./brand-memory.server");
  const voice = (await loadBrandMemoryContext(userId)).voice;

  const copy = (row.copy ?? {}) as Record<string, unknown>;
  const context = [
    `Product or service: ${row.product_name ?? "unnamed"}`,
    row.category ? `Category: ${row.category}` : "",
    row.price ? `Price: ₹${row.price}` : "",
    row.detail ? `Seller's note: ${row.detail}` : "",
    typeof copy.description === "string" ? `Existing description: ${String(copy.description).slice(0, 800)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const shapeRule =
    shape === "list"
      ? componentType === "hashtags"
        ? 'Return JSON: {"items": ["#tag", ...]} — 10 hashtags unless told otherwise, each starting with #.'
        : `Return JSON: {"items": ["…", ...]} — keep roughly the same number of items as the current version, each under 120 characters.`
      : 'Return JSON: {"text": "…"} — plain text only, no markdown.';

  const sys = `You are a plain-speaking Indian shopkeeper who writes product and service copy for small sellers.
You are rewriting ONE part of an existing listing: the ${def.label.toLowerCase()}. Everything else stays as it is — do not write the other parts.

${voice ? voice + "\n" : ""}
${COPY_GUARDRAILS}

${shapeRule}`;

  const user = `${context}

Current ${def.label.toLowerCase()}:
${shape === "list" ? (current.items ?? []).join("\n") : (current.text ?? "")}

Task: ${ACTION_INSTRUCTION[action] ?? ACTION_INSTRUCTION.rewrite}${instruction ? `\nSeller's extra instruction: ${instruction}` : ""}`;

  const { parseJsonLoose } = await import("./gemini.server");
  const raw = await geminiGenerateText({
    systemInstruction: sys,
    parts: [{ text: user }],
    responseMimeType: "application/json",
    temperature: 0.8,
    maxOutputTokens: 2048,
  });
  const parsed = parseJsonLoose<{ text?: unknown; items?: unknown }>(raw);
  if (shape === "list") {
    const items = Array.isArray(parsed?.items) ? parsed!.items.map((v) => String(v)).filter(Boolean) : [];
    if (items.length === 0) throw new Error("That rewrite didn't come through cleanly. Try again.");
    return { items: items.slice(0, 30) };
  }
  const text = typeof parsed?.text === "string" ? parsed.text.trim() : "";
  if (!text) throw new Error("That rewrite didn't come through cleanly. Try again.");
  return { text };
}

// ---------- Image regeneration ----------

function styleFor(kind: string, modelLine: string, binding: string): StyleDef {
  const pools: StyleDef[][] = [
    kind.startsWith("onmodel") ? personStyles(modelLine, binding, false) : [],
    PRODUCT_STYLES,
    KIDSWEAR_STYLES,
    personStyles(modelLine, binding, false),
  ];
  for (const pool of pools) {
    const found = pool.find((s) => s.kind === kind);
    if (found) return found;
  }
  return PRODUCT_STYLES[0];
}

export async function regenerateImageComponent(opts: {
  row: GenRow;
  imageKind: string;
  action: string;
  instruction: string;
  userId: string;
}): Promise<ComponentContent> {
  const { row, imageKind, action, instruction, userId } = opts;
  const originals = [row.original_image_url].filter(Boolean) as string[];
  if (originals.length === 0) throw new Error("The original photo for this item is no longer available.");

  const productRefs = await Promise.all(originals.slice(0, 5).map((u) => fetchAsBase64(u)));
  const { modelLine, brandModelRefs, brandModelBinding, occasionScene } = await getBrandModelContext(userId, null);
  const memoryCtx = await (await import("./brand-memory.server")).loadBrandMemoryContext(userId);
  const style = styleFor(imageKind, modelLine, brandModelBinding);

  const contextLine = `Product: ${row.product_name ?? "product"}. Category: ${row.category ?? "general"}.${
    occasionScene ? " " + occasionScene : ""
  }${memoryCtx.photo ? " " + memoryCtx.photo : ""}`;
  const variation =
    action === "regenerate"
      ? "This is a re-shoot of the same shot — vary the composition slightly so it does not look identical to the previous attempt."
      : (IMAGE_ACTION_INSTRUCTION[action] ?? "");
  const extra = instruction ? ` Seller's request: ${instruction}.` : "";

  const refs = style.hasPerson && brandModelRefs.length > 0 ? [...productRefs, ...brandModelRefs] : productRefs;
  const b64 = await generateOneImage(
    refs,
    `${contextLine} ${style.prompt} ${variation}${extra}`,
    2048,
    !!style.hasPerson,
  );
  const bytes = b64ToBytes(b64);
  const path = `generated/${row.browser_id}/${Date.now()}-${imageKind}-redo.png`;
  const url = await uploadBytes(path, bytes, "image/png");
  const ratios = (row.generated_images ?? []).filter((i) => i.kind === imageKind).map((i) => i.ratio);
  return { url, kind: imageKind, ratios };
}
