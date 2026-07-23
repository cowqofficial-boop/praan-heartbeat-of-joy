import { Check } from "lucide-react";

export type StepState = "pending" | "active" | "done" | "error";

export function ProgressSteps({
  steps,
}: {
  steps: { label: string; state: StepState }[];
}) {
  return (
    <ul className="flex flex-col gap-5">
      {steps.map((s, i) => (
        <li key={i} className="flex items-center gap-4">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
              s.state === "done"
                ? "bg-marigold text-background"
                : s.state === "active"
                  ? "bg-raised text-ink breathe"
                  : s.state === "error"
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface text-muted"
            }`}
          >
            {s.state === "done" ? (
              <Check className="h-5 w-5 scale-in" />
            ) : (
              <span className="font-mono text-[13px] font-semibold tabular-nums">{i + 1}</span>
            )}
          </span>
          <span
            className={`text-[16px] ${
              s.state === "pending" ? "text-muted" : "text-ink font-medium"
            }`}
          >
            {s.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
