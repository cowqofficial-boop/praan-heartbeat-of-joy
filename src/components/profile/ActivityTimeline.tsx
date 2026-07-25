import {
  CreditCard,
  Link2,
  Package,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { ActivityEvent } from "@/lib/profile.functions";
import { COBALT, MAGENTA, AMBER } from "@/lib/page-accent";
import { GlassCard, Skeleton, timeAgo } from "./primitives";
import { ProfileEmptyState } from "./ProfileEmptyState";
import { NoActivityArt } from "./illustrations";

const META: Record<ActivityEvent["kind"], { icon: LucideIcon; tint: string }> = {
  product: { icon: Package, tint: COBALT },
  payment: { icon: CreditCard, tint: AMBER },
  model: { icon: UserRound, tint: MAGENTA },
  shop: { icon: Link2, tint: COBALT },
  account: { icon: ShieldCheck, tint: MAGENTA },
};

export function ActivityTimeline({
  events,
  loading,
  limit,
}: {
  events: ActivityEvent[] | undefined;
  loading: boolean;
  limit?: number;
}) {
  if (loading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-[12px]" />
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <ProfileEmptyState
        tint={MAGENTA}
        art={<NoActivityArt tint={MAGENTA} className="w-full" />}
        title="Nothing here yet"
        body="Once you make your first set of product photos, everything you do shows up here as a running record."
      />
    );
  }

  const rows = limit ? events.slice(0, limit) : events;

  return (
    <ol className="relative grid gap-1 pl-6">
      <span
        className="absolute left-[9px] top-2 bottom-2 w-px"
        style={{ background: "linear-gradient(180deg, var(--line), transparent)" }}
        aria-hidden
      />
      {rows.map((e, i) => {
        const meta = META[e.kind];
        return (
          <li
            key={e.id}
            className="rise-in relative py-2.5"
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <span
              className="absolute -left-6 top-3 grid h-[19px] w-[19px] place-items-center rounded-full"
              style={{
                background: `color-mix(in oklab, ${meta.tint} 22%, var(--raised))`,
                color: meta.tint,
                border: `1px solid color-mix(in oklab, ${meta.tint} 40%, transparent)`,
              }}
              aria-hidden
            >
              <meta.icon className="h-3 w-3" strokeWidth={2} />
            </span>
            <p className="text-[14px] text-ink">{e.title}</p>
            <p className="mt-0.5 text-[12px] text-muted">
              {[e.detail, timeAgo(e.at)].filter(Boolean).join(" · ")}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function ActivityCard({
  events,
  loading,
  limit = 6,
}: {
  events: ActivityEvent[] | undefined;
  loading: boolean;
  limit?: number;
}) {
  return (
    <GlassCard tint={MAGENTA} hover={false} className="rise-in p-5 sm:p-6">
      <h2 className="text-[17px] font-semibold text-ink">Recent activity</h2>
      <p className="mt-1 text-[13px] text-muted">Everything that has happened on your account.</p>
      <div className="mt-4">
        <ActivityTimeline events={events} loading={loading} limit={limit} />
      </div>
    </GlassCard>
  );
}
