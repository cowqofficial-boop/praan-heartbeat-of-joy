// Client-safe vocabulary for public seller shops. No server imports here.

/**
 * Public shops are advertised on the brand domain. Change this one constant
 * when the domain moves — every copy/share/canonical URL follows.
 */
export const SHOP_BASE_URL = "https://cowq.app";

export const RESERVED_SLUGS = new Set([
  "shop", "api", "auth", "admin", "create", "library", "stock", "calendar", "billing",
  "pricing", "profile", "connect", "confirm", "results", "invoice", "blog", "brand-kit",
  "how-it-works", "generating", "sitemap", "robots", "about", "support", "help", "cowq",
  "www", "app", "static", "assets", "public", "lovable",
]);

export function shopUrl(slug: string): string {
  return `${SHOP_BASE_URL}/shop/${slug}`;
}

/** Turns a business name into a clean, predictable slug. */
export function slugify(input: string): string {
  return String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function slugError(slug: string): string | null {
  if (!slug) return "Pick a shop address.";
  if (slug.length < 3) return "Use at least 3 characters.";
  if (slug.length > 40) return "Keep it under 40 characters.";
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug))
    return "Use lowercase letters, numbers and hyphens only.";
  if (RESERVED_SLUGS.has(slug)) return "That address is taken by CowQ. Try another.";
  return null;
}

export type ShopContactMethod = "whatsapp" | "phone" | "sms" | "email";

export const SHOP_CONTACT_METHODS: Array<{
  id: ShopContactMethod;
  label: string;
  cta: string;
  placeholder: string;
}> = [
  { id: "whatsapp", label: "WhatsApp", cta: "Contact on WhatsApp", placeholder: "+91 98765 43210" },
  { id: "phone", label: "Phone call", cta: "Call seller", placeholder: "+91 98765 43210" },
  { id: "sms", label: "SMS", cta: "Send a message", placeholder: "+91 98765 43210" },
  { id: "email", label: "Email", cta: "Email seller", placeholder: "you@yourshop.in" },
];

export function contactCta(method: string): string {
  return SHOP_CONTACT_METHODS.find((m) => m.id === method)?.cta ?? "Contact seller";
}

/** Builds the tap target for the seller's chosen contact method. Never invents a value. */
export function contactHref(
  method: string,
  value: string,
  context?: { shopName?: string; itemName?: string },
): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "").replace(/^\+?/, "");
  const subject = context?.itemName
    ? `Hi${context.shopName ? ` ${context.shopName}` : ""}, I'm interested in "${context.itemName}".`
    : `Hi${context.shopName ? ` ${context.shopName}` : ""}, I found your shop on CowQ.`;

  switch (method) {
    case "whatsapp":
      return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(subject)}` : null;
    case "phone":
      return digits ? `tel:+${digits}` : null;
    case "sms":
      return digits ? `sms:+${digits}?&body=${encodeURIComponent(subject)}` : null;
    case "email":
      return /.+@.+\..+/.test(raw)
        ? `mailto:${raw}?subject=${encodeURIComponent(subject)}`
        : null;
    default:
      return null;
  }
}

export const SHOP_SOCIALS = [
  { key: "social_instagram", label: "Instagram", prefix: "https://instagram.com/" },
  { key: "social_facebook", label: "Facebook", prefix: "https://facebook.com/" },
  { key: "social_linkedin", label: "LinkedIn", prefix: "https://linkedin.com/in/" },
  { key: "social_x", label: "X", prefix: "https://x.com/" },
  { key: "social_youtube", label: "YouTube", prefix: "https://youtube.com/@" },
  { key: "social_website", label: "Website", prefix: "https://" },
] as const;

export type ShopSocialKey = (typeof SHOP_SOCIALS)[number]["key"];

/** Only http(s) links are ever rendered — anything else is dropped silently. */
export function safeExternalUrl(value?: string | null): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function formatRupees(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

// ---------- Public shapes shared by the server fn and the page ----------

export type PublicShop = {
  slug: string;
  shop_name: string;
  bio: string;
  category: string;
  city: string;
  region: string;
  country: string;
  logo_url: string | null;
  contact_method: string;
  contact_value: string;
  joined: string | null;
  socials: Array<{ key: string; label: string; url: string }>;
};

export type PublicListing = {
  id: string;
  kind: "product" | "service";
  name: string;
  price: number | null;
  detail: string;
  category: string;
  image: string | null;
  tiers: Array<{ name: string; price: string; inclusions: string[] }>;
  cta: string | null;
};
