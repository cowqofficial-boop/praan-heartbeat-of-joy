import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Brain, Cookie, Download, FileJson, Trash2, TriangleAlert } from "lucide-react";
import {
  exportMyData,
  exportAiMemory,
  deleteMyAccount,
} from "@/lib/profile.functions";
import { showAlert, showConfirm, showPrompt } from "@/components/Dialogs";
import { COBALT, MAGENTA, AMBER } from "@/lib/page-accent";
import { GlassCard, SectionCard } from "@/components/profile/primitives";

export const Route = createFileRoute("/_authenticated/profile/privacy")({
  head: () => ({
    meta: [
      { title: "Data and privacy — CowQ" },
      { name: "description", content: "Download everything CowQ holds about your shop, or close your account for good." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacyTab,
});

function downloadJson(name: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function PrivacyTab() {
  const exportFn = useServerFn(exportMyData);
  const memoryFn = useServerFn(exportAiMemory);
  const deleteFn = useServerFn(deleteMyAccount);
  const [analytics, setAnalytics] = useState(true);

  const dataMut = useMutation({
    mutationFn: async () => exportFn({}),
    onSuccess: (d) => downloadJson(`cowq-my-data-${new Date().toISOString().slice(0, 10)}.json`, d),
    onError: (e) => showAlert({ title: "Could not export", body: (e as Error).message }),
  });

  const memoryMut = useMutation({
    mutationFn: async () => memoryFn({}),
    onSuccess: (d) => downloadJson(`cowq-ai-memory-${new Date().toISOString().slice(0, 10)}.json`, d),
    onError: (e) => showAlert({ title: "Could not export", body: (e as Error).message }),
  });

  const deleteMut = useMutation({
    mutationFn: async (confirm: string) => deleteFn({ data: { confirm } }),
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (e) => showAlert({ title: "Could not delete", body: (e as Error).message }),
  });

  async function startDelete() {
    const ok = await showConfirm({
      title: "Close your account for good?",
      body: "Every product, photo, saved model, stock record and setting is deleted. This cannot be undone, and credits are not refunded. Download your data first if you want to keep it.",
      confirmLabel: "Continue",
      destructive: true,
    });
    if (!ok) return;
    const typed = await showPrompt({
      title: "Type DELETE to confirm",
      body: "This is the last step. Nothing can be recovered afterwards.",
      label: "Confirmation",
      placeholder: "DELETE",
      confirmLabel: "Delete my account",
    });
    if (typed === null) return;
    if (typed.trim() !== "DELETE") {
      await showAlert({ title: "Not deleted", body: "You need to type DELETE exactly." });
      return;
    }
    deleteMut.mutate("DELETE");
  }

  const ghostBtn = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--line)",
  };

  return (
    <div className="grid gap-4">
      <SectionCard
        index={0}
        icon={FileJson}
        title="Take your data with you"
        description="One file with your profile, products, copy, stock, payments and settings. Yours to keep, whatever happens to CowQ."
        aside={
          <button
            type="button"
            onClick={() => dataMut.mutate()}
            disabled={dataMut.isPending}
            className="inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-[14px] font-semibold text-ink disabled:opacity-60"
            style={ghostBtn}
          >
            <Download className="h-4 w-4" /> {dataMut.isPending ? "Preparing…" : "Download"}
          </button>
        }
      />

      <SectionCard
        index={1}
        icon={Brain}
        title="What CowQ remembers"
        description="Your brand kit and model preferences — everything that shapes how your photos and words come out."
        aside={
          <button
            type="button"
            onClick={() => memoryMut.mutate()}
            disabled={memoryMut.isPending}
            className="inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-[14px] font-semibold text-ink disabled:opacity-60"
            style={ghostBtn}
          >
            <Download className="h-4 w-4" /> {memoryMut.isPending ? "Preparing…" : "Download"}
          </button>
        }
      />

      <SectionCard
        index={2}
        icon={Cookie}
        title="Cookies and tracking"
        description="CowQ uses one cookie to keep you signed in. That one can't be turned off — without it you'd be signed out on every page."
      >
        <label className="flex items-start justify-between gap-4 py-2">
          <span className="min-w-0">
            <span className="block text-[15px] text-ink">Anonymous usage stats</span>
            <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">
              Which pages get used, so we know what to fix. No names, no product data, never sold.
            </span>
          </span>
          <input
            type="checkbox"
            checked={analytics}
            onChange={(e) => setAnalytics(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0"
            style={{ accentColor: COBALT }}
          />
        </label>
        <p className="mt-2 text-[12px] text-muted">
          CowQ does not sell your data or share your product photos with anyone.
        </p>
      </SectionCard>

      <GlassCard tint={MAGENTA} hover={false} className="rise-in p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <TriangleAlert className="h-7 w-7 shrink-0" strokeWidth={1.6} style={{ color: MAGENTA }} />
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-ink">Close your account</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              This deletes your products, photos, saved models, stock records, connected shops and settings. It cannot be
              undone and unused credits are not refunded.{" "}
              <span style={{ color: AMBER }}>Download your data first.</span>
            </p>
            <button
              type="button"
              onClick={startDelete}
              disabled={deleteMut.isPending}
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold disabled:opacity-60"
              style={{
                color: MAGENTA,
                background: `color-mix(in oklab, ${MAGENTA} 14%, transparent)`,
                border: `1px solid color-mix(in oklab, ${MAGENTA} 38%, transparent)`,
              }}
            >
              <Trash2 className="h-4 w-4" /> {deleteMut.isPending ? "Deleting…" : "Delete my account"}
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
