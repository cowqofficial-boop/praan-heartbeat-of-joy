import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { getMyCredits } from "@/lib/billing.functions";

export function CreditBadge() {
  const { data } = useQuery({
    queryKey: ["my-credits"],
    queryFn: () => getMyCredits(),
    staleTime: 30_000,
  });
  const total = data?.total ?? null;
  const label = total == null ? "…" : total.toLocaleString("en-IN");
  return (
    <Link
      to="/pricing"
      className="flex h-9 items-center gap-1.5 rounded-full border border-[color:var(--color-border)] bg-white pl-2.5 pr-3 text-[13px] font-semibold text-ink hover:bg-surface"
      aria-label={`Credits: ${label}. Tap to view plans.`}
    >
      <Zap className="h-3.5 w-3.5 text-highlight" fill="currentColor" />
      <span className="font-mono tabular-nums">{label}</span>
    </Link>
  );
}
