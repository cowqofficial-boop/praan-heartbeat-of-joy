import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  text: string;
  linkLabel: string;
  to: string;
};

export function NudgeCard({ icon: Icon, text, linkLabel, to }: Props) {
  return (
    <Link
      to={to}
      className="nudge-in mt-8 flex items-center gap-3 rounded-[14px] p-4 text-[14px] transition-[filter] hover:brightness-110"
      style={{ background: "var(--raised)" }}
    >
      <div
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]"
        style={{ background: "color-mix(in oklab, #3B82F6 18%, transparent)", color: "#3B82F6" }}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="flex-1 text-ink">{text}</p>
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: "#3B82F6" }}>
        {linkLabel} <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

export function NudgeContainer({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
