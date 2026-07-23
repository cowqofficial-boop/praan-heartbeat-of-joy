import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, ExternalLink, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { showAlert, showConfirm } from "@/components/Dialogs";

import { supabase } from "@/integrations/supabase/client";
import { cancelMySubscription, getMyCredits, getMyPayments } from "@/lib/billing.functions";
import { formatInr, getPlan } from "@/lib/plans";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — CowQ" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", search: { mode: "signin", next: "/billing" }, replace: true });
      } else {
        setReady(true);
      }
    });
  }, [navigate]);

  const { data: credits } = useQuery({
    queryKey: ["my-credits"],
    queryFn: () => getMyCredits(),
    enabled: ready,
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["my-payments"],
    queryFn: () => getMyPayments(),
    enabled: ready,
  });

  const cancel = useMutation({
    mutationFn: () => cancelMySubscription(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-credits"] });
      showAlert({ title: "Subscription cancelled", body: "Your subscription will end at the end of the current cycle." });
    },
    onError: (e) => showAlert({ title: "Couldn't cancel subscription", body: e instanceof Error ? e.message : String(e) }),
  });

  if (!ready || !credits) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[15px] text-muted">Loading…</p>
      </div>
    );
  }

  const usedThisMonth = payments
    .filter((p) => p.status === "paid" && new Date(p.created_at).getMonth() === new Date().getMonth())
    .reduce((sum, p) => sum + p.credits_granted, 0);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[720px] flex-col px-5 pb-16 pt-8">
      <Link to="/library" className="grid h-10 w-10 -ml-2 place-items-center text-muted hover:text-ink lg:hidden" aria-label="Back">
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <PageHeader
        icon={Wallet}
        title="Plan and credits"
        subtitle="What you're on, what you've used, and what's left."
        help={
          <>
            <p className="font-semibold text-ink">How credits work</p>
            <p className="mt-1 text-muted">Credits are spent when CowQ makes something. A full product costs 90. Monthly credits reset on your billing date; credits you buy separately never expire.</p>
          </>
        }
        action={{
          label: credits.plan_id === "free" ? "Upgrade" : "Buy credits",
          to: "/pricing",
        }}
      />

      {/* Current plan */}
      <section className="mt-4 rounded-[16px] bg-raised p-5">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Current plan</p>
            <p className="mt-1 font-display text-[26px] text-ink">{credits.plan_name}</p>
          </div>
          <div className="text-right">
            <p className="text-[12px] uppercase tracking-wide text-muted">{credits.period_end ? "Renews" : "Credits never expire"}</p>
            <p className="mt-0.5 text-[14px] font-medium text-ink">
              {credits.period_end ? new Date(credits.period_end).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
            </p>
          </div>
        </div>
        <CreditBar credits={credits} />
        {credits.pack_credits > 0 && (
          <p className="mt-3 text-[12px] text-muted">
            Includes {credits.pack_credits} pack credit{credits.pack_credits === 1 ? "" : "s"} that never expire.
          </p>
        )}
        <div className="mt-5 flex gap-2">
          <Link
            to="/pricing"
            className="flex h-11 flex-1 items-center justify-center rounded-[12px] text-[14px] font-semibold"
            style={{ background: "#3D5AFE", color: "#F5F7FF" }}
          >
            {credits.plan_id === "free" ? "Upgrade" : "Change plan / top up"}
          </Link>
          {credits.razorpay_subscription_id && (
            <button
              type="button"
              onClick={async () => { if (await showConfirm({ title: "Cancel your subscription?", body: "It will remain active until the end of the current cycle.", confirmLabel: "Cancel plan", destructive: true })) cancel.mutate(); }}
              disabled={cancel.isPending}
              className="h-11 rounded-[12px] px-4 text-[14px] font-medium text-ink disabled:opacity-60"
            >
              Cancel
            </button>
          )}
        </div>
      </section>

      {/* Usage */}
      <section className="mt-4 rounded-[16px] bg-raised p-5">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">This month</p>
        <p className="mt-1 text-[14px] text-ink">
          Purchased <span className="font-semibold">{usedThisMonth}</span> credits since{" "}
          {new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.
        </p>
      </section>

      {/* Invoices */}
      <section className="mt-4">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Invoice history</p>
        {payments.length === 0 ? (
          <p className="mt-3 text-[14px] text-muted">No invoices yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-[12px] bg-raised p-3"
              >
                <div>
                  <p className="text-[14px] font-medium text-ink">{p.plan_name}</p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                    <span className={p.status === "paid" ? "text-green" : p.status === "failed" ? "text-primary" : "text-muted"}>
                      {p.status}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-ink">{formatInr(p.amount_inr)}</span>
                  {p.invoice_url && (
                    <a
                      href={p.invoice_url}
                      target="_blank"
                      rel="noreferrer"
                      className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-ink"
                      aria-label="Download invoice"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-center text-[12px] text-muted">
        <a href="/library?tour=1" className="underline">
          Take the tour again
        </a>
        <span className="mx-2">·</span>
        Need a receipt or GST invoice?{" "}
        <a href="mailto:hello@cowq.app" className="underline">
          Email us <ExternalLink className="inline h-3 w-3" />
        </a>
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-surface p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 font-display text-[20px] text-ink">{value}</p>
    </div>
  );
}

function CreditBar({ credits }: { credits: { plan_id: string; total: number; pack_credits: number } }) {
  const plan = getPlan(credits.plan_id);
  const monthlyQuota = plan.credits > 0 ? plan.credits : 300;
  const subscriptionLeft = Math.max(0, credits.total - credits.pack_credits);
  const used = Math.max(0, Math.min(monthlyQuota, monthlyQuota - subscriptionLeft));
  const pct = Math.round((used / monthlyQuota) * 100);
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-muted">Used this cycle</span>
        <span className="font-mono tabular-nums text-ink">
          <span className="font-semibold">{used.toLocaleString("en-IN")}</span>
          <span className="text-muted"> / {monthlyQuota.toLocaleString("en-IN")}</span>
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surface)" }}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: "#3D5AFE" }} />
      </div>
      <p className="mt-2 text-[12px] text-muted">
        <span className="font-mono tabular-nums text-ink">{credits.total.toLocaleString("en-IN")}</span> credits left · about {Math.floor(credits.total / 90)} products.
      </p>
    </div>
  );
}
