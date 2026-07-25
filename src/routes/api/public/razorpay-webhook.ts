import { createFileRoute } from "@tanstack/react-router";
import { getPlan } from "@/lib/plans";

// Razorpay webhook: grants credits after payments / subscription charges.
// Configure this URL in the Razorpay dashboard:
//   https://<your-domain>/api/public/razorpay-webhook
// Events to subscribe to:
//   payment.captured
//   subscription.charged
//   subscription.cancelled

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const raw = await request.text();
        const signature = request.headers.get("x-razorpay-signature") ?? "";
        const { verifyWebhookSignature } = await import("@/lib/razorpay.server");
        const ok = await verifyWebhookSignature(raw, signature);
        if (!ok) return new Response("Invalid signature", { status: 401 });

        let payload: {
          event: string;
          payload: {
            payment?: { entity: RzPaymentEntity };
            subscription?: { entity: RzSubEntity };
            invoice?: { entity: { id: string; short_url?: string } };
          };
        };
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Bad body", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        try {
          switch (payload.event) {
            case "payment.captured":
              await handlePaymentCaptured(payload, supabaseAdmin);
              break;
            case "subscription.charged":
              await handleSubscriptionCharged(payload, supabaseAdmin);
              break;
            case "subscription.cancelled":
              await handleSubscriptionCancelled(payload, supabaseAdmin);
              break;
            default:
              break;
          }
        } catch (e) {
          console.error("Razorpay webhook error:", e);
          return new Response("Handler failed", { status: 500 });
        }

        return new Response("ok");
      },
    },
  },
});

type RzPaymentEntity = {
  id: string;
  order_id?: string | null;
  amount: number;
  status: string;
  invoice_id?: string | null;
  notes?: { user_id?: string; plan_id?: string } | null;
};

type RzSubEntity = {
  id: string;
  status: string;
  current_start?: number | null;
  current_end?: number | null;
  notes?: { user_id?: string; plan_id?: string } | null;
};

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

async function handlePaymentCaptured(
  payload: { payload: { payment?: { entity: RzPaymentEntity } } },
  sb: Admin,
) {
  const p = payload.payload.payment?.entity;
  if (!p) return;
  const notes = p.notes ?? {};
  const userId = notes.user_id;
  const planId = notes.plan_id;
  if (!userId || !planId) return;

  const plan = getPlan(planId);
  // Only one-time packs come through payment.captured (subscription charges arrive via subscription.charged).
  if (plan.kind !== "pack") return;

  // Grant pack credits.
  const { data: row } = await sb
    .from("user_credits")
    .select("pack_credits")
    .eq("user_id", userId)
    .maybeSingle();
  const current = row?.pack_credits ?? 0;
  await sb.from("user_credits").upsert(
    {
      user_id: userId,
      pack_credits: current + plan.credits,
    },
    { onConflict: "user_id" },
  );

  await sb
    .from("payments")
    .update({
      razorpay_payment_id: p.id,
      status: "paid",
      razorpay_invoice_id: p.invoice_id ?? null,
    })
    .eq("razorpay_order_id", p.order_id ?? "")
    .eq("user_id", userId);
}

async function handleSubscriptionCharged(
  payload: {
    payload: {
      subscription?: { entity: RzSubEntity };
      payment?: { entity: RzPaymentEntity };
      invoice?: { entity: { id: string; short_url?: string } };
    };
  },
  sb: Admin,
) {
  const sub = payload.payload.subscription?.entity;
  const pay = payload.payload.payment?.entity;
  const inv = payload.payload.invoice?.entity;
  if (!sub) return;
  const notes = sub.notes ?? {};
  const userId = notes.user_id;
  const planId = notes.plan_id;
  if (!userId || !planId) return;
  const plan = getPlan(planId);

  const period_start = sub.current_start ? new Date(sub.current_start * 1000).toISOString() : null;
  const period_end = sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null;

  // Reset subscription credits to plan allowance; keep any remaining pack credits.
  await sb.from("user_credits").upsert(
    {
      user_id: userId,
      plan_id: plan.id,
      subscription_credits: plan.credits,
      period_start,
      period_end,
      razorpay_subscription_id: sub.id,
    },
    { onConflict: "user_id" },
  );

  // Record invoice
  await sb.from("payments").insert({
    user_id: userId,
    plan_id: plan.id,
    razorpay_subscription_id: sub.id,
    razorpay_payment_id: pay?.id ?? null,
    razorpay_invoice_id: inv?.id ?? null,
    invoice_url: inv?.short_url ?? null,
    amount_inr: pay ? Math.round(pay.amount / 100) : plan.priceInr,
    credits_granted: plan.credits,
    status: "paid",
  });
}

async function handleSubscriptionCancelled(
  payload: { payload: { subscription?: { entity: RzSubEntity } } },
  sb: Admin,
) {
  const sub = payload.payload.subscription?.entity;
  if (!sub) return;
  const userId = sub.notes?.user_id;
  if (!userId) return;
  // Revert to free plan; keep any remaining credits until period end.
  await sb
    .from("user_credits")
    .update({ plan_id: "free", razorpay_subscription_id: null })
    .eq("user_id", userId);
}
