import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getMyCredits } from "@/lib/billing.functions";

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
  const { data } = useQuery({
    queryKey: ["my-credits"],
    queryFn: () => getMyCredits(),
    staleTime: 30_000,
  });
  const total = data?.total ?? null;
  const shown = useCountUp(total);
  const label = shown == null ? "…" : shown.toLocaleString("en-IN");
  return (
    <Link
      to="/pricing"
      className="flex h-9 items-center gap-1.5 rounded-full bg-raised pl-2.5 pr-3 text-[13px] font-semibold text-ink hover:brightness-110"
      aria-label={`Credits: ${label}. Tap to view plans.`}
    >
      <Zap className="h-3.5 w-3.5 text-marigold" fill="currentColor" />
      <span className="font-mono tabular-nums">{label}</span>
    </Link>
  );
}
