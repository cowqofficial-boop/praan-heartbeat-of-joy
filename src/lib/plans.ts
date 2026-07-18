// Shared plan catalog — safe to import from browser or server.
// Mirrors the seed data in the billing migration; the source of truth is `public.plans`.

export type PlanKind = "free" | "subscription" | "pack";
export type Interval = "month" | "year";

export type Plan = {
  id: string;
  kind: PlanKind;
  name: string;
  credits: number;
  priceInr: number;
  interval: Interval | null;
  features: {
    library: boolean;
    calendar: boolean;
    brand_kit: boolean;
    watermark: boolean;
    priority: boolean;
  };
};

export const PLANS: Plan[] = [
  { id: "free",      kind: "free",         name: "Free",        credits: 3,   priceInr: 0,     interval: null,    features: { library: true, calendar: false, brand_kit: true, watermark: true,  priority: false } },
  { id: "starter_m", kind: "subscription", name: "Starter",     credits: 15,  priceInr: 999,   interval: "month", features: { library: true, calendar: false, brand_kit: true, watermark: false, priority: false } },
  { id: "starter_y", kind: "subscription", name: "Starter",     credits: 15,  priceInr: 9990,  interval: "year",  features: { library: true, calendar: false, brand_kit: true, watermark: false, priority: false } },
  { id: "growth_m",  kind: "subscription", name: "Growth",      credits: 50,  priceInr: 2999,  interval: "month", features: { library: true, calendar: true,  brand_kit: true, watermark: false, priority: false } },
  { id: "growth_y",  kind: "subscription", name: "Growth",      credits: 50,  priceInr: 29990, interval: "year",  features: { library: true, calendar: true,  brand_kit: true, watermark: false, priority: false } },
  { id: "pro_m",     kind: "subscription", name: "Pro",         credits: 150, priceInr: 6999,  interval: "month", features: { library: true, calendar: true,  brand_kit: true, watermark: false, priority: true } },
  { id: "pro_y",     kind: "subscription", name: "Pro",         credits: 150, priceInr: 69990, interval: "year",  features: { library: true, calendar: true,  brand_kit: true, watermark: false, priority: true } },
  { id: "pack_10",   kind: "pack",         name: "10 products", credits: 10,  priceInr: 799,   interval: null,    features: { library: true, calendar: false, brand_kit: true, watermark: false, priority: false } },
  { id: "pack_25",   kind: "pack",         name: "25 products", credits: 25,  priceInr: 1749,  interval: null,    features: { library: true, calendar: false, brand_kit: true, watermark: false, priority: false } },
  { id: "pack_60",   kind: "pack",         name: "60 products", credits: 60,  priceInr: 3499,  interval: null,    features: { library: true, calendar: false, brand_kit: true, watermark: false, priority: false } },
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
  return [getPlan("pack_10"), getPlan("pack_25"), getPlan("pack_60")];
}

export function formatInr(n: number): string {
  return "₹" + n.toLocaleString("en-IN");
}

export function planUnlocksCalendar(planId: string): boolean {
  return getPlan(planId).features.calendar;
}
