// Modular editing UI.
//
// Every part of a listing is its own card: edit it by hand for free, or spend
// a few credits to have CowQ redo just that part. Nothing else on the page
// changes, and every earlier version is one tap away.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronDown,
  Clock,
  Copy,
  Check,
  Pencil,
  RotateCcw,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  listComponents,
  listComponentVersions,
  regenerateComponent,
  restoreComponentVersion,
  saveComponent,
} from "@/lib/components.functions";
import {
  contentToText,
  defFor,
  previewOf,
  textToContent,
  IMAGE_KIND_LABELS,
  type ComponentAction,
  type GenerationComponent,
} from "@/lib/components";
import { showAlert } from "@/components/Dialogs";

const TONES = ["card-cobalt", "card-magenta", "card-amber"] as const;

function useComponents(generationId: string, enabled: boolean) {
  const load = useServerFn(listComponents);
  return useQuery({
    queryKey: ["components", generationId],
    queryFn: () => load({ data: { generationId } }),
    enabled,
    staleTime: 15_000,
  });
}

function errorText(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const short = msg.match(/NO_CREDITS:(\d+):(\d+)/);
  if (short) return `You need ${short[1]} credits for this and have ${short[2]}. Top up from Billing.`;
  return msg.replace(/^Error:\s*/, "") || "That didn't work. Try again.";
}

/* ============================================================
   THE STACK — one card per part of the listing
   ============================================================ */

export function ComponentStack({
  generationId,
  onChanged,
}: {
  generationId: string;
  onChanged?: () => void;
}) {
  const { data, isLoading } = useComponents(generationId, true);
  const [open, setOpen] = useState<string | null>(null);

  if (isLoading) {
    return <p className="text-[14px] text-muted">Loading your listing…</p>;
  }
  const parts = (data ?? []).filter((c) => c.type !== "image");
  if (parts.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">Your listing</p>
        <p className="text-[12px] text-muted">Edit by hand free, or redo one part</p>
      </div>
      {parts.map((c, i) => (
        <ComponentCard
          key={c.id}
          component={c}
          generationId={generationId}
          tone={TONES[i % TONES.length]}
          isOpen={open === c.id}
          onToggle={() => setOpen((cur) => (cur === c.id ? null : c.id))}
          onChanged={onChanged}
        />
      ))}
    </section>
  );
}

function ComponentCard({
  component,
  generationId,
  tone,
  isOpen,
  onToggle,
  onChanged,
}: {
  component: GenerationComponent;
  generationId: string;
  tone: string;
  isOpen: boolean;
  onToggle: () => void;
  onChanged?: () => void;
}) {
  const def = defFor(component.type);
  const qc = useQueryClient();
  const save = useServerFn(saveComponent);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => contentToText(component.content, def.shape));
  const [copied, setCopied] = useState(false);
  const [sheet, setSheet] = useState<"none" | "ai" | "history">("none");

  const body = contentToText(component.content, def.shape);

  const saving = useMutation({
    mutationFn: () => save({ data: { componentId: component.id, content: textToContent(draft, def.shape) } }),
    onSuccess: async () => {
      setEditing(false);
      await qc.invalidateQueries({ queryKey: ["components", generationId] });
      onChanged?.();
    },
    onError: (e) => showAlert({ title: "Couldn't save", body: errorText(e) }),
  });

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(body);
    } catch {
      /* clipboard blocked — nothing else to do */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className={`${tone} overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.03]"
      >
        <span className="eyebrow w-28 shrink-0 text-[color:var(--card-accent)]">{def.label}</span>
        <span className="min-w-0 flex-1 truncate text-[14px] text-muted">
          {previewOf(component.content, def.shape)}
        </span>
        <span
          onClick={handleCopy}
          role="button"
          tabIndex={0}
          aria-label={`Copy ${def.label}`}
          className="grid h-8 w-8 shrink-0 place-items-center text-muted hover:text-ink"
        >
          {copied ? (
            <Check className="h-4 w-4 scale-in text-[color:var(--card-accent)]" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <div
        className="grid overflow-hidden transition-[grid-template-rows] duration-300"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-4 pb-4 pt-1">
            {editing ? (
              <>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={Math.min(14, Math.max(3, draft.split("\n").length + 1))}
                  className="w-full rounded-[12px] border border-[color:var(--line)] bg-white/[0.03] p-3 text-[15px] text-ink outline-none focus:border-[color:var(--card-accent)]"
                />
                {def.shape === "list" && (
                  <p className="mt-1.5 text-[12px] text-muted">One per line.</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => saving.mutate()}
                    disabled={saving.isPending}
                    className="min-h-[40px] rounded-[10px] bg-[color:var(--card-accent)] px-3.5 text-[13px] font-semibold text-black disabled:opacity-60"
                  >
                    {saving.isPending ? "Saving…" : "Save — free"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setDraft(body);
                    }}
                    className="min-h-[40px] px-2 text-[13px] font-medium text-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                  <span className="text-[12px] text-muted">CowQ learns from your edits.</span>
                </div>
              </>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-[15px] text-ink">{body}</p>
                {def.hint && <p className="mt-1.5 text-[12px] text-muted">{def.hint}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <SmallButton
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    label="Edit"
                    note="free"
                    onClick={() => {
                      setDraft(body);
                      setEditing(true);
                    }}
                  />
                  <SmallButton
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                    label="Redo with AI"
                    note={`${def.cost} credits`}
                    accent
                    onClick={() => setSheet("ai")}
                  />
                  {component.versionCount > 0 && (
                    <SmallButton
                      icon={<Clock className="h-3.5 w-3.5" />}
                      label={`History (${component.versionCount})`}
                      note="free"
                      onClick={() => setSheet("history")}
                    />
                  )}
                </div>
                {component.updatedBy === "seller" && (
                  <p className="mt-2 text-[12px] text-muted">Edited by you.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <AiSheet
        open={sheet === "ai"}
        onClose={() => setSheet("none")}
        component={component}
        generationId={generationId}
        onChanged={onChanged}
      />
      <HistorySheet
        open={sheet === "history"}
        onClose={() => setSheet("none")}
        component={component}
        generationId={generationId}
        onChanged={onChanged}
      />
    </div>
  );
}

function SmallButton({
  icon,
  label,
  note,
  onClick,
  accent,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  note?: string;
  onClick: () => void;
  accent?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-[40px] items-center gap-1.5 rounded-[10px] border px-3 text-[13px] font-medium disabled:opacity-50 ${
        accent
          ? "border-[color:var(--card-accent)]/40 bg-[color:var(--card-accent)]/10 text-[color:var(--card-accent)]"
          : "border-[color:var(--line)] text-muted hover:text-ink"
      }`}
    >
      {icon}
      <span>{label}</span>
      {note && <span className="opacity-70">· {note}</span>}
    </button>
  );
}

/* ============================================================
   AI SHEET — pick an action, see the cost, confirm
   ============================================================ */

function AiSheet({
  open,
  onClose,
  component,
  generationId,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  component: GenerationComponent;
  generationId: string;
  onChanged?: () => void;
}) {
  const def = defFor(component.type);
  const qc = useQueryClient();
  const regen = useServerFn(regenerateComponent);
  const [action, setAction] = useState<ComponentAction>(def.actions[0]);
  const [instruction, setInstruction] = useState("");

  const run = useMutation({
    mutationFn: () =>
      regen({ data: { componentId: component.id, action: action.id, instruction: instruction || undefined } }),
    onSuccess: async () => {
      setInstruction("");
      await qc.invalidateQueries({ queryKey: ["components", generationId] });
      await qc.invalidateQueries({ queryKey: ["my-credits"] });
      onChanged?.();
      onClose();
    },
    onError: (e) => showAlert({ title: "Couldn't redo that", body: errorText(e) }),
  });

  const label = def.shape === "image" ? (IMAGE_KIND_LABELS[component.key ?? ""] ?? "Photo") : def.label;

  return (
    <Drawer open={open} onOpenChange={(v) => !v && !run.isPending && onClose()}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Redo the {label.toLowerCase()}</DrawerTitle>
          <DrawerDescription>
            Only this part changes. Everything else on the page stays exactly as it is.
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 pb-4">
          <div className="flex flex-col gap-2">
            {def.actions.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAction(a)}
                className={`rounded-[12px] border px-4 py-3 text-left ${
                  action.id === a.id
                    ? "border-primary bg-primary/10"
                    : "border-[color:var(--line)] hover:bg-white/[0.03]"
                }`}
              >
                <p className="text-[15px] font-semibold text-ink">{a.label}</p>
                <p className="mt-0.5 text-[13px] text-muted">{a.outcome}</p>
              </button>
            ))}
          </div>

          <label className="mt-4 block text-[13px] font-medium text-muted" htmlFor={`instr-${component.id}`}>
            Anything specific? (optional)
          </label>
          <input
            id={`instr-${component.id}`}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            maxLength={200}
            placeholder={def.shape === "image" ? "e.g. show it on a wooden table" : "e.g. mention the 2-year warranty"}
            className="mt-1.5 min-h-[48px] w-full rounded-[12px] border border-[color:var(--line)] bg-white/[0.03] px-3 text-[15px] text-ink outline-none focus:border-primary"
          />

          <div className="mt-4 rounded-[12px] border border-[color:var(--line)] px-4 py-3">
            <p className="text-[14px] text-ink">
              This costs <span className="font-semibold">{def.cost} credits</span>.
            </p>
            <p className="mt-0.5 text-[13px] text-muted">
              If it fails, your credits come straight back and your current version stays.
            </p>
          </div>
        </div>

        <div className="border-t border-[color:var(--line)] p-4 pb-6">
          <button
            type="button"
            onClick={() => run.mutate()}
            disabled={run.isPending}
            className="flex h-[56px] w-full items-center justify-center gap-2 rounded-[12px] bg-primary text-[16px] font-semibold text-black disabled:opacity-60"
          >
            {run.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Working…
              </>
            ) : (
              <>
                {action.label} · {def.cost} credits
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={run.isPending}
            className="mt-2 h-[44px] w-full text-[14px] font-medium text-muted"
          >
            Cancel
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ============================================================
   HISTORY SHEET — put any earlier version back
   ============================================================ */

function HistorySheet({
  open,
  onClose,
  component,
  generationId,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  component: GenerationComponent;
  generationId: string;
  onChanged?: () => void;
}) {
  const def = defFor(component.type);
  const qc = useQueryClient();
  const load = useServerFn(listComponentVersions);
  const restoreFn = useServerFn(restoreComponentVersion);

  const { data, isLoading } = useQuery({
    queryKey: ["component-versions", component.id],
    queryFn: () => load({ data: { componentId: component.id } }),
    enabled: open,
  });

  const restore = useMutation({
    mutationFn: (versionId: string) => restoreFn({ data: { versionId } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["components", generationId] });
      await qc.invalidateQueries({ queryKey: ["component-versions", component.id] });
      onChanged?.();
      onClose();
    },
    onError: (e) => showAlert({ title: "Couldn't restore", body: errorText(e) }),
  });

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>Earlier versions</DrawerTitle>
          <DrawerDescription>
            The last 10 versions of this {def.label.toLowerCase()}. Putting one back is free.
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4 pb-6">
          {isLoading && <p className="text-[14px] text-muted">Loading…</p>}
          {!isLoading && (data ?? []).length === 0 && (
            <p className="text-[14px] text-muted">Nothing yet — this is the first version.</p>
          )}
          <div className="flex flex-col gap-3">
            {(data ?? []).map((v) => (
              <div key={v.id} className="rounded-[12px] border border-[color:var(--line)] p-3">
                <p className="text-[12px] text-muted">
                  {v.source === "seller" ? "Your edit" : "CowQ"} ·{" "}
                  {new Date(v.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </p>
                {def.shape === "image" ? (
                  v.content.url ? (
                    <img
                      src={v.content.url}
                      alt="Earlier version of this photo"
                      loading="lazy"
                      className="mt-2 aspect-square w-32 rounded-[10px] object-cover"
                    />
                  ) : null
                ) : (
                  <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-[14px] text-ink">
                    {contentToText(v.content, def.shape)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => restore.mutate(v.id)}
                  disabled={restore.isPending}
                  className="mt-2 flex min-h-[40px] items-center gap-1.5 text-[13px] font-semibold text-primary disabled:opacity-60"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Put this back
                </button>
              </div>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ============================================================
   PHOTOS — redo one shot without touching the rest
   ============================================================ */

export function PhotoActions({
  generationId,
  imageKind,
  onChanged,
}: {
  generationId: string;
  imageKind?: string;
  onChanged?: () => void;
}) {
  const { data } = useComponents(generationId, true);
  const [sheet, setSheet] = useState<"none" | "ai" | "history">("none");
  const component = (data ?? []).find((c) => c.type === "image" && c.key === imageKind);
  if (!component) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <SmallButton
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="Redo this photo"
          note={`${defFor("image").cost} credits`}
          accent
          onClick={() => setSheet("ai")}
        />
        {component.versionCount > 0 && (
          <SmallButton
            icon={<Clock className="h-3.5 w-3.5" />}
            label={`History (${component.versionCount})`}
            note="free"
            onClick={() => setSheet("history")}
          />
        )}
      </div>
      <AiSheet
        open={sheet === "ai"}
        onClose={() => setSheet("none")}
        component={component}
        generationId={generationId}
        onChanged={onChanged}
      />
      <HistorySheet
        open={sheet === "history"}
        onClose={() => setSheet("none")}
        component={component}
        generationId={generationId}
        onChanged={onChanged}
      />
    </>
  );
}
