import { Package, Wrench } from "lucide-react";
import type { ContentKind } from "@/lib/service";

/**
 * Product / Service segmented control. Used anywhere an entry is created,
 * listed, or filtered — so the two types always look like equals.
 */
export function TypeToggle({
  value,
  onChange,
  size = "md",
  className = "",
}: {
  value: ContentKind;
  onChange: (kind: ContentKind) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const pad = size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2.5 text-[14px]";
  return (
    <div
      role="tablist"
      aria-label="Content type"
      className={`inline-flex w-full rounded-[12px] bg-surface p-1 ${className}`}
    >
      {([
        { id: "product" as const, label: "Product", Icon: Package },
        { id: "service" as const, label: "Service", Icon: Wrench },
      ]).map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-[10px] font-semibold transition ${pad} ${
              active ? "bg-primary text-primary-foreground" : "text-muted hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Filter version with an extra "All" option, for list views. */
export function TypeFilter({
  value,
  onChange,
  counts,
}: {
  value: "all" | ContentKind;
  onChange: (v: "all" | ContentKind) => void;
  counts?: { all: number; product: number; service: number };
}) {
  const opts = [
    { id: "all" as const, label: "All" },
    { id: "product" as const, label: "Products" },
    { id: "service" as const, label: "Services" },
  ];
  return (
    <div className="inline-flex rounded-[12px] bg-surface p-1">
      {opts.map((o) => {
        const active = value === o.id;
        const n = counts?.[o.id];
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`rounded-[10px] px-3 py-1.5 text-[13px] font-semibold transition ${
              active ? "bg-primary text-primary-foreground" : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
            {typeof n === "number" && <span className="ml-1.5 opacity-70 tabular-nums">{n}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Small badge shown on every card, row and detail view. */
export function TypeBadge({ kind, className = "" }: { kind: ContentKind; className?: string }) {
  const isService = kind === "service";
  const Icon = isService ? Wrench : Package;
  const fg = isService ? "var(--magenta)" : "var(--cobalt)";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}
      style={{ background: `color-mix(in oklab, ${fg} 16%, var(--raised))`, color: fg }}
    >
      <Icon className="h-3 w-3" />
      {isService ? "Service" : "Product"}
    </span>
  );
}
