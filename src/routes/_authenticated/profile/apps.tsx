import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Check, Clock3, Instagram, Facebook, MessageCircle, Plug } from "lucide-react";
import { listMyChannels, type ChannelStatus } from "@/lib/social.functions";
import { COBALT, MAGENTA, AMBER } from "@/lib/page-accent";
import { GlassCard, Pill, Skeleton, tintAt } from "@/components/profile/primitives";
import { ProfileEmptyState } from "@/components/profile/ProfileEmptyState";
import { NoIntegrationsArt } from "@/components/profile/illustrations";

export const Route = createFileRoute("/_authenticated/profile/apps")({
  head: () => ({
    meta: [
      { title: "Connected apps — CowQ" },
      { name: "description", content: "The shops and channels CowQ can post your products to." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppsTab,
});

const LIVE = {
  instagram: { label: "Instagram", icon: Instagram, blurb: "Post photos and captions straight to your feed." },
  facebook_page: { label: "Facebook Page", icon: Facebook, blurb: "Share the same product to your Page." },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, blurb: "Send a ready-made product message to customers." },
} as const;

// Named honestly: these are on the roadmap, not shipped. No fake "Connect" button.
const PLANNED = [
  "Amazon Seller", "Flipkart", "Shopify", "Google Business", "Meesho", "Zapier",
];

function StatusPill({ c }: { c: ChannelStatus }) {
  if (c.needs_reconnect) return <Pill tint={AMBER}>Reconnect</Pill>;
  if (c.connected) return <Pill tint={COBALT}>Connected</Pill>;
  return <Pill tint={MAGENTA}>Not connected</Pill>;
}

function AppsTab() {
  const fn = useServerFn(listMyChannels);
  const { data, isLoading } = useQuery({ queryKey: ["channels"], queryFn: () => fn({}) });

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] w-full rounded-[18px]" />
        ))}
      </div>
    );
  }

  const channels = data ?? [];
  const anyConnected = channels.some((c) => c.connected);

  return (
    <div className="grid gap-4">
      {!anyConnected && (
        <ProfileEmptyState
          tint={COBALT}
          art={<NoIntegrationsArt tint={COBALT} className="w-full" />}
          title="Nothing connected yet"
          body="Connect Instagram once and CowQ can post a finished product straight from your library — photo, caption and all."
          action={
            <Link to="/connect" className="btn-accent inline-flex h-11 items-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold">
              Connect a shop <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {channels.map((c, i) => {
          const meta = LIVE[c.channel];
          const tint = tintAt(i);
          return (
            <GlassCard key={c.channel} tint={tint} className="rise-in p-5" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]"
                  style={{ background: `color-mix(in oklab, ${tint} 20%, var(--raised))`, color: tint }}
                  aria-hidden
                >
                  <meta.icon className="h-5 w-5" strokeWidth={1.7} />
                </div>
                <StatusPill c={c} />
              </div>
              <h3 className="mt-3 text-[16px] font-semibold text-ink">{meta.label}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                {c.connected ? c.account_name || "Connected" : meta.blurb}
              </p>
              {c.connected && c.token_expires_at && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-muted">
                  <Clock3 className="h-3.5 w-3.5" /> Access valid until{" "}
                  {new Date(c.token_expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
              )}
              <Link
                to="/connect"
                className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-[14px] font-semibold text-ink"
                style={{ background: `color-mix(in oklab, ${tint} 16%, transparent)`, border: `1px solid color-mix(in oklab, ${tint} 32%, transparent)` }}
              >
                {c.connected ? "Manage" : "Connect"} <ArrowUpRight className="h-4 w-4" />
              </Link>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard tint={AMBER} hover={false} className="rise-in p-5">
        <div className="flex items-start gap-3">
          <Plug className="h-7 w-7 shrink-0" strokeWidth={1.6} style={{ color: AMBER }} />
          <div className="min-w-0">
            <h3 className="text-[16px] font-semibold text-ink">Being built next</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              These aren't live yet. Until they are, CowQ gives you a catalog CSV you can import into any of them by hand.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {PLANNED.map((name) => (
                <li
                  key={name}
                  className="rounded-full px-2.5 py-1 text-[12px] text-muted"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)" }}
                >
                  {name}
                </li>
              ))}
            </ul>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[12px]" style={{ color: COBALT }}>
              <Check className="h-3.5 w-3.5" /> CSV export works today, on every plan.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
