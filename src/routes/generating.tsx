import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { useCowqStore } from "@/lib/cowq-store";
import { getBrowserId } from "@/lib/browser-id";
import {
  generateCopyAndSave,
  generateImageForJob,
  refundGenerationJob,
  startGenerationJob,
} from "@/lib/cowq.functions";
import { ProgressSteps, type StepState } from "@/components/ProgressSteps";
import { PrimaryButton } from "@/components/PrimaryButton";
import { markFreeGenerationUsed, useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/generating")({
  head: () => ({
    meta: [
      { title: "Making your listing — CowQ Ai" },
      {
        name: "description",
        content:
          "CowQ Ai is studying your product, shooting studio photos, and writing your marketplace listing. This usually takes under a minute.",
      },
      { property: "og:title", content: "Making your listing — CowQ Ai" },
      {
        property: "og:description",
        content: "Studio photos, marketplace copy, and a catalog file are being prepared.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://praan-heartbeat-of-joy.lovable.app/generating" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://praan-heartbeat-of-joy.lovable.app/generating" }],
  }),
  component: Generating,
});

function Generating() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { photos, originalImageUrl, identified, form } = useCowqStore();
  const [states, setStates] = useState<StepState[]>(["done", "active", "pending"]);
  const [photoProgress, setPhotoProgress] = useState({ done: 0, total: 4 });
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const startedRef = useRef(false);
  const startJob = useServerFn(startGenerationJob);
  const makePhoto = useServerFn(generateImageForJob);
  const writeAndSave = useServerFn(generateCopyAndSave);
  const refundJob = useServerFn(refundGenerationJob);

  useEffect(() => {
    if (!originalImageUrl || !identified || !form) {
      navigate({ to: "/", replace: true });
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    if (!originalImageUrl || !identified || !form) return;
    setError(null);
    setDetail(null);
    setPhotoProgress({ done: 0, total: 4 });
    setStates(["done", "active", "pending"]);
    const browserId = getBrowserId();
    const imageUrls = (photos.length > 0 ? photos.map((p) => p.url) : [originalImageUrl]).filter(
      (u): u is string => Boolean(u),
    );
    let jobId: string | null = null;
    try {
      const idFlags = identified as { needs_person?: boolean; is_kidswear?: boolean; is_draped_garment?: boolean };
      const job = await startJob({ data: { browserId, userId: user?.id ?? null } });
      jobId = job.jobId;

      const photoJobs = Array.from({ length: 4 }, (_, styleIndex) =>
        makePhoto({
          data: {
            jobId: job.jobId,
            browserId,
            userId: user?.id ?? null,
            imageUrls,
            productName: form.name,
            category: identified.category,
            needsPerson: idFlags.needs_person ?? false,
            isKidswear: idFlags.is_kidswear ?? false,
            isDrapedGarment: idFlags.is_draped_garment ?? false,
            styleIndex,
          },
        }).then((result) => {
          setPhotoProgress((p) => ({ ...p, done: Math.min(p.done + 1, p.total) }));
          return result;
        }),
      );

      const settled = await withTimeout(
        Promise.allSettled(photoJobs),
        180_000,
        "This is taking longer than it should. Your credits have been returned — try again.",
      );
      const photoResults = settled.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      if (photoResults.length === 0) {
        const firstError = settled.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
        const message = firstError?.reason instanceof Error ? firstError.reason.message : String(firstError?.reason ?? "No photos came through. Try again.");
        throw new Error(message);
      }
      const images = photoResults.flatMap((result) => result.images);
      const meta = {
        image_model: photoResults[0]?.meta.image_model,
        image_count: photoResults.length,
        image_resolution: photoResults[0]?.meta.image_resolution,
        input_photo_count: photoResults[0]?.meta.input_photo_count,
        person_source: photoResults[0]?.meta.person_source,
      };

      setPhotoProgress((p) => ({ ...p, done: photoResults.length }));
      setStates(["done", "done", "active"]);
      const { id } = await withTimeout(writeAndSave({
        data: {
          jobId: job.jobId,
          browserId,
          userId: user?.id ?? null,
          originalImageUrl,
          productName: form.name,
          price: form.price,
          detail: form.detail,
          category: identified.category,
          material: identified.material,
          color: identified.color,
          features: identified.features,
          images,
          meta,
        },
      }), 180_000, "This is taking longer than it should. Your credits have been returned — try again.");
      setStates(["done", "done", "done"]);
      jobId = null;
      if (!user) markFreeGenerationUsed();
      navigate({ to: "/results/$id", params: { id } });

    } catch (e) {
      console.error(e);
      const raw = String((e as Error).message || e);
      const [human, tech] = raw.split("||DETAIL||").map((s) => s.trim());
      const msg = human || raw;
      setDetail(tech || raw);
      setShowDetail(false);
      if (jobId) {
        try {
          await refundJob({ data: { jobId, browserId, reason: msg } });
        } catch (refundError) {
          console.error(refundError);
        }
      }
      if (msg.includes("NO_CREDITS")) {
        setError("You've used your products for this month. Upgrade or top up to keep going.");
      } else if (msg.includes("DAILY_LIMIT")) {
        setError("You've used today's 5 free products. Come back tomorrow.");
      } else if (msg.includes("This is taking longer")) {
        setError("This is taking longer than it should. Your credits have been returned — try again.");
      } else {
        setError(msg);
      }
      setStates((s) => s.map((v) => (v === "active" ? "error" : v)) as StepState[]);
    }
  }

  const heroPhoto = photos[0]?.dataUrl ?? originalImageUrl ?? null;

  return (
    <main className="flex min-h-screen flex-col items-center px-5 pb-28 pt-12">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-[40px] leading-[1.02] text-ink sm:text-[48px]">
          Making your listing.
        </h1>
        <p className="mt-2 text-[15px] text-muted">This takes under a minute.</p>

        {heroPhoto && (
          <div className="mx-auto mt-10 w-[78%]">
            <div
              className="sweep-mask relative aspect-square overflow-hidden rounded-[16px] bg-surface"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)" }}
            >
              <img
                src={heroPhoto}
                alt="Your product"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ opacity: 0.55, filter: "saturate(0.85)" }}
                draggable={false}
              />
            </div>
          </div>
        )}

        <div className="mx-auto mt-10 max-w-[280px] text-left">
          <ProgressSteps
            steps={[
              { label: "Studying your product", state: states[0] },
              {
                label: "Shooting the photos",
                state: states[1],
                detail: states[1] === "active" ? `${photoProgress.done} of ${photoProgress.total} photos done` : null,
              },
              { label: "Writing your listing", state: states[2] },
            ]}
          />
        </div>
      </div>

      {error && (
        <div className="mt-8 w-full max-w-sm text-center">
          <p className="text-[15px] text-primary">{error}</p>
          {detail && (
            <>
              <button
                type="button"
                onClick={() => setShowDetail((v) => !v)}
                className="mt-1 text-[12px] text-muted underline"
              >
                {showDetail ? "Hide details" : "Details"}
              </button>
              {showDetail && (
                <p className="mt-1 break-all text-left text-[11px] leading-snug text-muted">{detail}</p>
              )}
            </>
          )}
          {error.includes("Upgrade") ? (
            <PrimaryButton fixed onClick={() => navigate({ to: "/pricing" })}>
              See plans
            </PrimaryButton>
          ) : error.includes("today's 5") ? (
            <PrimaryButton fixed onClick={() => navigate({ to: "/" })}>
              Back to start
            </PrimaryButton>
          ) : (
            <PrimaryButton fixed onClick={run}>
              Try again
            </PrimaryButton>
          )}
        </div>
      )}
    </main>
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

