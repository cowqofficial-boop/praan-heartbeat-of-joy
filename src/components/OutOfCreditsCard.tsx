import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function OutOfCreditsCard({
  heading,
  body,
  needed,
  have,
}: {
  heading?: string;
  body?: string;
  needed?: number;
  have?: number;
}) {
  const defaultHeading = needed != null && have != null
    ? `You need ${needed} credits — you have ${have}.`
    : "You're out of credits.";
  const defaultBody =
    "Top up any time — credits never expire — or upgrade for monthly credits and everything unlocked.";
  return (
    <div className="mt-6 rounded-[14px] bg-surface p-5 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white">
        <Sparkles className="h-5 w-5 text-highlight" />
      </div>
      <p className="mt-3 text-[16px] font-semibold text-ink">{heading ?? defaultHeading}</p>
      <p className="mt-1 text-[14px] text-muted">{body ?? defaultBody}</p>
      <div className="mt-4 flex flex-col gap-2">
        <Link
          to="/pricing"
          className="inline-flex h-11 items-center justify-center rounded-[14px] bg-primary px-6 text-[15px] font-semibold text-primary-foreground"
        >
          Upgrade
        </Link>
        <Link
          to="/pricing"
          hash="topups"
          className="inline-flex h-11 items-center justify-center rounded-[14px] bg-white px-6 text-[15px] font-semibold text-ink"
        >
          Buy credits
        </Link>
      </div>
    </div>
  );
}
