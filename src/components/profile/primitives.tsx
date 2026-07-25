// Shared building blocks for the Profile & Settings area.
// Glassmorphic cards, inline-editable fields, toggles and autosave.
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, Loader2, RotateCcw, type LucideIcon } from "lucide-react";
import { COBALT, MAGENTA, AMBER } from "@/lib/page-accent";

export const TINTS = [COBALT, MAGENTA, AMBER] as const;

/** Cycle tints by position so adjacent cards always differ. */
export function tintAt(i: number): string {
  return TINTS[i % TINTS.length];
}

// ---------------------------------------------------------------- cards

export function GlassCard({
  tint,
  className = "",
  children,
  hover = true,
  style,
  ...rest
}: {
  tint?: string;
  className?: string;
  children: ReactNode;
  hover?: boolean;
  style?: React.CSSProperties;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "style" | "className" | "children">) {
  return (
    <div
      className={`glass-card glass-sheen ${hover ? "glass-hover" : ""} ${className}`}
      style={{ ["--card-accent" as string]: tint ?? "var(--page-accent)", ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function SectionCard({
  icon: Icon,
  title,
  description,
  tint,
  aside,
  children,
  index = 0,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  tint?: string;
  aside?: ReactNode;
  children?: ReactNode;
  index?: number;
}) {
  const accent = tint ?? tintAt(index);
  return (
    <GlassCard tint={accent} className="rise-in p-5 sm:p-6" style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]"
          style={{
            background: `color-mix(in oklab, ${accent} 20%, var(--raised))`,
            color: accent,
            boxShadow: `0 6px 20px color-mix(in oklab, ${accent} 24%, transparent)`,
          }}
          aria-hidden
        >
          <Icon className="h-7 w-7" strokeWidth={1.6} />
        </div>
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : <span />}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </GlassCard>
  );
}

export function Eyebrow({ children, tint }: { children: ReactNode; tint: string }) {
  return (
    <p
      className="text-[11px] font-semibold uppercase tracking-[0.14em]"
      style={{ color: tint }}
    >
      {children}
    </p>
  );
}

// ------------------------------------------------------------- skeleton

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function CardSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <GlassCard hover={false} className="p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-[12px]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </GlassCard>
  );
}

// -------------------------------------------------------------- autosave

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Debounced autosave with a one-step undo. `save` is called ~700ms after the
 * last change; `undo` restores the value the field had before this edit run.
 */
export function useAutosave<T>(save: (patch: Partial<T>) => Promise<unknown>) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [undoPatch, setUndoPatch] = useState<Partial<T> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Partial<T>>({});

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const flush = useCallback(async () => {
    const patch = pending.current;
    pending.current = {};
    if (Object.keys(patch).length === 0) return;
    setState("saving");
    setError(null);
    try {
      await save(patch);
      setState("saved");
      setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 2200);
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Could not save that.");
    }
  }, [save]);

  const queue = useCallback(
    (patch: Partial<T>, previous?: Partial<T>) => {
      if (previous) setUndoPatch(previous);
      pending.current = { ...pending.current, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 700);
    },
    [flush],
  );

  const undo = useCallback(async () => {
    if (!undoPatch) return;
    const patch = undoPatch;
    setUndoPatch(null);
    pending.current = { ...pending.current, ...patch };
    await flush();
    return patch;
  }, [undoPatch, flush]);

  return { state, error, queue, flush, undo, canUndo: !!undoPatch };
}

export function SaveBadge({
  state,
  error,
  canUndo,
  onUndo,
}: {
  state: SaveState;
  error?: string | null;
  canUndo?: boolean;
  onUndo?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-[12px]" aria-live="polite">
      {state === "saving" && (
        <span className="inline-flex items-center gap-1.5 text-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving
        </span>
      )}
      {state === "saved" && (
        <span className="inline-flex items-center gap-1.5" style={{ color: COBALT }}>
          <Check className="h-3.5 w-3.5" /> Saved
        </span>
      )}
      {state === "error" && (
        <span style={{ color: MAGENTA }}>{error ?? "Could not save."}</span>
      )}
      {canUndo && state !== "saving" && (
        <button
          type="button"
          onClick={onUndo}
          className="inline-flex items-center gap-1 rounded-[8px] px-2 py-1 text-muted hover:text-ink"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Undo
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- fields

export function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[12px] font-medium text-muted">{label}</label>
      {children}
      {hint && <p className="text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

const CONTROL =
  "inline-edit w-full bg-transparent px-3 py-2.5 text-[15px] text-ink outline-none";

export function TextField({
  label,
  hint,
  value,
  placeholder,
  maxLength,
  multiline,
  type = "text",
  onCommit,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  type?: string;
  onCommit: (next: string, previous: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const initial = useRef(value);
  const id = useId();

  useEffect(() => {
    setDraft(value);
    initial.current = value;
  }, [value]);

  function commit(next: string) {
    if (next === initial.current) return;
    const prev = initial.current;
    initial.current = next;
    onCommit(next, prev);
  }

  const shared = {
    id,
    value: draft,
    placeholder,
    maxLength,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDraft(e.target.value);
      commit(e.target.value);
    },
    className: CONTROL,
  };

  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[12px] font-medium text-muted">
        {label}
      </label>
      <div
        className="rounded-[10px]"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)" }}
      >
        {multiline ? (
          <textarea {...shared} rows={4} className={`${CONTROL} resize-y`} />
        ) : (
          <input {...shared} type={type} />
        )}
      </div>
      <div className="flex items-center justify-between">
        {hint ? <p className="text-[12px] text-muted">{hint}</p> : <span />}
        {maxLength && (
          <span className="font-mono text-[11px] text-muted">
            {draft.length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}

export function SelectField({
  label,
  hint,
  value,
  options,
  onCommit,
}: {
  label: string;
  hint?: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onCommit: (next: string, previous: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-[12px] font-medium text-muted">
        {label}
      </label>
      <div
        className="rounded-[10px]"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)" }}
      >
        <select
          id={id}
          value={value}
          onChange={(e) => onCommit(e.target.value, value)}
          className={CONTROL}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {hint && <p className="text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

export function Toggle({
  label,
  description,
  checked,
  tint = COBALT,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  tint?: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-[15px] text-ink">{label}</p>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative mt-0.5 h-[26px] w-[46px] shrink-0 rounded-full transition-colors"
        style={{
          background: checked ? tint : "rgba(255,255,255,0.10)",
          boxShadow: checked ? `0 0 18px color-mix(in oklab, ${tint} 45%, transparent)` : "none",
        }}
      >
        <span
          className="absolute top-[3px] h-5 w-5 rounded-full bg-white transition-[left] duration-200"
          style={{ left: checked ? 23 : 3 }}
        />
      </button>
    </div>
  );
}

export function SliderField({
  label,
  hint,
  value,
  tint = COBALT,
  minLabel,
  maxLabel,
  onCommit,
}: {
  label: string;
  hint?: string;
  value: number;
  tint?: string;
  minLabel: string;
  maxLabel: string;
  onCommit: (next: number, previous: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  const initial = useRef(value);
  useEffect(() => {
    setDraft(value);
    initial.current = value;
  }, [value]);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <label className="text-[12px] font-medium text-muted">{label}</label>
        <span className="font-mono text-[12px]" style={{ color: tint }}>
          {draft}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={draft}
        aria-label={label}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={() => {
          if (draft !== initial.current) {
            const prev = initial.current;
            initial.current = draft;
            onCommit(draft, prev);
          }
        }}
        onKeyUp={() => {
          if (draft !== initial.current) {
            const prev = initial.current;
            initial.current = draft;
            onCommit(draft, prev);
          }
        }}
        className="w-full"
        style={{ accentColor: tint }}
      />
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
      {hint && <p className="text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

// ----------------------------------------------------------------- stats

export function StatTile({
  label,
  value,
  sub,
  tint,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tint: string;
  icon?: LucideIcon;
}) {
  return (
    <GlassCard tint={tint} className="p-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-5 w-5 shrink-0" style={{ color: tint }} strokeWidth={1.7} />}
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      </div>
      <p className="mt-2 font-mono text-[22px] font-semibold text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-[12px] text-muted">{sub}</p>}
    </GlassCard>
  );
}

export function Pill({ children, tint }: { children: ReactNode; tint: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]"
      style={{
        color: tint,
        background: `color-mix(in oklab, ${tint} 16%, transparent)`,
        border: `1px solid color-mix(in oklab, ${tint} 34%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
