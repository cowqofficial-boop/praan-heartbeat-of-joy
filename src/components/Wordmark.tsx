import { Link } from "@tanstack/react-router";

/** CowQ wordmark. Always links home. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="CowQ — home"
      className={`font-display text-[22px] leading-none text-ink transition-opacity hover:opacity-80 ${className}`}
    >
      CowQ
    </Link>
  );
}
