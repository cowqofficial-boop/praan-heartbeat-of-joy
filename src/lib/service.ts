// Shared, client-safe vocabulary for services. No server imports here.
import { COSTS } from "./plans";

export type ContentKind = "product" | "service";

export type ContactMethod = "phone" | "whatsapp" | "message";

export type ServiceTier = {
  name: string;
  price: string;
  inclusions: string[];
};

export type ServiceDetails = {
  category: string;
  description: string;
  flatPrice?: string | null;
  tiers: ServiceTier[];
  contact: { method: ContactMethod; value: string };
  hadPhoto: boolean;
  ctaLine?: string | null;
};

/** Suggestions only — services vary far too much for a fixed list. */
export const SERVICE_CATEGORY_SUGGESTIONS = [
  "Haircut & grooming",
  "Tailoring & alterations",
  "Repair & servicing",
  "Consulting",
  "Home visit",
  "Tuition & coaching",
  "Catering",
  "Photography",
  "Cleaning",
  "Mehendi & beauty",
  "Interior & carpentry",
  "Delivery & logistics",
];

export const CONTACT_METHODS: Array<{ id: ContactMethod; label: string; hint: string }> = [
  { id: "phone", label: "Call", hint: "Buyers call this number to book." },
  { id: "whatsapp", label: "WhatsApp", hint: "Buyers message this number on WhatsApp." },
  { id: "message", label: "Message to book", hint: "No number shown — buyers message you where they found the post." },
];

export const MAX_TIERS = 3;

/** Credit cost for a service generation. Photo path is cheaper — one edited poster. */
export function serviceCost(hasPhoto: boolean): number {
  return hasPhoto ? COSTS.service_photo : COSTS.service_no_photo;
}

export function serviceActionKey(hasPhoto: boolean): "service_photo" | "service_no_photo" {
  return hasPhoto ? "service_photo" : "service_no_photo";
}

export function contactLabel(method: ContactMethod): string {
  return CONTACT_METHODS.find((c) => c.id === method)?.label ?? method;
}

/** Fallback CTA if the model doesn't return one. */
export function fallbackCta(contact: { method: ContactMethod; value: string }, name: string): string {
  if (contact.method === "phone" && contact.value) return `Call ${contact.value} to book ${name.toLowerCase()}.`;
  if (contact.method === "whatsapp" && contact.value) return `WhatsApp ${contact.value} to book a slot.`;
  return "Message to book a slot.";
}

// ---------- Safety ----------
// Same shape as the brand-model sanitizer: strip anything that pushes the model
// toward nudity, minors, or a named real person's likeness.
const UNSAFE_TEXT =
  /\b(nude|nudity|naked|topless|undress|nsfw|porn|erotic|sexual|child|children|kid|kids|minor|underage|teen|teenage|baby|toddler|schoolgirl|schoolboy)\b/i;
const NAMED_PERSON =
  /\b(look like|looks like|resembl\w*|face of|lookalike|celebrity|celebrities|actress|actor|bollywood star|film star|famous)\b/i;

export function sanitizeServiceText(input?: string | null, max = 600): string {
  if (!input) return "";
  const s = String(input).replace(/\s+/g, " ").trim().slice(0, max);
  if (!s) return "";
  const clean = s
    .split(/(?<=[.;,])\s+/)
    .filter((p) => !UNSAFE_TEXT.test(p) && !NAMED_PERSON.test(p))
    .join(" ")
    .trim();
  return clean.slice(0, max);
}

/** Guardrails repeated into every service image prompt. */
export const SERVICE_IMAGE_GUARDRAILS = [
  "Never invent an 'after' or result the seller did not actually provide — no fabricated before/after comparison.",
  "Never show a customer, reviewer, testimonial, star rating, or any claim of a review.",
  "Never fabricate awards, certifications, guarantees, or numbers.",
  "No children anywhere in the image.",
  "Do not alter, beautify, or change the face, skin tone or body of any real person visible in the reference photo.",
  "No text claims beyond the service name and, if given, the price.",
].join(" ");
