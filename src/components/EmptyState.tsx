import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { HelpButton } from "./PageHeader";

const COBALT = "#3B82F6";

type Props = {
  illustration: ReactNode;
  title: string;
  body: string;
  action: { label: string; to?: string; onClick?: () => void };
  help?: ReactNode;
};

export function EmptyState({ illustration, title, body, action, help }: Props) {
  return (
    <div className="mx-auto mt-8 flex max-w-[420px] flex-col items-center rounded-[16px] p-8 text-center" style={{ background: "var(--surface)" }}>
      <div className="empty-illustration text-muted" style={{ width: 120, height: 120 }}>
        {illustration}
      </div>
      <h3 className="mt-5 text-[18px] font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-[14px] text-muted">{body}</p>
      <div className="mt-5">
        {action.to ? (
          <Link
            to={action.to}
            className="inline-flex h-11 items-center justify-center rounded-[12px] px-5 text-[14px] font-semibold"
            style={{ background: COBALT, color: "#F2F7FF" }}
          >
            {action.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex h-11 items-center justify-center rounded-[12px] px-5 text-[14px] font-semibold"
            style={{ background: COBALT, color: "#F2F7FF" }}
          >
            {action.label}
          </button>
        )}
      </div>
      {help && (
        <div className="mt-3">
          <HelpButton content={help} label="How this works" />
        </div>
      )}
    </div>
  );
}

/* ---------- inline SVG illustrations ---------- */

const sv = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IllustrationProduct() {
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" {...sv} className="draw-in">
      <rect x="22" y="34" width="76" height="60" rx="8" />
      <path d="M22 52 L98 52" />
      <circle cx="36" cy="43" r="2.5" />
      <circle cx="46" cy="43" r="2.5" />
      <path d="M42 74 L54 62 L68 78 L82 66" />
      <path d="M60 22 L60 34" />
      <path d="M52 28 L60 22 L68 28" />
    </svg>
  );
}

export function IllustrationCalendar() {
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" {...sv} className="draw-in">
      <rect x="20" y="28" width="80" height="72" rx="8" />
      <path d="M20 46 L100 46" />
      <path d="M38 22 L38 34 M82 22 L82 34" />
      <rect x="34" y="56" width="12" height="10" rx="2" />
      <rect x="54" y="56" width="12" height="10" rx="2" />
      <rect x="74" y="56" width="12" height="10" rx="2" />
      <rect x="34" y="74" width="12" height="10" rx="2" />
      <rect x="54" y="74" width="12" height="10" rx="2" fill="currentColor" opacity="0.15" />
    </svg>
  );
}

export function IllustrationStock() {
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" {...sv} className="draw-in">
      {/* stacked boxes */}
      <rect x="20" y="66" width="36" height="30" rx="3" />
      <path d="M20 74 L56 74" />
      <path d="M34 66 L34 74 M42 66 L42 74" />
      <rect x="62" y="66" width="36" height="30" rx="3" />
      <path d="M62 74 L98 74" />
      <path d="M76 66 L76 74 M84 66 L84 74" />
      <rect x="40" y="34" width="36" height="30" rx="3" />
      <path d="M40 42 L76 42" />
      <path d="M54 34 L54 42 M62 34 L62 42" />
    </svg>
  );
}

export function IllustrationShelf() {
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" {...sv} className="draw-in">
      {/* two shelves with a few products */}
      <path d="M18 54 L102 54" />
      <path d="M18 90 L102 90" />
      <path d="M22 54 L22 96 M98 54 L98 96" />
      <rect x="28" y="36" width="14" height="18" rx="2" />
      <rect x="48" y="30" width="18" height="24" rx="2" />
      <circle cx="82" cy="46" r="8" />
      <rect x="30" y="70" width="20" height="20" rx="2" />
      <rect x="58" y="66" width="14" height="24" rx="2" />
      <rect x="80" y="74" width="14" height="16" rx="2" />
    </svg>
  );
}


export function IllustrationConnect() {
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" {...sv} className="draw-in">
      <circle cx="34" cy="60" r="14" />
      <circle cx="86" cy="60" r="14" />
      <path d="M48 60 L72 60" />
      <path d="M56 52 L64 60 L56 68" />
      <path d="M64 52 L72 60 L64 68" opacity="0.5" />
    </svg>
  );
}

export function IllustrationBilling() {
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" {...sv} className="draw-in">
      <path d="M28 26 L28 100 L40 92 L52 100 L64 92 L76 100 L88 92 L92 100 L92 26 Z" />
      <path d="M40 44 L80 44" />
      <path d="M40 58 L80 58" />
      <path d="M40 72 L64 72" />
    </svg>
  );
}

export function IllustrationBrand() {
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" {...sv} className="draw-in">
      <circle cx="60" cy="48" r="22" />
      <path d="M22 100 C 30 78, 90 78, 98 100" />
      <path d="M60 34 L64 44 L74 44 L66 50 L70 60 L60 54 L50 60 L54 50 L46 44 L56 44 Z" />
    </svg>
  );
}
