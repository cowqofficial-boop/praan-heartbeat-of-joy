import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useVideoQueue, type VideoJob } from "@/lib/video-queue-store";
import { runVideoJob } from "@/lib/video.functions";
import { useAuth } from "@/lib/use-auth";

/**
 * Background video runner. Mount once at the root.
 * Runs one shape at a time so a three-ratio batch doesn't hammer the provider.
 * The seller can navigate away — jobs keep going and the pill reports back.
 */
export function VideoRunner() {
  const jobs = useVideoQueue((s) => s.jobs);
  const update = useVideoQueue((s) => s.update);
  const run = useServerFn(runVideoJob);
  const { user } = useAuth();
  const qc = useQueryClient();
  const busyRef = useRef(false);

  useEffect(() => {
    if (!user || busyRef.current) return;
    if (jobs.some((j) => j.status === "running")) return;
    const next = jobs.find((j) => j.status === "waiting");
    if (!next) return;

    busyRef.current = true;
    void go(next).finally(() => {
      busyRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, user]);

  async function go(job: VideoJob) {
    update(job.id, { status: "running" });
    try {
      const res = await run({ data: { videoId: job.id } });
      if (res.status === "ready") {
        update(job.id, { status: "ready", videoUrl: "videoUrl" in res ? res.videoUrl : undefined });
      } else {
        update(job.id, {
          status: "refunded",
          error:
            ("error" in res && res.error) ||
            "That one didn't work — your credits are back. Try again.",
        });
      }
    } catch (err) {
      update(job.id, {
        status: "refunded",
        error:
          err instanceof Error && err.message.includes("VIDEO_DISABLED")
            ? "Video isn't switched on yet."
            : "That one didn't work — your credits are back. Try again.",
      });
    } finally {
      void qc.invalidateQueries({ queryKey: ["product-videos", job.generationId] });
      void qc.invalidateQueries({ queryKey: ["my-credits"] });
    }
  }

  return null;
}
