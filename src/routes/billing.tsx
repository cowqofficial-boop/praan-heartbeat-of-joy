import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, Download, ExternalLink, HardDrive, Plus, ReceiptText, Wallet } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { showAlert, showConfirm } from "@/components/Dialogs";

import { supabase } from "@/integrations/supabase/client";
import {
  cancelMySubscription,
  getMyCredits,
  getMyGstDetails,
  getMyInvoices,
  getMyPayments,
  saveMyGstDetails,
} from "@/lib/billing.functions";
import { creditPacks, formatInr, getPlan, planRetention, PLANS, type Plan } from "@/lib/plans";
import { looksLikeGstin, rupees } from "@/lib/invoice";
import { useRazorpayCheckout } from "@/lib/use-razorpay-checkout";

export const Route = createFileRoute("/billing")({
  head: () => ({
    meta: [
      { title: "Billing — CowQ" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: BillingPage,
});

const RANK: Record<string, number> = { Free: 0, Starter: 1, Growth: 2, Pro: 3 };

const PLAN_DIFF: Record<string, string> = {
  Starter: "800 credits a month, no watermark.",
  Growth: "2,400 credits, content calendar and auto-posting.",
  Pro: "5,500 credits, priority runs, bulk upload and 10 saved models.",
};

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

  const { data: credits } = useQuery({ queryKey: ["my-credits"], queryFn: () => getMyCredits(), enabled: ready });
  const { data: payments = [] } = useQuery({ queryKey: ["my-payments"], queryFn: () => getMyPayments(), enabled: ready });
  const { data: invoices = [] } = useQuery({ queryKey: ["my-invoices"], queryFn: () => getMyInvoices(), enabled: ready });

  const { buy, buying, error: buyError } = useRazorpayCheckout({ signedIn: ready, next: "/billing" });

  const cancel = useMutation({
    mutationFn: () => cancelMySubscription(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-credits"] });
      showAlert({ title: "Subscription cancelled", body: "Your subscription will end at the end of the current cycle." });
    },
    onError: (e) => showAlert({ title: "Couldn't cancel subscription", body: e instanceof Error ? e.message : String(e) }),
  });

  const upgrades = useMemo<Plan[]>(() => {
    const current = RANK[getPlan(credits?.plan_id ?? "free").name] ?? 0;
    return PLANS.filter((p) => p.kind === "subscription" && p.interval === "month" && (RANK[p.name] ?? 0) > current);
  }, [credits?.plan_id]);

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

  const retention = planRetention(credits.plan_id);

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
      />

      {/* Current plan */}
      <section className="card-cobalt mt-4 p-5">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--card-accent)]">Current plan</p>
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
        {credits.razorpay_subscription_id && (
          <div className="mt-5">
            <button
              type="button"
              onClick={async () => { if (await showConfirm({ title: "Cancel your subscription?", body: "It will remain active until the end of the current cycle.", confirmLabel: "Cancel plan", destructive: true })) cancel.mutate(); }}
              disabled={cancel.isPending}
              className="h-10 rounded-[12px] px-4 text-[14px] font-medium text-ink disabled:opacity-60"
              style={{ border: "1px solid var(--line)" }}
            >
              Cancel plan
            </button>
          </div>
        )}
      </section>

      {buyError && (
        <p className="mt-3 text-[13px]" style={{ color: "#FF2FA3" }}>{buyError}</p>
      )}

      {/* Upgrade inline */}
      {upgrades.length > 0 && (
        <section className="mt-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Move up a plan</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {upgrades.map((p, i) => (
              <div key={p.id} className={["card-magenta", "card-amber", "card-cobalt"][i % 3] + " p-4"}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-[20px] text-ink">{p.name}</p>
                  <p className="text-[14px] font-semibold text-ink">{formatInr(p.priceInr)}<span className="text-[12px] text-muted">/mo</span></p>
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{PLAN_DIFF[p.name]}</p>
                <button
                  type="button"
                  onClick={() => buy(p)}
                  disabled={buying === p.id}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-[12px] text-[14px] font-semibold disabled:opacity-60"
                  style={{ background: "#3D5AFE", color: "#F5F7FF" }}
                >
                  {buying === p.id ? "Opening…" : <>Upgrade to {p.name} <ArrowUpRight className="h-4 w-4" /></>}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top ups */}
      <TopUps buying={buying} onBuy={buy} />

      {/* Storage */}
      <section className="card-amber mt-4 p-5">
        <div className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-[color:var(--card-accent)]" />
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--card-accent)]">Your photos</p>
        </div>
        <p className="mt-2 text-[15px] font-medium text-ink">{retention.label}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{retention.detail}</p>
      </section>

      {/* GST details */}
      <GstBlock ready={ready} />

      {/* Usage */}
      <section className="card-magenta mt-4 p-5">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--card-accent)]">This month</p>
        <p className="mt-1 text-[14px] text-ink">
          Purchased <span className="font-semibold">{usedThisMonth}</span> credits since{" "}
          {new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}.
        </p>
      </section>

      {/* Invoices */}
      <section className="mt-4">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-muted" />
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Invoice history</p>
        </div>
        {invoices.length === 0 && payments.length === 0 ? (
          <p className="mt-3 text-[14px] text-muted">No invoices yet. Every payment gets one automatically.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {invoices.map((inv) => (
              <li key={inv.id} className="card-list flex items-center justify-between p-3">
                <div>
                  <p className="text-[14px] font-medium text-ink">{inv.plan_name}</p>
                  <p className="mt-0.5 font-mono text-[12px] text-muted">
                    {inv.invoice_no} ·{" "}
                    {new Date(inv.invoice_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {inv.is_gst_invoice ? " · GST invoice" : " · receipt"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-ink">{rupees(inv.total_paise)}</span>
                  <Link
                    to="/invoice/$id"
                    params={{ id: inv.id }}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-ink"
                    aria-label={`Download invoice ${inv.invoice_no}`}
                  >
                    <Download className="h-4 w-4" />
                  </Link>
                </div>
              </li>
            ))}
            {invoices.length === 0 &&
              payments.map((p) => (
                <li key={p.id} className="card-list flex items-center justify-between p-3">
                  <div>
                    <p className="text-[14px] font-medium text-ink">{p.plan_name}</p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                      <span className={p.status === "paid" ? "text-green" : p.status === "failed" ? "text-primary" : "text-muted"}>{p.status}</span>
                    </p>
                  </div>
                  <span className="text-[14px] font-semibold text-ink">{formatInr(p.amount_inr)}</span>
                </li>
              ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-center text-[12px] text-muted">
        <a href="/library?tour=1" className="underline">Take the tour again</a>
        <span className="mx-2">·</span>
        Something wrong with an invoice?{" "}
        <a href="mailto:hello@cowq.app" className="underline">
          Email us <ExternalLink className="inline h-3 w-3" />
        </a>
      </p>
    </main>
  );
}

function TopUps({ buying, onBuy }: { buying: string | null; onBuy: (p: Plan) => void }) {
  const [open, setOpen] = useState(false);
  const packs = creditPacks();
  return (
    <section className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-[12px] px-4 py-3 text-left"
        style={{ border: "1px solid var(--line)" }}
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Plus className="h-4 w-4" /> Top up credits
        </span>
        <span className="text-[13px] text-muted">{open ? "Hide" : "Credits that never expire"}</span>
      </button>
      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {packs.map((p, i) => (
            <div key={p.id} className={["card-cobalt", "card-magenta", "card-amber"][i % 3] + " p-4"}>
              <p className="font-display text-[20px] text-ink">{p.credits.toLocaleString("en-IN")} credits</p>
              <p className="mt-0.5 text-[13px] text-muted">About {Math.floor(p.credits / 90)} complete products.</p>
              <button
                type="button"
                onClick={() => onBuy(p)}
                disabled={buying === p.id}
                className="mt-3 flex h-11 w-full items-center justify-center rounded-[12px] text-[14px] font-semibold disabled:opacity-60"
                style={{ background: "#3D5AFE", color: "#F5F7FF" }}
              >
                {buying === p.id ? "Opening…" : `Buy — ${formatInr(p.priceInr)}`}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function GstBlock({ ready }: { ready: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["my-gst"], queryFn: () => getMyGstDetails(), enabled: ready });
  const [gstin, setGstin] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!data) return;
    setGstin(data.gstin ?? "");
    setName(data.invoice_business_name ?? "");
    setAddress(data.invoice_address ?? "");
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      saveMyGstDetails({ data: { gstin, invoice_business_name: name, invoice_address: address } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-gst"] });
      showAlert({ title: "Saved", body: "Your GST details will appear on future invoices." });
    },
    onError: (e) => showAlert({ title: "Couldn't save", body: e instanceof Error ? e.message : String(e) }),
  });

  const hint = touched && gstin.trim() !== "" && !looksLikeGstin(gstin);

  return (
    <section className="card-cobalt mt-4 p-5">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--card-accent)]">GST details</p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        Add your GST details to get a GST invoice on every payment.
      </p>

      <label className="mt-4 block text-[12px] font-semibold uppercase tracking-wide text-muted" htmlFor="gstin">GSTIN</label>
      <input
        id="gstin"
        value={gstin}
        onChange={(e) => { setGstin(e.target.value.toUpperCase()); setTouched(true); }}
        placeholder="29ABCDE1234F1Z5"
        maxLength={20}
        className="mt-1 h-11 w-full rounded-[12px] px-3 font-mono text-[14px] text-ink"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      />
      {hint && (
        <p className="mt-1 text-[12px]" style={{ color: "#FF8A1E" }}>
          That doesn't look like a valid GSTIN — you can still save it.
        </p>
      )}

      <label className="mt-4 block text-[12px] font-semibold uppercase tracking-wide text-muted" htmlFor="inv-name">Business name for invoice</label>
      <input
        id="inv-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Sundhar Traders"
        className="mt-1 h-11 w-full rounded-[12px] px-3 text-[14px] text-ink"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      />

      <label className="mt-4 block text-[12px] font-semibold uppercase tracking-wide text-muted" htmlFor="inv-addr">Billing address</label>
      <textarea
        id="inv-addr"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        rows={3}
        placeholder="Shop 4, MG Road, Bengaluru 560001"
        className="mt-1 w-full rounded-[12px] p-3 text-[14px] text-ink"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
      />

      <button
        type="button"
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="mt-4 h-11 rounded-[12px] px-5 text-[14px] font-semibold disabled:opacity-60"
        style={{ background: "#3D5AFE", color: "#F5F7FF" }}
      >
        {save.isPending ? "Saving…" : "Save GST details"}
      </button>
    </section>
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
