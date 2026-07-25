import type { ReactNode } from "react";
import { GlassCard } from "./primitives";

export function ProfileEmptyState({
  art,
  title,
  body,
  action,
  tint,
}: {
  art: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
  tint: string;
}) {
  return (
    <GlassCard tint={tint} hover={false} className="rise-in p-8 text-center">
      <div className="mx-auto w-[180px]">{art}</div>
      <h3 className="mt-4 text-[17px] font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-[42ch] text-[14px] leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </GlassCard>
  );
}
