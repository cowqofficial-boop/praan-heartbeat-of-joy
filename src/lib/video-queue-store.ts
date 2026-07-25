import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VideoDuration, VideoRatio, VideoType } from "@/lib/video";

export type VideoJobStatus = "waiting" | "running" | "ready" | "refunded";

export type VideoJob = {
  id: string; // product_videos.id
  batchId: string;
  generationId: string;
  productName: string;
  videoType: VideoType;
  durationSec: VideoDuration;
  ratio: VideoRatio;
  status: VideoJobStatus;
  createdAt: number;
  videoUrl?: string;
  error?: string;
};

type VideoQueueState = {
  jobs: VideoJob[];
  enqueue: (jobs: Omit<VideoJob, "status" | "createdAt">[]) => void;
  update: (id: string, patch: Partial<VideoJob>) => void;
  remove: (id: string) => void;
  clearFinished: () => void;
};

export const useVideoQueue = create<VideoQueueState>()(
  persist(
    (set) => ({
      jobs: [],
      enqueue: (jobs) =>
        set((s) => ({
          jobs: [
            ...s.jobs,
            ...jobs.map((j) => ({ ...j, status: "waiting" as const, createdAt: Date.now() })),
          ],
        })),
      update: (id, patch) =>
        set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),
      remove: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),
      clearFinished: () =>
        set((s) => ({ jobs: s.jobs.filter((j) => j.status === "waiting" || j.status === "running") })),
    }),
    { name: "cowq-video-queue" },
  ),
);

export function videoQueueCounts(jobs: VideoJob[]) {
  return {
    busy: jobs.filter((j) => j.status === "waiting" || j.status === "running").length,
    ready: jobs.filter((j) => j.status === "ready").length,
    failed: jobs.filter((j) => j.status === "refunded").length,
  };
}
