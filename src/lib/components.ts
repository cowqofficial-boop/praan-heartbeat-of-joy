// Modular content model.
//
// Every generated product or service is a set of small, independently
// editable pieces — a title, a description, each photo — instead of one
// take-it-or-leave-it blob. This file is the shared, client-safe registry:
// what pieces exist, what they're called, what you can do to each, and what
// each AI action costs.

import { COSTS } from "./plans";

export type ComponentShape = "text" | "list" | "image";

/** The stored body of one component. Only one shape is ever filled in. */
export type ComponentContent = {
  text?: string;
  items?: string[];
  url?: string;
  kind?: string;
  ratios?: string[];
};

export type ComponentAction = {
  id: string;
  label: string;
  /** What the seller should expect, shown in the confirm sheet. */
  outcome: string;
};

export type ComponentDef = {
  type: string;
  label: string;
  shape: ComponentShape;
  /** Where this piece lives inside the generation's stored copy. */
  copyField?: string;
  hint: string;
  actions: ComponentAction[];
  cost: number;
};

const TEXT_ACTIONS: ComponentAction[] = [
  { id: "rewrite", label: "Rewrite", outcome: "A fresh version in your brand voice." },
  { id: "shorten", label: "Shorten", outcome: "Same meaning, fewer words." },
  { id: "expand", label: "Expand", outcome: "More detail, still specific." },
  { id: "premium", label: "Make premium", outcome: "Understated, confident, no exclamation marks." },
  { id: "persuasive", label: "Make persuasive", outcome: "Sharper reasons to buy — no invented claims." },
  { id: "friendly", label: "Make friendly", outcome: "Warmer, plain-speaking." },
  { id: "grammar", label: "Fix grammar", outcome: "Same words, cleaned up." },
];

const HASHTAG_ACTIONS: ComponentAction[] = [
  { id: "rewrite", label: "New hashtags", outcome: "A fresh set for this product." },
  { id: "local", label: "Local", outcome: "Hashtags Indian buyers actually search." },
  { id: "seasonal", label: "Seasonal", outcome: "Tied to the current season or festival." },
  { id: "minimal", label: "Minimal", outcome: "Five strong hashtags instead of ten." },
];

const IMAGE_ACTIONS: ComponentAction[] = [
  { id: "regenerate", label: "Redo this photo", outcome: "A new take of this one shot. Other photos stay." },
  { id: "angle", label: "Change angle", outcome: "Same setting, a different camera angle." },
  { id: "lighting", label: "Change lighting", outcome: "Same shot, different light." },
  { id: "background", label: "Change background", outcome: "Same product, a different surface or setting." },
];

export const TEXT_COMPONENTS: ComponentDef[] = [
  {
    type: "title",
    label: "Title",
    shape: "text",
    copyField: "seoTitle",
    hint: "The line buyers see first on Amazon and Flipkart.",
    actions: TEXT_ACTIONS,
    cost: COSTS.rewrite_component,
  },
  {
    type: "description",
    label: "Description",
    shape: "text",
    copyField: "description",
    hint: "Three short paragraphs for the listing page.",
    actions: TEXT_ACTIONS,
    cost: COSTS.rewrite_component,
  },
  {
    type: "bullets",
    label: "Features",
    shape: "list",
    copyField: "bullets",
    hint: "Five bullets, each with a concrete fact.",
    actions: TEXT_ACTIONS,
    cost: COSTS.rewrite_component,
  },
  {
    type: "keywords",
    label: "Search keywords",
    shape: "list",
    copyField: "tags",
    hint: "Search tags for marketplaces and your website catalog.",
    actions: TEXT_ACTIONS,
    cost: COSTS.rewrite_component,
  },
  {
    type: "instagram",
    label: "Instagram caption",
    shape: "text",
    copyField: "instagram",
    hint: "The caption, without hashtags.",
    actions: TEXT_ACTIONS,
    cost: COSTS.rewrite_component,
  },
  {
    type: "hashtags",
    label: "Hashtags",
    shape: "list",
    copyField: "instagramHashtags",
    hint: "Kept separate so new hashtags never touch your caption.",
    actions: HASHTAG_ACTIONS,
    cost: COSTS.regen_hashtags,
  },
  {
    type: "whatsapp",
    label: "WhatsApp message",
    shape: "text",
    copyField: "whatsapp",
    hint: "Short broadcast message for your customer groups.",
    actions: TEXT_ACTIONS,
    cost: COSTS.rewrite_component,
  },
  {
    type: "festival",
    label: "Festival line",
    shape: "text",
    copyField: "festival",
    hint: "One offer or festival line you can drop anywhere.",
    actions: TEXT_ACTIONS,
    cost: COSTS.rewrite_component,
  },
  {
    type: "cta",
    label: "Call to action",
    shape: "text",
    copyField: "cta",
    hint: "The button line — Shop now, Book today, Message us.",
    actions: TEXT_ACTIONS,
    cost: COSTS.rewrite_component,
  },
  {
    type: "meta_description",
    label: "Meta description",
    shape: "text",
    copyField: "metaDescription",
    hint: "Under 160 characters, for Google and your website.",
    actions: TEXT_ACTIONS,
    cost: COSTS.rewrite_component,
  },
  {
    type: "alt_text",
    label: "Photo alt text",
    shape: "text",
    copyField: "altText",
    hint: "Describes the photo for screen readers and search.",
    actions: TEXT_ACTIONS,
    cost: COSTS.rewrite_component,
  },
];

export const IMAGE_COMPONENT: ComponentDef = {
  type: "image",
  label: "Photo",
  shape: "image",
  hint: "Redo just this shot — the others are left exactly as they are.",
  actions: IMAGE_ACTIONS,
  cost: COSTS.regen_image,
};

export function defFor(type: string): ComponentDef {
  if (type === "image") return IMAGE_COMPONENT;
  const found = TEXT_COMPONENTS.find((c) => c.type === type);
  if (!found) {
    // Unknown/future component types still render and still edit by hand.
    return {
      type,
      label: type.replace(/_/g, " "),
      shape: "text",
      hint: "",
      actions: TEXT_ACTIONS,
      cost: COSTS.rewrite_component,
    };
  }
  return found;
}

/** Friendly name for a photo, e.g. "White background". */
export const IMAGE_KIND_LABELS: Record<string, string> = {
  white: "White background",
  studio: "Studio surface",
  lifestyle: "In use at home",
  flatlay: "Flat lay",
  hanger: "On a hanger",
  ghost: "Ghost mannequin",
  onmodel_full: "On model — full",
  onmodel_detail: "On model — detail",
  poster: "Poster",
};

export type GenerationComponent = {
  id: string;
  generationId: string;
  type: string;
  key: string | null;
  content: ComponentContent;
  updatedBy: "ai" | "seller";
  updatedAt: string;
  creditsSpentTotal: number;
  versionCount: number;
};

export type ComponentVersion = {
  id: string;
  content: ComponentContent;
  source: "ai" | "seller";
  creditsSpent: number;
  createdAt: string;
};

/** Turns stored content into the text a seller edits in a box. */
export function contentToText(content: ComponentContent, shape: ComponentShape): string {
  if (shape === "list") return (content.items ?? []).join("\n");
  return content.text ?? "";
}

/** Turns edited text back into stored content. */
export function textToContent(text: string, shape: ComponentShape): ComponentContent {
  if (shape === "list") {
    return {
      items: text
        .split("\n")
        .map((l) => l.replace(/^\s*[•\-*]\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 40),
    };
  }
  return { text: text.trim() };
}

/** One-line preview for a collapsed card. */
export function previewOf(content: ComponentContent, shape: ComponentShape): string {
  if (shape === "image") return content.kind ? (IMAGE_KIND_LABELS[content.kind] ?? content.kind) : "Photo";
  const t = contentToText(content, shape);
  return t.split("\n").find((l) => l.trim()) ?? "";
}
