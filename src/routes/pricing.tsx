import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createCheckout, getMyCredits } from "@/lib/billing.functions";
import { creditPacks, estimateProducts, formatInr, subscriptionPairs, type Plan } from "@/lib/plans";
import { PageHeader } from "@/components/PageHeader";
import { BackButton } from "@/components/BackButton";



export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — CowQ" },
      { name: "description", content: "Simple pricing for Indian sellers: pay per product or subscribe monthly. Two months free on yearly plans." },
      { property: "og:title", content: "Pricing — CowQ" },
      { property: "og:description", content: "Pay per product or subscribe. 2 months free on yearly." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PricingPage,
});

type Cycle = "yearly" | "monthly";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  order_id?: string;
  subscription_id?: string;
  prefill?: { email?: string | null };
  notes?: Record<string, string>;
  theme?: { color: string };
  handler?: (r: unknown) => void;
  modal?: { ondismiss?: () => void };
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function PricingPage() {
  const navigate = useNavigate();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  const { data: credits } = useQuery({
    queryKey: ["my-credits"],
    queryFn: () => getMyCredits(),
    enabled: signedIn === true,
  });

  const checkout = useMutation({
    mutationFn: (planId: string) => createCheckout({ data: { plan_id: planId } }),
  });

  async function buy(plan: Plan) {
    setErr(null);
    if (signedIn === false) {
      navigate({ to: "/auth", search: { mode: "signup", next: "/pricing" } });
      return;
    }
    setBuying(plan.id);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Couldn't load payment window. Check your connection.");
      const params = await checkout.mutateAsync(plan.id);
      const rz = new window.Razorpay!({
        key: params.key_id,
        amount: params.amount_paise,
        currency: params.currency,
        name: params.name,
        description: params.description,
        order_id: params.order_id,
        subscription_id: params.subscription_id,
        prefill: { email: params.prefill_email ?? undefined },
        notes: params.notes,
        theme: { color: "#3D5AFE" },
        handler: () => {
          // Payment captured — webhook grants credits. Send to billing.
          navigate({ to: "/billing" });
        },
        modal: { ondismiss: () => setBuying(null) },
      });
      rz.open();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("not configured")) {
        setErr("Payments aren't switched on yet. The seller needs to add Razorpay keys.");
      } else {
        setErr(msg);
      }
      setBuying(null);
    }
  }

  const subs = subscriptionPairs();
  const packs = creditPacks();

  return (
    <main className="flex min-h-screen flex-col px-5 pb-16 pt-8 lg:px-0 lg:pt-12">
      <div className="flex items-center gap-2">
        <BackButton fallback="/library" />
      </div>

      <PageHeader
        icon={Sparkles}
        title="Plans"
        subtitle="Start free. Upgrade when you're making more than a few products a month."
        help={
          <>
            <p className="font-semibold text-ink">How credits work</p>
            <p className="mt-1 text-muted">One product uses about 90 credits. Plans reset monthly; top-ups never expire. If a generation fails, its credits come straight back to your balance.</p>
          </>
        }
      />




      {credits && (
        <p className="mt-2 text-center text-[13px] text-muted">
          You're on <span className="font-semibold text-ink">{credits.plan_name}</span> — {credits.total.toLocaleString("en-IN")} credits left, about {estimateProducts(credits.total)} products.
        </p>
      )}

      {/* Cycle toggle — sliding pill (equal-width buttons so the pill aligns) */}
      <div className="mt-6 flex flex-col items-center">
        <div
          className="relative inline-flex w-[280px] rounded-full bg-raised p-1"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
        >
          <span
            aria-hidden
            className="absolute top-1 bottom-1 rounded-full bg-primary transition-transform duration-300"
            style={{
              width: "calc(50% - 4px)",
              left: 4,
              transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
              transform: cycle === "yearly" ? "translateX(100%)" : "translateX(0%)",
            }}
          />
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={`relative z-10 flex-1 h-9 rounded-full text-[13px] font-semibold ${cycle === "monthly" ? "text-primary-foreground" : "text-muted"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={`relative z-10 flex-1 h-9 rounded-full text-[13px] font-semibold ${cycle === "yearly" ? "text-primary-foreground" : "text-muted"}`}
          >
            Yearly
          </button>
        </div>
        <p
          className={`mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${cycle === "yearly" ? "text-ink" : "invisible"}`}
          style={cycle === "yearly" ? { color: "var(--page-accent)" } : undefined}
          aria-hidden={cycle !== "yearly"}
        >
          2 months free
        </p>
      </div>


      {/* Subscriptions */}
      <section className="mt-6 grid grid-cols-1 gap-4 stagger lg:grid-cols-3 lg:items-start lg:gap-6">
        {subs.map(({ name, monthly, yearly }) => {
          const plan = cycle === "yearly" ? yearly : monthly;
          const busy = buying === plan.id;
          const isCurrent = credits?.plan_id === plan.id;
          const includedFrom = name === "Growth" ? "Starter" : name === "Pro" ? "Growth" : null;
          return (
            <div key={name} className="stagger-item">
              <PlanCard
                plan={plan}
                includedFrom={includedFrom}
                monthlyEquivalent={cycle === "yearly" ? Math.round(yearly.priceInr / 12) : null}
                busy={busy}
                current={isCurrent}
                onBuy={() => buy(plan)}
                highlight={name === "Growth"}
              />
            </div>
          );
        })}
      </section>


      {/* Packs */}
      <section id="topups" className="mt-10 scroll-mt-6">
        <h2 className="font-display text-[20px] leading-tight text-ink">Top up any time</h2>
        <p className="mt-1 text-[13px] text-muted">Works on any plan. Credits never expire.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
          {packs.map((p) => (
            <PackCard key={p.id} plan={p} busy={buying === p.id} onBuy={() => buy(p)} />
          ))}
        </div>
      </section>


      {err && <p className="mt-6 text-center text-[14px] text-primary">{err}</p>}

      <p className="mt-10 text-center text-[12px] text-muted">
        Secure payments by Razorpay. UPI, cards, netbanking, wallets.
      </p>
    </main>
  );
}

function PlanCard({
  plan,
  includedFrom,
  monthlyEquivalent,
  busy,
  current,
  onBuy,
  highlight,
}: {
  plan: Plan;
  includedFrom: "Starter" | "Growth" | null;
  monthlyEquivalent: number | null;
  busy: boolean;
  current: boolean;
  onBuy: () => void;
  highlight?: boolean;
}) {
  const isYearly = plan.interval === "year";
  const yearlyCredits = plan.credits * 12;
  const creditLine = isYearly
    ? `${yearlyCredits.toLocaleString("en-IN")} credits a year · ${plan.credits.toLocaleString("en-IN")} a month`
    : `${plan.credits.toLocaleString("en-IN")} credits a month`;
  const creditFeature = {
    label: creditLine,
    plain: `About ${estimateProducts(plan.credits)} full products a month.`,
  };
  // Starter lists everything; higher plans only list what they add.
  const baseFeatures: Array<{ label: string; plain: string }> = includedFrom
    ? [creditFeature]
    : [
        creditFeature,
        { label: "Library of all your products", plain: "Every product you make, saved forever." },
        { label: "Stock management", plain: "Track what you have and what it's worth." },
        { label: "Brand kit memory", plain: "Business name, tone, colours, and model settings saved." },
        { label: "Manual posting", plain: "One tap to share — you approve every post." },
        { label: "No watermark", plain: "Photos are clean, ready to sell." },
      ];
  const plusFeatures: Array<{ label: string; plain: string }> = plan.name === "Growth"
    ? [
        plan.features.calendar
          ? { label: "Full 30-day content calendar", plain: "A month of posts, planned for you." }
          : { label: "Content calendar — Growth or Pro", plain: "Upgrade to unlock the posting calendar." },
        plan.features.auto_post
          ? { label: "Automatic posting — Instagram & Facebook", plain: "More platforms from September." }
          : { label: "Manual posting", plain: "One tap to share — you approve every post." },
        { label: "More monthly product capacity", plain: "Built for sellers posting several products every week." },
      ]
    : plan.name === "Pro"
      ? [
          { label: "Priority generation", plain: "Your photos jump the queue." },
          { label: "Bulk upload", plain: "Make batches faster when you have a catalogue to clear." },
          { label: "Multiple brand workflows", plain: "Keep different shop lines organised." },
        ]
      : [];

  return (
    <div
      className={`card-feature relative flex h-full min-h-[620px] flex-col p-5 ${
        highlight ? "sm:scale-[1.02]" : ""
      }`}
      style={
        highlight
          ? {
              boxShadow:
                "inset 0 0 0 1px var(--cobalt), 0 4px 24px color-mix(in oklab, var(--page-accent) 18%, transparent), var(--shadow-raised)",
            }
          : undefined
      }
    >

      {highlight && (
        <span className="absolute -top-2.5 left-5 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-foreground">
          Most popular
        </span>
      )}
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-[24px] text-ink">{plan.name}</h3>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-semibold leading-none text-ink tabular-nums">{formatInr(plan.priceInr)}</span>
        <span className="text-[13px] text-muted">/{plan.interval === "year" ? "year" : "month"}</span>
      </div>
      {monthlyEquivalent != null ? (
        <p className="mt-1 text-[12px] text-muted">≈ {formatInr(monthlyEquivalent)}/mo, billed yearly</p>
      ) : (
        <p className="mt-1 text-[12px] text-muted invisible" aria-hidden>&nbsp;</p>
      )}
      <ul className="mt-4 space-y-3">
        {baseFeatures.map((f) => (
          <FeatureLine key={f.label} feature={f} icon="check" />
        ))}
      </ul>
      {includedFrom && (
        <>
          <div className="my-4 h-px bg-[color:var(--line)]" />
          <div
            className="rounded-[12px] p-3"
            style={{
              background: "color-mix(in srgb, var(--page-accent) 12%, transparent)",
              boxShadow: "inset 0 0 0 1px color-mix(in srgb, var(--page-accent) 30%, transparent)",
            }}
          >
            <p className="flex items-center gap-2 text-[15px] font-semibold leading-snug text-ink">
              <ArrowRight className="h-[18px] w-[18px] shrink-0" style={{ color: "var(--page-accent)" }} />
              Everything in {includedFrom}, plus:
            </p>
          </div>
          <ul className="mt-4 space-y-3">
            {plusFeatures.map((f) => (
              <FeatureLine key={f.label} feature={f} icon="arrow" />
            ))}
          </ul>
        </>
      )}

      <button
        type="button"
        onClick={onBuy}
        disabled={busy || current}
        className={`mt-auto flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[15px] font-semibold ${
          current
            ? "bg-raised text-muted"
            : "btn-accent disabled:opacity-60"
        }`}
      >
        {current ? "Current plan" : busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening…</> : "Choose " + plan.name}
      </button>
    </div>
  );
}

function FeatureLine({
  feature,
  icon,
}: {
  feature: { label: string; plain: string };
  icon: "check" | "arrow";
}) {
  const Icon = icon === "check" ? Check : ArrowRight;
  return (
    <li className="flex items-start gap-2 text-[14px]">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--page-accent)" }} />
      <div>
        <p className="text-ink">{feature.label}</p>
        <p className="mt-0.5 text-[12px] text-muted">{feature.plain}</p>
      </div>
    </li>
  );
}


function PackCard({ plan, busy, onBuy }: { plan: Plan; busy: boolean; onBuy: () => void }) {
  return (
    <div className="card-list flex items-center justify-between p-4">

      <div>
        <p className="text-[15px] font-semibold text-ink">{plan.name}</p>
        <p className="mt-0.5 text-[12px] text-muted">One-time · credits never expire</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-[20px] font-semibold leading-none text-ink tabular-nums">{formatInr(plan.priceInr)}</p>
        <button
          type="button"
          onClick={onBuy}
          disabled={busy}
          className="mt-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-full btn-accent px-4 text-[13px] font-semibold disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Buy
        </button>
      </div>
    </div>
  );
}

