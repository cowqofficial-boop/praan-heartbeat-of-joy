import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getMyCredits } from "@/lib/billing.functions";
import { creditColor } from "@/lib/page-accent";

function useCountUp(target: number | null, duration = 400) {
  const [display, setDisplay] = useState<number | null>(target);
  const from = useRef<number>(target ?? 0);
  useEffect(() => {
    if (target == null) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) { setDisplay(target); from.current = target; return; }
    const start = performance.now();
    const startVal = from.current;
    const delta = target - startVal;
    if (delta === 0) { setDisplay(target); return; }
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(startVal + delta * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

export function CreditBadge() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data } = useQuery({
    queryKey: ["my-credits"],
    queryFn: () => getMyCredits(),
    staleTime: 30_000,
    enabled: path !== "/" && !path.startsWith("/auth"),
  });
  const total = data?.total ?? null;
  const shown = useCountUp(total);
  const label = shown == null ? "…" : shown.toLocaleString("en-IN");
  const fg = creditColor(total ?? 0);
  return (
    <Link
      to="/pricing"
      className="flex h-9 items-center gap-1.5 rounded-full pl-2.5 pr-3 text-[13px] font-semibold hover:brightness-110"
      style={{ background: `color-mix(in oklab, ${fg} 14%, var(--raised))`, color: fg }}
      aria-label={`Credits: ${label}. Tap to view plans.`}
    >
      <Zap className="h-3.5 w-3.5" fill="currentColor" />
      <span className="font-mono tabular-nums">{label}</span>
    </Link>
  );
}
