import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { COBALT, MAGENTA, AMBER } from "@/lib/page-accent";

export type CompletionItem = { label: string; done: boolean; to?: string };

/** Animated progress ring — sweeps from 0 to the real value on mount. */
export function CompletionRing({
  percent,
  size = 116,
  stroke = 9,
}: {
  percent: number;
  size?: number;
  stroke?: number;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tint = percent >= 80 ? COBALT : percent >= 40 ? AMBER : MAGENTA;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={tint} />
            <stop offset="100%" stopColor={percent >= 80 ? MAGENTA : COBALT} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * shown) / 100}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)",
            filter: `drop-shadow(0 0 10px color-mix(in oklab, ${tint} 55%, transparent))`,
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="font-mono text-[26px] font-semibold text-ink">{Math.round(percent)}%</span>
      </div>
    </div>
  );
}

export function CompletionChecklist({ items }: { items: CompletionItem[] }) {
  return (
    <ul className="grid gap-2">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2.5 text-[14px]">
          <span
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full"
            style={{
              background: it.done ? COBALT : "rgba(255,255,255,0.07)",
              color: it.done ? "#fff" : "var(--text-dim)",
            }}
            aria-hidden
          >
            {it.done ? <Check className="h-3 w-3" strokeWidth={3} /> : <span className="text-[10px]">–</span>}
          </span>
          <span className={it.done ? "text-muted line-through" : "text-ink"}>{it.label}</span>
        </li>
      ))}
    </ul>
  );
}
