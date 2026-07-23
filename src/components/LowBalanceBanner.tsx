import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { getMyCredits } from "@/lib/billing.functions";
import { getPlan } from "@/lib/plans";

const KEY = "cowq.lowBalanceShown";

export function LowBalanceBanner() {
  const [hidden, setHidden] = useState(true);
  const { data } = useQuery({
    queryKey: ["my-credits"],
    queryFn: () => getMyCredits(),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!data) return;
    const plan = getPlan(data.plan_id);
    if (plan.credits <= 0) return;
    const ratio = data.total / plan.credits;
    if (ratio > 0.2 || data.total === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const last = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (last === today) return;
    setHidden(false);
    if (typeof window !== "undefined") localStorage.setItem(KEY, today);
  }, [data]);

  if (hidden || !data) return null;
  return (
    <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-highlight/15 px-3 py-2.5 text-[13px] text-ink">
      <AlertCircle className="h-4 w-4 shrink-0 text-highlight" />
      <span className="flex-1">
        <span className="font-mono tabular-nums font-semibold">{data.total}</span>{" "}
        credits left.{" "}
        <Link to="/pricing" className="font-semibold underline">
          Top up
        </Link>
      </span>
      <button
        type="button"
        onClick={() => setHidden(true)}
        aria-label="Dismiss"
        className="grid h-6 w-6 place-items-center text-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
