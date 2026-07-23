import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { useQueueStore, queueCounts } from "@/lib/queue-store";

export function QueueIndicator() {
  const items = useQueueStore((s) => s.items);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const c = queueCounts(items);
  const total = items.length;
  const allDone = total > 0 && c.running === 0 && c.waiting === 0 && c.ready > 0;
  const [showAllDone, setShowAllDone] = useState(false);

  useEffect(() => {
    if (!allDone) {
      setShowAllDone(false);
      return;
    }
    setShowAllDone(true);
    const t = setTimeout(() => setShowAllDone(false), 10_000);
    return () => clearTimeout(t);
  }, [allDone, c.ready]);

  if (pathname === "/generating") return null;
  if (total === 0) return null;
  if (allDone && !showAllDone) return null;

  const label = allDone
    ? `${c.ready} product${c.ready === 1 ? "" : "s"} ready`
    : [
        c.running || c.waiting
          ? `${c.running + c.waiting} generating`
          : null,
        c.ready ? `${c.ready} ready` : null,
      ]
        .filter(Boolean)
        .join(" · ");

  const busy = c.running > 0 || c.waiting > 0;
  const fg = allDone ? "var(--magenta)" : busy ? "var(--amber)" : "var(--text-dim)";
  return (
    <Link
      to="/generating"
      className={`fixed right-4 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium text-ink shadow-lg transition hover:brightness-110 lg:right-6 lg:bottom-6 bottom-6 ${
        busy ? "breathe" : ""
      }`}
      style={{
        background: `color-mix(in oklab, ${fg} 18%, var(--raised))`,
        boxShadow: `0 8px 28px color-mix(in oklab, ${fg} 30%, transparent)`,
      }}
      aria-label={label}
    >
      <Zap className="h-3.5 w-3.5" style={{ color: fg }} fill="currentColor" />
      <span>{label}</span>
    </Link>
  );
}
