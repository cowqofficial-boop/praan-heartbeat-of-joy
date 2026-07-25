import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Crown, ShieldCheck, UserPlus } from "lucide-react";
import { COBALT, MAGENTA, AMBER } from "@/lib/page-accent";
import { GlassCard, Pill } from "@/components/profile/primitives";
import { ProfileEmptyState } from "@/components/profile/ProfileEmptyState";
import { NoTeamArt } from "@/components/profile/illustrations";

export const Route = createFileRoute("/_authenticated/profile/team")({
  head: () => ({
    meta: [
      { title: "Team — CowQ" },
      { name: "description", content: "Shared shop accounts and staff roles, and when they arrive in CowQ." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeamTab,
});

const ROLES = [
  { name: "Owner", tint: COBALT, blurb: "You. Pays the bill, can delete the account, sees everything." },
  { name: "Manager", tint: MAGENTA, blurb: "Makes products, edits stock, posts to your shops. Can't touch billing." },
  { name: "Helper", tint: AMBER, blurb: "Uploads photos and fills in stock counts. Can't post or spend credits." },
];

function TeamTab() {
  return (
    <div className="grid gap-4">
      <ProfileEmptyState
        tint={COBALT}
        art={<NoTeamArt tint={COBALT} className="w-full" />}
        title="It's just you right now"
        body="Letting your staff sign in under your shop isn't built yet. Today, one account belongs to one person — sharing your password is the only way, and we'd rather you didn't."
        action={
          <Link
            to="/pricing"
            className="inline-flex h-11 items-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold text-ink"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)" }}
          >
            See what's on each plan <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      <GlassCard tint={MAGENTA} hover={false} className="rise-in p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <UserPlus className="h-7 w-7 shrink-0" strokeWidth={1.6} style={{ color: MAGENTA }} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-semibold text-ink">How team accounts will work</h2>
              <Pill tint={AMBER}>Being built</Pill>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Three roles, sharing one pool of credits. You invite by phone number or email; they get their own sign-in.
            </p>
            <ul className="mt-4 grid gap-3">
              {ROLES.map((r) => (
                <li
                  key={r.name}
                  className="rounded-[12px] p-3.5"
                  style={{
                    background: `color-mix(in oklab, ${r.tint} 9%, rgba(255,255,255,0.02))`,
                    border: `1px solid color-mix(in oklab, ${r.tint} 20%, transparent)`,
                  }}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: r.tint }}>
                    {r.name}
                  </p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink">{r.blurb}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </GlassCard>

      <GlassCard tint={AMBER} hover={false} className="rise-in p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-7 w-7 shrink-0" strokeWidth={1.6} style={{ color: AMBER }} />
          <div>
            <h3 className="text-[16px] font-semibold text-ink">Until then</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              If someone else in your shop needs to make products, open a second account for them on the free plan. Your
              brand kit and saved models don't carry across yet — that's the honest limitation.
            </p>
          </div>
        </div>
      </GlassCard>

      <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-muted">
        <Crown className="h-3.5 w-3.5" style={{ color: COBALT }} /> Team accounts will land on Growth and Pro first.
      </p>
    </div>
  );
}
