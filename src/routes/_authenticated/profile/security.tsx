import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Fingerprint,
  KeyRound,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSecurityOverview } from "@/lib/profile.functions";
import { showAlert, showConfirm } from "@/components/Dialogs";
import { COBALT, MAGENTA, AMBER } from "@/lib/page-accent";
import {
  GlassCard,
  SectionCard,
  Pill,
  CardSkeleton,
  timeAgo,
} from "@/components/profile/primitives";
import { CompletionRing } from "@/components/profile/CompletionRing";

export const Route = createFileRoute("/_authenticated/profile/security")({
  head: () => ({
    meta: [
      { title: "Security — CowQ" },
      { name: "description", content: "How your CowQ account is protected, and how to sign out everywhere." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SecurityTab,
});

function SecurityTab() {
  const fn = useServerFn(getSecurityOverview);
  const { data, isLoading } = useQuery({ queryKey: ["profile", "security"], queryFn: () => fn({}) });

  const signOutAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      window.location.href = "/auth";
    },
    onError: (e) => showAlert({ title: "Could not sign out", body: (e as Error).message }),
  });

  async function confirmSignOutAll() {
    const ok = await showConfirm({
      title: "Sign out everywhere?",
      body: "Every phone and computer signed into this account will be signed out, including this one.",
      confirmLabel: "Sign out everywhere",
      destructive: true,
    });
    if (ok) signOutAll.mutate();
  }

  if (isLoading || !data) return <div className="grid gap-4"><CardSkeleton rows={3} /><CardSkeleton rows={2} /></div>;

  const scoreTint = data.score >= 80 ? COBALT : data.score >= 50 ? AMBER : MAGENTA;

  return (
    <div className="grid gap-4">
      <GlassCard tint={scoreTint} hover={false} className="rise-in p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <CompletionRing percent={data.score} />
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-ink">Security score</h2>
            <p className="mt-1 text-[13px] text-muted">
              A rough measure of how hard it would be for someone else to get into your account.
            </p>
            <ul className="mt-4 grid gap-2">
              {data.checks.map((c) => (
                <li key={c.label} className="flex items-center justify-between gap-3 text-[14px]">
                  <span className={c.done ? "text-muted" : "text-ink"}>{c.label}</span>
                  {c.done ? (
                    <Pill tint={COBALT}>Done</Pill>
                  ) : (
                    <Pill tint={AMBER}>+{c.weight}</Pill>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </GlassCard>

      <SectionCard
        index={1}
        icon={KeyRound}
        title="How you sign in"
        description="The method this account uses today."
        aside={<Pill tint={data.email_confirmed ? COBALT : AMBER}>{data.email_confirmed ? "Email confirmed" : "Unconfirmed"}</Pill>}
      >
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            { k: "Method", v: data.provider === "google" ? "Google" : "Email and password" },
            { k: "Email", v: data.email ?? "—" },
            { k: "Last signed in", v: data.last_sign_in_at ? timeAgo(data.last_sign_in_at) : "—" },
            { k: "Account opened", v: data.created_at ? new Date(data.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—" },
          ].map((row) => (
            <div key={row.k}>
              <dt className="text-[12px] text-muted">{row.k}</dt>
              <dd className="mt-0.5 truncate text-[15px] text-ink">{row.v}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      <SectionCard
        index={2}
        icon={MonitorSmartphone}
        title="Signed-in devices"
        description="CowQ doesn't keep a list of your devices yet. If you think someone else is in your account, sign out everywhere and change your password."
        aside={
          <button
            type="button"
            onClick={confirmSignOutAll}
            disabled={signOutAll.isPending}
            className="inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-[14px] font-semibold disabled:opacity-60"
            style={{
              color: MAGENTA,
              background: `color-mix(in oklab, ${MAGENTA} 14%, transparent)`,
              border: `1px solid color-mix(in oklab, ${MAGENTA} 34%, transparent)`,
            }}
          >
            <LogOut className="h-4 w-4" /> {signOutAll.isPending ? "Signing out…" : "Sign out everywhere"}
          </button>
        }
      />

      <SectionCard
        index={0}
        icon={Fingerprint}
        title="Two-step sign-in"
        description="Not available yet. When it lands you'll get a code on your phone as well as your password — we'll email you the day it's ready."
        aside={<Pill tint={AMBER}>Coming</Pill>}
      />

      <GlassCard tint={COBALT} hover={false} className="rise-in p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-7 w-7 shrink-0" strokeWidth={1.6} style={{ color: COBALT }} />
          <div>
            <h3 className="text-[16px] font-semibold text-ink">What CowQ will never do</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              We will never ask for your password, your bank OTP, or your UPI PIN — not on a call, not on WhatsApp,
              not by email. If someone claims to be from CowQ and asks, they aren't.
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[12px]" style={{ color: MAGENTA }}>
              <ShieldAlert className="h-3.5 w-3.5" /> Payments go through Razorpay. We never see your card.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
