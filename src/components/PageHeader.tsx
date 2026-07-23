import { useEffect, useRef, useState, type ReactNode } from "react";
import { HelpCircle, type LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

type Action = {
  label: string;
  to?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  disabled?: boolean;
};

type Props = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  help?: ReactNode;
  action?: Action;
  secondary?: ReactNode;
};

export function PageHeader({ icon: Icon, title, subtitle, help, action, secondary }: Props) {
  return (
    <header className="mb-6">
      <div className="flex items-start gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]"
          style={{
            background: "color-mix(in oklab, var(--page-accent) 18%, var(--raised))",
            color: "var(--page-accent)",
            boxShadow: "0 6px 20px color-mix(in oklab, var(--page-accent) 22%, transparent)",
          }}
          aria-hidden
        >
          <Icon className="h-7 w-7" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="page-headline truncate">{title}</h1>
            {help && <HelpButton content={help} />}
          </div>
          <p className="mt-1 text-[14px] text-muted">{subtitle}</p>
        </div>
      </div>
      {(action || secondary) && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {action && <PrimaryAction {...action} />}
          {secondary}
        </div>
      )}
    </header>
  );
}

function PrimaryAction({ label, to, onClick, icon: Icon, disabled }: Action) {
  const cls =
    "btn-accent inline-flex h-12 items-center justify-center gap-2 rounded-[14px] px-5 text-[15px] font-semibold transition-[filter,transform] disabled:opacity-50";
  const inner = (
    <>
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </>
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {inner}
    </button>
  );
}

export function HelpButton({ content, label = "What is this?" }: { content: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid h-7 w-7 place-items-center rounded-full text-muted hover:text-ink"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="dialog"
          className="popover-in absolute left-0 top-9 z-50 w-[280px] rounded-[12px] p-3 text-[13px] leading-relaxed text-ink"
          style={{
            background: "var(--raised)",
            borderTop: "2px solid var(--page-accent)",
            boxShadow: "var(--shadow-raised), 0 0 0 1px color-mix(in oklab, var(--page-accent) 25%, transparent)",
          }}
        >
          {content}
        </div>
      )}
    </span>
  );
}
