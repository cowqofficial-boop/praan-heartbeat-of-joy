// Razorpay REST helpers. Server-only. Do not import from client bundles.

const BASE = "https://api.razorpay.com/v1";

function creds() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new Error("Razorpay is not configured yet.");
  return { key_id, key_secret };
}

function authHeader(): string {
  const { key_id, key_secret } = creds();
  return "Basic " + btoa(`${key_id}:${key_secret}`);
}

export function publicKeyId(): string {
  return creds().key_id;
}

async function rz<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Razorpay ${path} ${res.status}: ${text}`);
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

// ---------- Orders (one-time packs) ----------

export type RzOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string | null;
};

export function createRzOrder(amount_paise: number, receipt: string, notes: Record<string, string>) {
  return rz<RzOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: amount_paise,
      currency: "INR",
      receipt,
      notes,
    }),
  });
}

// ---------- Subscription plans ----------

export type RzPlan = {
  id: string;
  entity: "plan";
  interval: number;
  period: "monthly" | "yearly";
  item: { name: string; amount: number; currency: string };
};

export async function createOrGetRzPlan(params: {
  ourPlanId: string;
  name: string;
  amount_paise: number;
  period: "monthly" | "yearly";
}): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cached } = await supabaseAdmin
    .from("razorpay_plans")
    .select("razorpay_plan_id")
    .eq("plan_id", params.ourPlanId)
    .maybeSingle();
  if (cached?.razorpay_plan_id) return cached.razorpay_plan_id;

  const created = await rz<RzPlan>("/plans", {
    method: "POST",
    body: JSON.stringify({
      period: params.period,
      interval: 1,
      item: {
        name: `CowQ Ai ${params.name}`,
        amount: params.amount_paise,
        currency: "INR",
      },
    }),
  });

  await supabaseAdmin
    .from("razorpay_plans")
    .insert({ plan_id: params.ourPlanId, razorpay_plan_id: created.id });

  return created.id;
}

// ---------- Subscriptions ----------

export type RzSubscription = {
  id: string;
  entity: "subscription";
  plan_id: string;
  status: string;
  short_url?: string;
  current_start?: number | null;
  current_end?: number | null;
};

export function createRzSubscription(params: {
  razorpay_plan_id: string;
  total_count: number;
  notes: Record<string, string>;
}) {
  return rz<RzSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: params.razorpay_plan_id,
      total_count: params.total_count,
      customer_notify: 1,
      notes: params.notes,
    }),
  });
}

export function fetchRzSubscription(id: string) {
  return rz<RzSubscription>(`/subscriptions/${id}`);
}

export function cancelRzSubscription(id: string, at_cycle_end = true) {
  return rz<RzSubscription>(`/subscriptions/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancel_at_cycle_end: at_cycle_end ? 1 : 0 }),
  });
}

// ---------- Webhook signature ----------

export async function verifyWebhookSignature(rawBody: string, signature: string): Promise<boolean> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // constant-time compare
  if (hex.length !== signature.length) return false;
  let ok = 0;
  for (let i = 0; i < hex.length; i++) ok |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return ok === 0;
}
