import { Check, Loader2 } from "lucide-react";

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
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors ${
              s.state === "done"
                ? "bg-highlight text-white"
                : s.state === "active"
                  ? "bg-primary/10 text-primary"
                  : s.state === "error"
                    ? "bg-primary text-white"
                    : "bg-surface text-muted"
            }`}
          >
            {s.state === "done" ? (
              <Check className="h-5 w-5" />
            ) : s.state === "active" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="text-[13px] font-semibold">{i + 1}</span>
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
