/**
 * Persistent AI brand memory.
 *
 * One structured profile per seller that every AI generation reads, so the
 * seller never has to re-explain who they are. Pure data + prompt builders —
 * safe to import from client and server alike.
 */

export type BrandIdentity = {
  what_we_sell: string;
  who_we_serve: string;
  what_makes_us_different: string;
  promise: string;
  city: string;
};

export type BrandVoice = {
  tone: string;
  formality: string;
  energy: string;
  language_mix: string;
  emoji: string;
  sentence_length: string;
};

export type BrandComms = {
  greeting: string;
  sign_off: string;
  cta_style: string;
  price_style: string;
  favourite_words: string;
  banned_words: string;
};

export type BrandPhotos = {
  look: string;
  surface: string;
  mood: string;
  props: string;
  avoid: string;
};

export type BrandMemory = {
  identity: BrandIdentity;
  voice: BrandVoice;
  comms: BrandComms;
  photos: BrandPhotos;
};

export const DEFAULT_BRAND_MEMORY: BrandMemory = {
  identity: { what_we_sell: "", who_we_serve: "", what_makes_us_different: "", promise: "", city: "" },
  voice: {
    tone: "friendly",
    formality: "relaxed",
    energy: "steady",
    language_mix: "english",
    emoji: "rare",
    sentence_length: "short",
  },
  comms: {
    greeting: "",
    sign_off: "",
    cta_style: "soft",
    price_style: "show",
    favourite_words: "",
    banned_words: "",
  },
  photos: { look: "mixed", surface: "", mood: "daylight", props: "minimal", avoid: "" },
};

/** Options are plain-language on purpose — sellers read these, not prompt engineers. */
export const TONE_OPTIONS: [string, string][] = [
  ["friendly", "Friendly — like talking across the counter"],
  ["premium", "Premium — restrained and confident"],
  ["value", "Value — practical, price and durability first"],
  ["traditional", "Traditional — warm and respectful"],
  ["playful", "Playful — light and a bit cheeky"],
];

export const FORMALITY_OPTIONS: [string, string][] = [
  ["relaxed", "Relaxed — everyday spoken words"],
  ["neutral", "Neutral — plain and businesslike"],
  ["formal", "Formal — polite and careful"],
];

export const ENERGY_OPTIONS: [string, string][] = [
  ["calm", "Calm — quiet and measured"],
  ["steady", "Steady — clear, no hype"],
  ["lively", "Lively — upbeat, festive"],
];

export const LANGUAGE_OPTIONS: [string, string][] = [
  ["english", "English only"],
  ["hinglish", "Hinglish — English with common Hindi words"],
  ["hindi_words", "English, but keep Indian product words as they are"],
];

export const EMOJI_OPTIONS: [string, string][] = [
  ["none", "None"],
  ["rare", "Rare — one at most"],
  ["some", "Some — a few, where they help"],
  ["lots", "Lots — festive and lively"],
];

export const SENTENCE_OPTIONS: [string, string][] = [
  ["short", "Short — one line at a time"],
  ["medium", "Medium — normal sentences"],
  ["long", "Long — fuller explanations"],
];

export const CTA_OPTIONS: [string, string][] = [
  ["soft", "Soft — invite, don't push"],
  ["direct", "Direct — ask for the order"],
  ["urgent", "Urgent — limited stock, offer ends"],
  ["none", "No call to action"],
];

export const PRICE_OPTIONS: [string, string][] = [
  ["show", "Always mention the price"],
  ["hide", "Never mention the price"],
  ["dm", "Say 'message for price'"],
];

export const LOOK_OPTIONS: [string, string][] = [
  ["mixed", "A mix — let CowQ choose"],
  ["lifestyle", "Lifestyle — in a real home or workplace"],
  ["studio", "Studio — plain surface, quiet background"],
  ["white", "White background — marketplace ready"],
  ["flatlay", "Flat lay — shot from above"],
];

export const MOOD_OPTIONS: [string, string][] = [
  ["daylight", "Morning daylight"],
  ["warm", "Warm evening light"],
  ["bright", "Bright and airy"],
  ["moody", "Low and moody"],
];

export const PROP_OPTIONS: [string, string][] = [
  ["none", "Nothing else in the frame"],
  ["minimal", "One or two everyday things"],
  ["styled", "A styled little scene"],
];

/** Merge stored jsonb over defaults so missing keys never crash a prompt. */
export function mergeBrandMemory(raw: unknown): BrandMemory {
  const o = (raw ?? {}) as Partial<BrandMemory>;
  return {
    identity: { ...DEFAULT_BRAND_MEMORY.identity, ...(o.identity ?? {}) },
    voice: { ...DEFAULT_BRAND_MEMORY.voice, ...(o.voice ?? {}) },
    comms: { ...DEFAULT_BRAND_MEMORY.comms, ...(o.comms ?? {}) },
    photos: { ...DEFAULT_BRAND_MEMORY.photos, ...(o.photos ?? {}) },
  };
}

function line(label: string, value: string): string {
  const v = (value || "").trim();
  return v ? `${label}: ${v}.` : "";
}

function pick(options: [string, string][], key: string): string {
  return options.find(([k]) => k === key)?.[1] ?? "";
}

/**
 * Everything the writing models need to sound like this seller.
 * Returns "" when the seller has told us nothing yet.
 */
export function buildVoicePrompt(m: BrandMemory): string {
  const parts: string[] = [];

  const id = [
    line("Sells", m.identity.what_we_sell),
    line("Writes for", m.identity.who_we_serve),
    line("What makes this shop different", m.identity.what_makes_us_different),
    line("Promise to the buyer", m.identity.promise),
    line("Based in", m.identity.city),
  ].filter(Boolean);
  if (id.length) parts.push(`Brand memory — this seller's fixed identity:\n${id.join("\n")}`);

  const voice = [
    `Tone: ${pick(TONE_OPTIONS, m.voice.tone) || "friendly"}.`,
    `Formality: ${pick(FORMALITY_OPTIONS, m.voice.formality)}.`,
    `Energy: ${pick(ENERGY_OPTIONS, m.voice.energy)}.`,
    `Language: ${pick(LANGUAGE_OPTIONS, m.voice.language_mix)}.`,
    `Emoji: ${pick(EMOJI_OPTIONS, m.voice.emoji)}.`,
    `Sentence length: ${pick(SENTENCE_OPTIONS, m.voice.sentence_length)}.`,
  ];
  parts.push(`Voice rules (follow exactly):\n${voice.join("\n")}`);

  const comms = [
    line("Open messages with", m.comms.greeting),
    line("Sign off with", m.comms.sign_off),
    `Call to action: ${pick(CTA_OPTIONS, m.comms.cta_style)}.`,
    `Price handling: ${pick(PRICE_OPTIONS, m.comms.price_style)}.`,
    line("Words this seller likes using", m.comms.favourite_words),
    m.comms.banned_words.trim()
      ? `Never use these words or phrases, in any form: ${m.comms.banned_words.trim()}.`
      : "",
  ].filter(Boolean);
  if (comms.length) parts.push(`How this shop talks:\n${comms.join("\n")}`);

  return parts.join("\n\n");
}

/** Photography defaults, appended to every image prompt. */
export function buildPhotoPrompt(m: BrandMemory): string {
  const bits: string[] = [];
  if (m.photos.look && m.photos.look !== "mixed") {
    bits.push(`This seller prefers ${pick(LOOK_OPTIONS, m.photos.look).toLowerCase()} — lean that way where the shot allows.`);
  }
  if (m.photos.surface.trim()) bits.push(`Preferred surface or setting: ${m.photos.surface.trim()}.`);
  if (m.photos.mood) bits.push(`Preferred light: ${pick(MOOD_OPTIONS, m.photos.mood).toLowerCase()}.`);
  if (m.photos.props) bits.push(`Props: ${pick(PROP_OPTIONS, m.photos.props).toLowerCase()}.`);
  if (m.photos.avoid.trim()) bits.push(`Never include: ${m.photos.avoid.trim()}.`);
  return bits.join(" ");
}

/** True once the seller has given us anything worth remembering. */
export function hasBrandMemory(m: BrandMemory): boolean {
  return Boolean(
    m.identity.what_we_sell.trim() ||
      m.identity.who_we_serve.trim() ||
      m.identity.what_makes_us_different.trim() ||
      m.identity.promise.trim() ||
      m.comms.banned_words.trim() ||
      m.comms.favourite_words.trim() ||
      m.photos.surface.trim(),
  );
}

export type BrandSignalType = "edited" | "regenerated" | "copied" | "posted" | "deleted";
export type BrandSignalSurface =
  | "listing"
  | "instagram"
  | "whatsapp"
  | "festival"
  | "photo"
  | "calendar"
  | "service";
