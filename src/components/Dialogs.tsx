import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type BaseOpts = { title: string; body?: string };
type ConfirmOpts = BaseOpts & {
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};
type PromptOpts = BaseOpts & {
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};
type AlertOpts = BaseOpts & { confirmLabel?: string };

type Entry =
  | { id: number; kind: "confirm"; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { id: number; kind: "prompt"; opts: PromptOpts; resolve: (v: string | null) => void }
  | { id: number; kind: "alert"; opts: AlertOpts; resolve: (v: void) => void };

let seq = 0;
const listeners = new Set<(e: Entry[]) => void>();
let entries: Entry[] = [];

function emit() {
  for (const l of listeners) l(entries);
}
function push(e: Entry) {
  entries = [...entries, e];
  emit();
}
function remove(id: number) {
  entries = entries.filter((x) => x.id !== id);
  emit();
}

export function showConfirm(opts: ConfirmOpts) {
  return new Promise<boolean>((resolve) => push({ id: ++seq, kind: "confirm", opts, resolve }));
}
export function showPrompt(opts: PromptOpts) {
  return new Promise<string | null>((resolve) => push({ id: ++seq, kind: "prompt", opts, resolve }));
}
export function showAlert(opts: AlertOpts) {
  return new Promise<void>((resolve) => push({ id: ++seq, kind: "alert", opts, resolve }));
}

export function Dialogs() {
  const [list, setList] = useState<Entry[]>(entries);
  useEffect(() => {
    listeners.add(setList);
    return () => {
      listeners.delete(setList);
    };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      {list.map((e) => (
        <DialogShell key={e.id} entry={e} onDone={() => remove(e.id)} />
      ))}
    </>,
    document.body,
  );
}

function DialogShell({ entry, onDone }: { entry: Entry; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(
    entry.kind === "prompt" ? entry.opts.defaultValue ?? "" : "",
  );

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") cancel();
    };
    document.addEventListener("keydown", onKey);
    if (entry.kind === "prompt") inputRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cancel() {
    if (entry.kind === "confirm") entry.resolve(false);
    else if (entry.kind === "prompt") entry.resolve(null);
    else entry.resolve();
    onDone();
  }
  function accept() {
    if (entry.kind === "confirm") entry.resolve(true);
    else if (entry.kind === "prompt") entry.resolve(value.trim() ? value.trim() : null);
    else entry.resolve();
    onDone();
  }

  const isDestructive = entry.kind === "confirm" && entry.opts.destructive;
  const confirmLabel =
    entry.opts.confirmLabel ??
    (entry.kind === "confirm" ? (isDestructive ? "Delete" : "Confirm") : entry.kind === "prompt" ? "Save" : "OK");
  const cancelLabel =
    entry.kind !== "alert" ? entry.opts.cancelLabel ?? "Cancel" : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={entry.opts.title}
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{ background: "rgba(6,7,10,0.7)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) cancel();
      }}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          accept();
        }}
        className="scale-in w-full max-w-[380px] rounded-[16px] p-5"
        style={{ background: "var(--raised)", boxShadow: "var(--shadow-raised)" }}
      >
        <h2 className="font-display text-[20px] leading-tight text-ink">{entry.opts.title}</h2>
        {entry.opts.body && (
          <p className="mt-2 text-[14px] leading-snug text-muted">{entry.opts.body}</p>
        )}
        {entry.kind === "prompt" && (
          <label className="mt-4 block">
            {entry.opts.label && (
              <span className="mb-1.5 block text-[12px] font-semibold uppercase tracking-wider text-muted">
                {entry.opts.label}
              </span>
            )}
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={entry.opts.placeholder}
              className="h-11 w-full rounded-[12px] px-3 text-[15px] text-ink"
            />
          </label>
        )}
        <div className="mt-5 flex justify-end gap-2">
          {cancelLabel && (
            <button
              type="button"
              onClick={cancel}
              className="h-10 rounded-[12px] bg-raised px-4 text-[14px] font-semibold text-ink hover:brightness-125"
              style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="submit"
            className="h-10 rounded-[12px] px-4 text-[14px] font-semibold"
            style={
              isDestructive
                ? { background: "var(--magenta)", color: "var(--void)" }
                : { background: "var(--cobalt)", color: "var(--cobalt-ink)" }
            }
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
