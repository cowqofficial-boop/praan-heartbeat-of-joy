import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Identified } from "@/lib/cowq-store";

export const MAX_QUEUE = 3;

export type QueueStatus = "waiting" | "running" | "ready" | "error";

export type QueueItem = {
  id: string;
  status: QueueStatus;
  createdAt: number;
  productName: string;
  price: string;
  detail: string;
  imageUrls: string[]; // uploaded storage URLs; imageUrls[0] doubles as thumbnail
  identified: Identified;
  cost: number;
  // runtime state
  jobId?: string;
  resultId?: string;
  photoProgress?: { done: number; total: number };
  activeStep?: 0 | 1 | 2;
  error?: string;
  finishedAt?: number;
};

type QueueState = {
  items: QueueItem[];
  enqueue: (item: Omit<QueueItem, "id" | "status" | "createdAt">) => string;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<QueueItem>) => void;
  clearFinished: () => void;
  reset: () => void;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set) => ({
      items: [],
      enqueue: (item) => {
        const id = uid();
        set((s) => ({
          items: [
            ...s.items,
            { ...item, id, status: "waiting", createdAt: Date.now() },
          ],
        }));
        return id;
      },
      remove: (id) =>
        set((s) => ({
          items: s.items.filter((i) => i.id !== id || i.status === "running"),
        })),
      update: (id, patch) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),
      clearFinished: () =>
        set((s) => ({
          items: s.items.filter((i) => i.status === "waiting" || i.status === "running"),
        })),
      reset: () => set({ items: [] }),
    }),
    {
      name: "cowq:queue:v1",
      version: 1,
      // On rehydration, any "running" item is stale (nav/refresh interrupted).
      // Kick it back to waiting so the runner can restart it (or the user can remove it).
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.items = state.items.map((i) =>
          i.status === "running"
            ? { ...i, status: "waiting", jobId: undefined, photoProgress: undefined, activeStep: undefined }
            : i,
        );
      },
    },
  ),
);

export function queueCounts(items: QueueItem[]) {
  return {
    running: items.filter((i) => i.status === "running").length,
    waiting: items.filter((i) => i.status === "waiting").length,
    ready: items.filter((i) => i.status === "ready").length,
    error: items.filter((i) => i.status === "error").length,
    active: items.filter((i) => i.status === "running" || i.status === "waiting").length,
  };
}
