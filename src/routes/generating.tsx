import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { usePraanStore } from "@/lib/praan-store";
import { getBrowserId } from "@/lib/browser-id";
import { generateCopyAndSave, generateImages } from "@/lib/praan.functions";
import { ProgressSteps, type StepState } from "@/components/ProgressSteps";
import { PrimaryButton } from "@/components/PrimaryButton";
import { markFreeGenerationUsed, useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/generating")({
  head: () => ({
    meta: [
      { title: "Making your listing — PRAAN" },
      {
        name: "description",
        content:
          "PRAAN is studying your product, shooting studio photos, and writing your marketplace listing. This usually takes under a minute.",
      },
      { property: "og:title", content: "Making your listing — PRAAN" },
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
  const { originalImageUrl, identified, form } = usePraanStore();
  const [states, setStates] = useState<StepState[]>(["done", "active", "pending"]);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

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
    setStates(["done", "active", "pending"]);
    const browserId = getBrowserId();
    try {
      const { images } = await generateImages({
        data: {
          browserId,
          userId: user?.id ?? null,
          imageUrl: originalImageUrl,
          productName: form.name,
          category: identified.category,
        },
      });
      setStates(["done", "done", "active"]);
      const { id } = await generateCopyAndSave({
        data: {
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
        },
      });
      setStates(["done", "done", "done"]);
      if (!user) markFreeGenerationUsed();
      navigate({ to: "/results/$id", params: { id } });
    } catch (e) {
      console.error(e);
      const msg = String((e as Error).message || e);
      if (msg.includes("DAILY_LIMIT")) {
        setError("You've used today's 5 free products. Come back tomorrow.");
      } else if (msg.includes("image gen") || msg.includes("photos")) {
        setError("The photos didn't come through. Try again.");
      } else if (msg.includes("copy") || msg.includes("Listing")) {
        setError("The listing text didn't come through. Try again.");
      } else {
        setError("Something didn't work. Try again.");
      }
      setStates((s) => s.map((v) => (v === "active" ? "error" : v)) as StepState[]);
    }
  }

  return (
    <main className="flex min-h-screen flex-col px-5 pb-28 pt-16">
      <h1 className="font-display text-[28px] leading-tight text-ink">
        Making your listing.
      </h1>
      <p className="mt-1 text-[15px] text-muted">This takes under a minute.</p>

      <div className="mt-10">
        <ProgressSteps
          steps={[
            { label: "Studying your product", state: states[0] },
            { label: "Shooting studio photos", state: states[1] },
            { label: "Writing your listing", state: states[2] },
          ]}
        />
      </div>

      {error && (
        <>
          <p className="mt-8 text-[15px] text-primary">{error}</p>
          {!error.includes("today's 5") && (
            <PrimaryButton fixed onClick={run}>
              Try again
            </PrimaryButton>
          )}
          {error.includes("today's 5") && (
            <PrimaryButton fixed onClick={() => navigate({ to: "/" })}>
              Back to start
            </PrimaryButton>
          )}
        </>
      )}
    </main>
  );
}
