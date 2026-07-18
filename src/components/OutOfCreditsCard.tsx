import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function OutOfCreditsCard({ heading, body }: { heading?: string; body?: string }) {
  return (
    <div className="mt-6 rounded-[16px] border border-highlight/40 bg-highlight/10 p-5 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white">
        <Sparkles className="h-5 w-5 text-highlight" />
      </div>
      <p className="mt-3 text-[16px] font-semibold text-ink">
        {heading ?? "You've used your products for this month."}
      </p>
      <p className="mt-1 text-[14px] text-muted">
        {body ?? "Top up with a pack or upgrade your plan — takes a minute."}
      </p>
      <Link
        to="/pricing"
        className="mt-4 inline-flex h-11 items-center justify-center rounded-[12px] bg-primary px-6 text-[15px] font-semibold text-primary-foreground"
      >
        See plans
      </Link>
    </div>
  );
}
