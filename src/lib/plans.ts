// Shared plan catalog — safe to import from browser or server.
// Mirrors the seed data in the billing migration; the source of truth is `public.plans`.

export type PlanKind = "free" | "subscription" | "pack";
export type Interval = "month" | "year";

export type PlanFeatures = {
  library: boolean;
  calendar: boolean;
  brand_kit: boolean;
  watermark: boolean;
  priority: boolean;
  stock: boolean;
  auto_post: boolean;
  bulk_upload: boolean;
  multi_brand: boolean;
};

export type Plan = {
  id: string;
  kind: PlanKind;
  name: string;
  credits: number;
  priceInr: number;
  interval: Interval | null;
  features: PlanFeatures;
};

const F = (o: Partial<PlanFeatures>): PlanFeatures => ({
  library: true,
  calendar: false,
  brand_kit: true,
  watermark: false,
  priority: false,
  stock: true,
  auto_post: false,
  bulk_upload: false,
  multi_brand: false,
  ...o,
});

export const PLANS: Plan[] = [
  { id: "free",      kind: "free",         name: "Free",           credits: 300,  priceInr: 0,     interval: null,    features: F({ calendar: false, watermark: true }) },
  { id: "starter_m", kind: "subscription", name: "Starter",        credits: 800,  priceInr: 999,   interval: "month", features: F({ calendar: false }) },
  { id: "starter_y", kind: "subscription", name: "Starter",        credits: 800,  priceInr: 9990,  interval: "year",  features: F({ calendar: false }) },
  { id: "growth_m",  kind: "subscription", name: "Growth",         credits: 2400, priceInr: 2999,  interval: "month", features: F({ calendar: true, auto_post: true }) },
  { id: "growth_y",  kind: "subscription", name: "Growth",         credits: 2400, priceInr: 29990, interval: "year",  features: F({ calendar: true, auto_post: true }) },
  { id: "pro_m",     kind: "subscription", name: "Pro",            credits: 5500, priceInr: 6999,  interval: "month", features: F({ calendar: true, auto_post: true, priority: true, bulk_upload: true, multi_brand: true }) },
  { id: "pro_y",     kind: "subscription", name: "Pro",            credits: 5500, priceInr: 69990, interval: "year",  features: F({ calendar: true, auto_post: true, priority: true, bulk_upload: true, multi_brand: true }) },
  { id: "pack_300",  kind: "pack",         name: "300 credits",    credits: 300,  priceInr: 599,   interval: null,    features: F({}) },
  { id: "pack_800",  kind: "pack",         name: "800 credits",    credits: 800,  priceInr: 1399,  interval: null,    features: F({}) },
  { id: "pack_2000", kind: "pack",         name: "2,000 credits",  credits: 2000, priceInr: 3199,  interval: null,    features: F({}) },
  { id: "pack_5000", kind: "pack",         name: "5,000 credits",  credits: 5000, priceInr: 7499,  interval: null,    features: F({}) },
];

export function getPlan(id: string): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

export function subscriptionPairs(): Array<{ name: string; monthly: Plan; yearly: Plan }> {
  return [
    { name: "Starter", monthly: getPlan("starter_m"), yearly: getPlan("starter_y") },
    { name: "Growth",  monthly: getPlan("growth_m"),  yearly: getPlan("growth_y")  },
    { name: "Pro",     monthly: getPlan("pro_m"),     yearly: getPlan("pro_y")     },
  ];
}

export function creditPacks(): Plan[] {
  return [getPlan("pack_300"), getPlan("pack_800"), getPlan("pack_2000"), getPlan("pack_5000")];
}

export function formatInr(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export function planUnlocksCalendar(planId: string): boolean {
  return getPlan(planId).features.calendar;
}

// ---------- Credit cost table ----------
// A single source of truth for what every action costs.
export const COSTS = {
  product: 90,                 // Complete product — all copy + 4 photos
  extra_marketplace_photo: 30, // High-res extra photo for marketplaces
  extra_social_photo: 10,      // Standard-res extra photo
  rewrite_copy: 5,             // Copy-only rewrite
  brand_model: 30,             // Create or change brand model
  calendar_post: 10,           // One calendar post
  calendar_month: 300,         // Full 30-day calendar
  auto_publish: 2,             // Publish one post automatically
} as const;

export type ActionKey = keyof typeof COSTS;

export function costOf(action: ActionKey): number {
  return COSTS[action];
}

// Rough conversion — how many "complete products" a monthly allowance buys.
export function estimateProducts(credits: number): number {
  return Math.floor(credits / COSTS.product);
}
