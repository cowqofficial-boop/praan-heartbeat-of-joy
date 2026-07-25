import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CreditCard, Gauge, Receipt, Sparkles } from "lucide-react";
import { getMyCredits, getMyPayments } from "@/lib/billing.functions";
import { getMyInsights } from "@/lib/profile.functions";
import { getPlan, formatInr, COSTS } from "@/lib/plans";
import { COBALT, MAGENTA, AMBER, creditColor } from "@/lib/page-accent";
import {
  GlassCard,
  SectionCard,
  Pill,
  CardSkeleton,
  StatTile,
  formatBytes,
} from "@/components/profile/primitives";

export const Route = createFileRoute("/_authenticated/profile/subscription")({
  head: () => ({
    meta: [
      { title: "Plan and usage — CowQ" },
      { name: "description", content: "Your plan, credits left, what you've used and every payment you've made." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SubscriptionTab,
});

function SubscriptionTab() {
  const creditsFn = useServerFn(getMyCredits);
  const paymentsFn = useServerFn(getMyPayments);
  const insightsFn = useServerFn(getMyInsights);

  const creditsQ = useQuery({ queryKey: ["credits"], queryFn: () => creditsFn({}) });
  const paymentsQ = useQuery({ queryKey: ["payments"], queryFn: () => paymentsFn({}) });
  const insightsQ = useQuery({ queryKey: ["profile", "insights"], queryFn: () => insightsFn({}) });

  if (creditsQ.isLoading || !creditsQ.data) return <div className="grid gap-4"><CardSkeleton rows={3} /><CardSkeleton rows={3} /></div>;

  const c = creditsQ.data;
  const plan = getPlan(c.plan_id);
  const total = c.subscription_credits + c.pack_credits;
  const tint = creditColor(total, plan.credits || undefined);
  const used = Math.max(0, plan.credits - c.subscription_credits);
  const ins = insightsQ.data;

  return (
    <div className="grid gap-4">
      <SectionCard
        index={0}
        icon={CreditCard}
        title={`${plan.name} plan`}
        description={
          plan.priceInr === 0
            ? "You're on the free plan. Credits refill only when you buy a pack or upgrade."
            : `${formatInr(plan.priceInr)} per ${plan.interval === "year" ? "year" : "month"}. Credits refill each period.`
        }
        aside={<Pill tint={tint}>{total.toLocaleString("en-IN")} credits left</Pill>}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="From your plan" value={c.subscription_credits.toLocaleString("en-IN")} tint={COBALT} sub={`of ${plan.credits.toLocaleString("en-IN")}`} />
          <StatTile label="From packs" value={c.pack_credits.toLocaleString("en-IN")} tint={MAGENTA} sub="Never expire" />
          <StatTile
            label="Used this period"
            value={used.toLocaleString("en-IN")}
            tint={AMBER}
            sub={c.period_end ? `Refills ${new Date(c.period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "No refill on free"}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/pricing" className="btn-accent inline-flex h-11 items-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold">
            <Sparkles className="h-4 w-4" /> {plan.priceInr === 0 ? "See plans" : "Change plan"}
          </Link>
          <Link
            to="/billing"
            className="inline-flex h-11 items-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold text-ink"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)" }}
          >
            Billing page <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        index={1}
        icon={Gauge}
        title="What you've used"
        description="Everything CowQ has made for you on this account."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile label="Products" value={(ins?.products ?? 0).toLocaleString("en-IN")} tint={COBALT} />
          <StatTile label="Photos" value={(ins?.photos ?? 0).toLocaleString("en-IN")} tint={MAGENTA} />
          <StatTile label="Calendar posts" value={(ins?.posts ?? 0).toLocaleString("en-IN")} tint={AMBER} />
          <StatTile label="Stock items" value={(ins?.stock_items ?? 0).toLocaleString("en-IN")} tint={COBALT} />
          <StatTile label="Saved models" value={(ins?.saved_models ?? 0).toLocaleString("en-IN")} tint={MAGENTA} />
          <StatTile label="Storage" value={formatBytes(ins?.storage_bytes ?? 0)} tint={AMBER} sub="Your photos" />
        </div>
        <div className="mt-4 rounded-[12px] p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)" }}>
          <p className="text-[12px] text-muted">
            A full product — photos, copy and CSV — costs{" "}
            <span className="font-mono" style={{ color: COBALT }}>{COSTS.product}</span> credits. A saved model costs{" "}
            <span className="font-mono" style={{ color: MAGENTA }}>{COSTS.brand_model}</span>.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        index={2}
        icon={Receipt}
        title="Payments"
        description="Every payment on this account, newest first."
      >
        {paymentsQ.isLoading ? (
          <CardSkeleton rows={2} />
        ) : (paymentsQ.data ?? []).length === 0 ? (
          <p className="text-[14px] text-muted">No payments yet — you're on the free plan.</p>
        ) : (
          <ul className="grid gap-2">
            {(paymentsQ.data ?? []).map((p) => (
              <li
                key={p.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)" }}
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] text-ink">{p.plan_name}</p>
                  <p className="text-[12px] text-muted">
                    {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                    {p.credits_granted.toLocaleString("en-IN")} credits
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-[14px] text-ink">{formatInr(p.amount_inr)}</span>
                  <Pill tint={p.status === "paid" ? COBALT : p.status === "failed" ? MAGENTA : AMBER}>{p.status}</Pill>
                  {p.invoice_url && (
                    <a
                      href={p.invoice_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] underline"
                      style={{ color: COBALT }}
                    >
                      Receipt
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <GlassCard tint={AMBER} hover={false} className="rise-in p-5">
        <p className="text-[13px] leading-relaxed text-muted">
          CowQ doesn't meter voice minutes, API calls or workflow runs — those aren't part of the product. You pay for
          credits, and credits make products. Nothing else is counted.
        </p>
      </GlassCard>
    </div>
  );
}
