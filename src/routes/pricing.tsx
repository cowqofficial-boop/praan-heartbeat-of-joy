import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createCheckout, getMyCredits } from "@/lib/billing.functions";
import { creditPacks, estimateProducts, formatInr, subscriptionPairs, type Plan } from "@/lib/plans";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — CowQ" },
      { name: "description", content: "Simple pricing for Indian sellers: pay per product or subscribe monthly. Two months free on annual plans." },
      { property: "og:title", content: "Pricing — CowQ" },
      { property: "og:description", content: "Pay per product or subscribe. 2 months free on annual." },
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
  const [cycle, setCycle] = useState<Cycle>("yearly");
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
        theme: { color: "#E0402F" },
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
      <header className="flex items-center justify-between">
        <Link
          to={signedIn ? "/library" : "/"}
          className="grid h-10 w-10 -ml-2 place-items-center text-muted hover:text-ink lg:hidden"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-[40px] leading-[1.02] text-ink sm:text-[56px]">Pricing</h1>
        <div className="h-10 w-10 lg:hidden" />
      </header>


      {credits && (
        <p className="mt-2 text-center text-[13px] text-muted">
          You're on <span className="font-semibold text-ink">{credits.plan_name}</span> — {credits.total.toLocaleString("en-IN")} credits left, about {estimateProducts(credits.total)} products.
        </p>
      )}

      {/* Cycle toggle — sliding pill */}
      <div className="mt-6 flex items-center justify-center">
        <div className="relative inline-flex rounded-full bg-raised p-1"
             style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
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
            className={`relative z-10 h-9 rounded-full px-4 text-[13px] font-semibold ${cycle === "monthly" ? "text-primary-foreground" : "text-muted"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={`relative z-10 h-9 rounded-full px-4 text-[13px] font-semibold ${cycle === "yearly" ? "text-primary-foreground" : "text-muted"}`}
          >
            Annual · 2 months free
          </button>
        </div>
      </div>

      {/* Subscriptions */}
      <section className="mt-6 grid grid-cols-1 gap-4 stagger lg:grid-cols-3 lg:items-start lg:gap-6">
        {subs.map(({ name, monthly, yearly }) => {
          const plan = cycle === "yearly" ? yearly : monthly;
          const busy = buying === plan.id;
          const isCurrent = credits?.plan_id === plan.id;
          return (
            <div key={name} className="stagger-item">
              <PlanCard
                plan={plan}
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
  monthlyEquivalent,
  busy,
  current,
  onBuy,
  highlight,
}: {
  plan: Plan;
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
    : `${plan.credits.toLocaleString("en-IN")} credits a month · about ${estimateProducts(plan.credits)} products`;
  const features = [
    creditLine,
    "Library of all your products",
    "Stock management",
    plan.features.calendar ? "Full 30-day content calendar" : "Content calendar — Growth or Pro",
    plan.features.auto_post ? "Automatic posting" : "Manual posting",
    plan.features.priority ? "Priority generation" : "Standard generation",
    "No watermark",
  ];
  return (
    <div
      className={`relative rounded-[16px] p-5 ${
        highlight ? "bg-raised sm:scale-[1.02]" : "bg-surface"
      }`}
      style={
        highlight
          ? {
              boxShadow:
                "inset 0 0 0 1px var(--sindoor), inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 60px rgba(0,0,0,0.55)",
            }
          : {
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.4)",
            }
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
      {monthlyEquivalent != null && (
        <p className="mt-1 text-[12px] text-muted">≈ {formatInr(monthlyEquivalent)}/mo, billed yearly</p>
      )}
      <ul className="mt-4 space-y-1.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[14px] text-ink">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-marigold" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onBuy}
        disabled={busy || current}
        className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[15px] font-semibold ${
          current
            ? "bg-raised text-muted"
            : highlight
              ? "bg-primary text-primary-foreground disabled:opacity-60"
              : "bg-raised text-ink hover:brightness-110 disabled:opacity-60"
        }`}
      >
        {current ? "Current plan" : busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening…</> : "Choose " + plan.name}
      </button>
    </div>
  );
}


function PackCard({ plan, busy, onBuy }: { plan: Plan; busy: boolean; onBuy: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-[16px] bg-surface p-4"
         style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.4)" }}>
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
          className="mt-2 inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Buy
        </button>
      </div>
    </div>
  );
}

