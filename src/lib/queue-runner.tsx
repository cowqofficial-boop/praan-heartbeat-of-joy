import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueueStore, type QueueItem } from "@/lib/queue-store";
import { getBrowserId } from "@/lib/browser-id";
import { useAuth, markFreeGenerationUsed } from "@/lib/use-auth";
import {
  generateCopyAndSave,
  generateImageForJob,
  refundGenerationJob,
  startGenerationJob,
} from "@/lib/cowq.functions";

const TIMEOUT_MS = 180_000;
const TIMEOUT_MESSAGE =
  "This is taking longer than it should. Your credits have been returned — try again.";

/**
 * Background queue runner. Mount once at the root.
 * Processes queued products strictly one-at-a-time so we never hit Gemini rate limits.
 */
export function QueueRunner() {
  const items = useQueueStore((s) => s.items);
  const update = useQueueStore((s) => s.update);
  const { user } = useAuth();
  const startJob = useServerFn(startGenerationJob);
  const makePhoto = useServerFn(generateImageForJob);
  const writeAndSave = useServerFn(generateCopyAndSave);
  const refundJob = useServerFn(refundGenerationJob);
  const runningRef = useRef(false);

  useEffect(() => {
    if (runningRef.current) return;
    const running = items.find((i) => i.status === "running");
    if (running) return;
    const next = items.find((i) => i.status === "waiting");
    if (!next) return;

    runningRef.current = true;
    void run(next).finally(() => {
      runningRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  async function run(item: QueueItem) {
    const browserId = getBrowserId();
    const userId = user?.id ?? null;
    update(item.id, { status: "running", activeStep: 0, photoProgress: { done: 0, total: 4 } });
    let jobId: string | null = null;
    const deadline = Date.now() + TIMEOUT_MS;
    try {
      const job = await startJob({ data: { browserId, userId } });
      jobId = job.jobId;
      update(item.id, { jobId: job.jobId, activeStep: 1 });

      const photoJobs = Array.from({ length: 4 }, (_, styleIndex) =>
        makePhoto({
          data: {
            jobId: job.jobId,
            browserId,
            userId,
            imageUrls: item.imageUrls,
            productName: item.productName,
            category: item.identified.category,
            needsPerson: (item.identified as { needs_person?: boolean }).needs_person ?? false,
            isKidswear: (item.identified as { is_kidswear?: boolean }).is_kidswear ?? false,
            isDrapedGarment:
              (item.identified as { is_draped_garment?: boolean }).is_draped_garment ?? false,
            styleIndex,
          },
        }).then((result) => {
          const cur = useQueueStore.getState().items.find((i) => i.id === item.id);
          const done = Math.min((cur?.photoProgress?.done ?? 0) + 1, 4);
          update(item.id, { photoProgress: { done, total: 4 } });
          return result;
        }),
      );

      const settled = await withTimeout(
        Promise.allSettled(photoJobs),
        timeLeft(deadline),
        TIMEOUT_MESSAGE,
      );
      const photoResults = settled.flatMap((r) =>
        r.status === "fulfilled" ? [r.value] : [],
      );
      if (photoResults.length === 0) {
        const first = settled.find((r) => r.status === "rejected") as
          | PromiseRejectedResult
          | undefined;
        const msg =
          first?.reason instanceof Error
            ? first.reason.message
            : String(first?.reason ?? "No photos came through. Try again.");
        throw new Error(msg);
      }
      const images = photoResults.flatMap((r) => r.images);
      const meta = {
        image_model: photoResults[0]?.meta.image_model,
        image_count: photoResults.length,
        image_resolution: photoResults[0]?.meta.image_resolution,
        input_photo_count: photoResults[0]?.meta.input_photo_count,
        person_source: photoResults[0]?.meta.person_source,
      };

      update(item.id, {
        activeStep: 2,
        photoProgress: { done: photoResults.length, total: 4 },
      });

      const { id: resultId } = await withTimeout(
        writeAndSave({
          data: {
            jobId: job.jobId,
            browserId,
            userId,
            originalImageUrl: item.imageUrls[0]!,
            productName: item.productName,
            price: item.price,
            detail: item.detail,
            category: item.identified.category,
            material: item.identified.material,
            color: item.identified.color,
            features: item.identified.features,
            images,
            meta,
          },
        }),
        timeLeft(deadline),
        TIMEOUT_MESSAGE,
      );

      jobId = null;
      if (!user) markFreeGenerationUsed();
      update(item.id, {
        status: "ready",
        resultId,
        finishedAt: Date.now(),
        activeStep: 2,
      });
    } catch (e) {
      const raw = String((e as Error).message || e);
      const [human] = raw.split("||DETAIL||").map((s) => s.trim());
      const msg = human || raw;
      if (jobId) {
        try {
          await refundJob({ data: { jobId, browserId, reason: msg } });
        } catch (err) {
          console.error(err);
        }
      }
      update(item.id, { status: "error", error: msg, finishedAt: Date.now() });
    }
  }

  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  if (ms <= 0) return Promise.reject(new Error(message));
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (t) clearTimeout(t);
  });
}

function timeLeft(deadline: number) {
  return Math.max(deadline - Date.now(), 0);
}
