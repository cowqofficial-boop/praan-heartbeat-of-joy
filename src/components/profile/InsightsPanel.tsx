import { Link } from "@tanstack/react-router";
import {
  Boxes,
  CalendarDays,
  Camera,
  Clock,
  HardDrive,
  IndianRupee,
  Link2,
  Package,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { ProfileInsights } from "@/lib/profile.functions";
import type { MyCredits } from "@/lib/billing.functions";
import { COBALT, MAGENTA, AMBER, creditColor } from "@/lib/page-accent";
import { GlassCard, Skeleton, formatBytes } from "./primitives";

function Bar({ value, tint }: { value: number; tint: string }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{
          width: `${Math.max(2, Math.min(100, value))}%`,
          background: `linear-gradient(90deg, ${tint}, color-mix(in oklab, ${tint} 45%, #F5F7FF))`,
          boxShadow: `0 0 12px color-mix(in oklab, ${tint} 60%, transparent)`,
        }}
      />
    </div>
  );
}

function Widget({
  icon: Icon,
  label,
  value,
  sub,
  tint,
  bar,
}: {
  icon: typeof Package;
  label: string;
  value: string;
  sub?: string;
  tint: string;
  bar?: number;
}) {
  return (
    <GlassCard tint={tint} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
          <p className="mt-1.5 font-mono text-[20px] font-semibold text-ink">{value}</p>
          {sub && <p className="mt-0.5 text-[12px] text-muted">{sub}</p>}
        </div>
        <Icon className="h-5 w-5 shrink-0" strokeWidth={1.7} style={{ color: tint }} />
      </div>
      {bar !== undefined && <Bar value={bar} tint={tint} />}
    </GlassCard>
  );
}

export function InsightsPanel({
  insights,
  credits,
  loading,
}: {
  insights: ProfileInsights | undefined;
  credits: MyCredits | undefined;
  loading: boolean;
}) {
  if (loading || !insights) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] w-full rounded-[18px]" />
        ))}
      </div>
    );
  }

  const total = (credits?.subscription_credits ?? 0) + (credits?.pack_credits ?? 0);
  const creditTint = creditColor(total);
  const hours = Math.round(insights.minutes_saved / 60);
  const storagePct = Math.min(100, (insights.storage_bytes / (2 * 1024 ** 3)) * 100);

  return (
    <div className="grid gap-3">
      <h2 className="px-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">
        How your shop is doing
      </h2>

      <Widget
        icon={Sparkles}
        label="Credits left"
        value={total.toLocaleString("en-IN")}
        sub={`About ${Math.max(0, Math.floor(total / 60))} more products`}
        tint={creditTint}
        bar={Math.min(100, (total / 800) * 100)}
      />
      <Widget
        icon={Package}
        label="Products"
        value={insights.products.toLocaleString("en-IN")}
        sub={`${insights.photos.toLocaleString("en-IN")} photos made`}
        tint={COBALT}
      />
      <Widget
        icon={IndianRupee}
        label="Money saved"
        value={`₹${insights.rupees_saved.toLocaleString("en-IN")}`}
        sub="Versus a studio shoot per product"
        tint={MAGENTA}
      />
      <Widget
        icon={Clock}
        label="Time saved"
        value={`${hours} hr`}
        sub="Shooting, editing and writing"
        tint={AMBER}
      />
      <Widget
        icon={CalendarDays}
        label="Posts ready"
        value={insights.posts.toLocaleString("en-IN")}
        sub="Waiting in your calendar"
        tint={MAGENTA}
      />
      <Widget
        icon={Boxes}
        label="Stock items"
        value={insights.stock_items.toLocaleString("en-IN")}
        tint={AMBER}
      />
      <Widget
        icon={HardDrive}
        label="Storage used"
        value={formatBytes(insights.storage_bytes)}
        sub="Estimated from your photos"
        tint={COBALT}
        bar={storagePct}
      />
      <Widget
        icon={Link2}
        label="Shops connected"
        value={`${insights.shops_connected} of 3`}
        tint={insights.shops_connected > 0 ? COBALT : AMBER}
        bar={(insights.shops_connected / 3) * 100}
      />
      <Widget
        icon={Camera}
        label="Saved models"
        value={insights.saved_models.toLocaleString("en-IN")}
        tint={MAGENTA}
      />

      <Link
        to="/create"
        className="btn-accent mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold"
      >
        <TrendingUp className="h-4 w-4" /> Add another product
      </Link>
    </div>
  );
}
