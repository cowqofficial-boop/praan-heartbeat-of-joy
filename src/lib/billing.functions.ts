import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getPlan } from "./plans";

export type MyCredits = {
  plan_id: string;
  plan_name: string;
  subscription_credits: number;
  pack_credits: number;
  total: number;
  period_start: string | null;
  period_end: string | null;
  razorpay_subscription_id: string | null;
  features: {
    library: boolean;
    calendar: boolean;
    brand_kit: boolean;
    watermark: boolean;
    priority: boolean;
  };
};

type AdminClient = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

async function ensureCreditsRow(supabase: AdminClient, userId: string) {
  const { data } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data;
  const { data: inserted } = await supabase
    .from("user_credits")
    .insert({ user_id: userId })
    .select("*")
    .single();
  return inserted!;
}

export const getMyCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyCredits> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const row = await ensureCreditsRow(supabaseAdmin, context.userId);
    const plan = getPlan(row.plan_id);
    return {
      plan_id: row.plan_id,
      plan_name: plan.name,
      subscription_credits: row.subscription_credits,
      pack_credits: row.pack_credits,
      total: (row.subscription_credits ?? 0) + (row.pack_credits ?? 0),
      period_start: row.period_start,
      period_end: row.period_end,
      razorpay_subscription_id: row.razorpay_subscription_id,
      features: plan.features,
    };
  });

export type PaymentRow = {
  id: string;
  plan_id: string;
  plan_name: string;
  amount_inr: number;
  credits_granted: number;
  status: string;
  invoice_url: string | null;
  created_at: string;
};

export const getMyPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PaymentRow[]> => {
    const { data, error } = await context.supabase
      .from("payments")
      .select("id, plan_id, amount_inr, credits_granted, status, invoice_url, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({ ...r, plan_name: getPlan(r.plan_id).name }));
  });

// ---------- Checkout ----------

export type CheckoutParams = {
  kind: "order" | "subscription";
  key_id: string;
  amount_paise: number;
  currency: "INR";
  name: string;
  description: string;
  order_id?: string;          // for one-time packs
  subscription_id?: string;   // for subscriptions
  prefill_email?: string | null;
  notes: Record<string, string>;
};

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { plan_id: string }) => d)
  .handler(async ({ context, data }): Promise<CheckoutParams> => {
    const plan = getPlan(data.plan_id);
    if (plan.kind === "free") throw new Error("Free plan doesn't need checkout.");

    const rz = await import("./razorpay.server");
    const key_id = rz.publicKeyId();
    const amount_paise = plan.priceInr * 100;

    // Get user email for prefill
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const email = userRes?.user?.email ?? null;

    if (plan.kind === "pack") {
      const receipt = `pack_${plan.id}_${Date.now().toString(36)}`;
      const order = await rz.createRzOrder(amount_paise, receipt, {
        user_id: context.userId,
        plan_id: plan.id,
      });

      // Record pending payment
      await supabaseAdmin.from("payments").insert({
        user_id: context.userId,
        plan_id: plan.id,
        razorpay_order_id: order.id,
        amount_inr: plan.priceInr,
        credits_granted: plan.credits,
        status: "created",
      });

      return {
        kind: "order",
        key_id,
        amount_paise,
        currency: "INR",
        name: "CowQ",
        description: `${plan.name} — ${plan.credits} product credits`,
        order_id: order.id,
        prefill_email: email,
        notes: { user_id: context.userId, plan_id: plan.id },
      };
    }

    // Subscription
    const rzPlanId = await rz.createOrGetRzPlan({
      ourPlanId: plan.id,
      name: `${plan.name} (${plan.interval})`,
      amount_paise,
      period: plan.interval === "year" ? "yearly" : "monthly",
    });
    // 10 year cap so it doesn't auto-cancel; user can cancel anytime.
    const total_count = plan.interval === "year" ? 10 : 120;
    const sub = await rz.createRzSubscription({
      razorpay_plan_id: rzPlanId,
      total_count,
      notes: { user_id: context.userId, plan_id: plan.id },
    });

    await supabaseAdmin.from("payments").insert({
      user_id: context.userId,
      plan_id: plan.id,
      razorpay_subscription_id: sub.id,
      amount_inr: plan.priceInr,
      credits_granted: plan.credits,
      status: "created",
    });

    return {
      kind: "subscription",
      key_id,
      amount_paise,
      currency: "INR",
      name: "CowQ",
      description: `${plan.name} — ${plan.credits} products / ${plan.interval}`,
      subscription_id: sub.id,
      prefill_email: email,
      notes: { user_id: context.userId, plan_id: plan.id },
    };
  });

export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("user_credits")
      .select("razorpay_subscription_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!row?.razorpay_subscription_id) throw new Error("No active subscription.");
    const rz = await import("./razorpay.server");
    await rz.cancelRzSubscription(row.razorpay_subscription_id, true);
    return { ok: true };
  });

// ---------- GST details ----------

export type GstDetails = {
  gstin: string | null;
  invoice_business_name: string | null;
  invoice_address: string | null;
  invoice_state_code: string | null;
};

export const getMyGstDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GstDetails> => {
    const { data } = await context.supabase
      .from("profiles")
      .select("gstin, invoice_business_name, invoice_address, invoice_state_code")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      gstin: data?.gstin ?? null,
      invoice_business_name: data?.invoice_business_name ?? null,
      invoice_address: data?.invoice_address ?? null,
      invoice_state_code: data?.invoice_state_code ?? null,
    };
  });

export const saveMyGstDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { gstin?: string; invoice_business_name?: string; invoice_address?: string }) => d)
  .handler(async ({ context, data }): Promise<GstDetails> => {
    const gstin = (data.gstin ?? "").trim().toUpperCase().slice(0, 20) || null;
    const stateCode = gstin && /^\d{2}/.test(gstin) ? gstin.slice(0, 2) : null;
    const payload = {
      user_id: context.userId,
      gstin,
      invoice_business_name: (data.invoice_business_name ?? "").trim().slice(0, 200) || null,
      invoice_address: (data.invoice_address ?? "").trim().slice(0, 600) || null,
      invoice_state_code: stateCode,
    };
    const { data: row, error } = await context.supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select("gstin, invoice_business_name, invoice_address, invoice_state_code")
      .single();
    if (error) throw new Error(error.message);
    return row as GstDetails;
  });

// ---------- Invoices ----------

export type InvoiceRow = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  plan_id: string;
  plan_name: string;
  buyer_name: string | null;
  buyer_gstin: string | null;
  buyer_address: string | null;
  buyer_state_code: string | null;
  total_paise: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  is_gst_invoice: boolean;
};

const INVOICE_COLS =
  "id, invoice_no, invoice_date, plan_id, plan_name, buyer_name, buyer_gstin, buyer_address, buyer_state_code, total_paise, taxable_paise, cgst_paise, sgst_paise, igst_paise, is_gst_invoice";

export const getMyInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InvoiceRow[]> => {
    const { data, error } = await context.supabase
      .from("invoices")
      .select(INVOICE_COLS)
      .eq("user_id", context.userId)
      .order("invoice_date", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as InvoiceRow[];
  });

export const getMyInvoice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }): Promise<InvoiceRow | null> => {
    const { data: row, error } = await context.supabase
      .from("invoices")
      .select(INVOICE_COLS)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as InvoiceRow) ?? null;
  });
