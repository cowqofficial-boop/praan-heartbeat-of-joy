import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCowqStore } from "@/lib/cowq-store";
import { useQueueStore, MAX_QUEUE, queueCounts } from "@/lib/queue-store";
import { PrimaryButton } from "@/components/PrimaryButton";
import { AuthModal } from "@/components/AuthModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { COSTS } from "@/lib/plans";
import { useAuth, hasUsedFreeGeneration } from "@/lib/use-auth";
import { getMyCredits } from "@/lib/billing.functions";

export const Route = createFileRoute("/confirm")({
  head: () => ({
    meta: [
      { title: "Confirm your product details — CowQ" },
      {
        name: "description",
        content:
          "Review the product name, price, and detail CowQ picked up from your photo before generating your marketplace listing.",
      },
      { property: "og:title", content: "Confirm your product details — CowQ" },
      {
        property: "og:description",
        content: "Review the product details CowQ detected before generating your listing.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/confirm` },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/confirm` }],
  }),
  component: Confirm,
});

function Confirm() {
  const navigate = useNavigate();
  const { photos, originalDataUrl, identified } = useCowqStore();
  const items = useQueueStore((s) => s.items);
  const enqueue = useQueueStore((s) => s.enqueue);
  const { user } = useAuth();
  const { data: credits } = useQuery({
    queryKey: ["my-credits"],
    queryFn: () => getMyCredits(),
    enabled: !!user,
    staleTime: 15_000,
  });

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [detail, setDetail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [freeUsed, setFreeUsed] = useState(false);
  const shouldResumeRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    setFreeUsed(hasUsedFreeGeneration());
  }, []);


  useEffect(() => {
    if (!identified || !originalDataUrl) {
      navigate({ to: "/", replace: true });
      return;
    }
    setName(identified.name);
    setDetail(identified.features?.[0] ?? identified.material ?? "");
  }, [identified, originalDataUrl, navigate]);

  const activeCount = useMemo(
    () => queueCounts(items).active,
    [items],
  );

  const cost = COSTS.product;

  const startGeneration = useCallback(() => {
    if (!identified) return;
    const imageUrls = (photos.length > 0 ? photos.map((p) => p.url) : []).filter(
      (u): u is string => Boolean(u),
    );
    if (imageUrls.length === 0) {
      setError("We lost your uploaded photo. Please upload again.");
      return;
    }
    enqueue({
      productName: name.trim(),
      price: price.trim(),
      detail: detail.trim(),
      imageUrls,
      identified,
      cost,
    });
    navigate({ to: "/generating" });
  }, [photos, name, price, detail, identified, cost, enqueue, navigate]);

  // After successful auth, resume the pending generation.
  useEffect(() => {
    if (user && shouldResumeRef.current) {
      shouldResumeRef.current = false;
      startGeneration();
    }
  }, [user, startGeneration]);

  if (!identified || !originalDataUrl) return null;

  const canSubmit = name.trim().length > 0 && price.trim().length > 0;

  function preflight(): { block?: string; needsAuth?: boolean } {
    if (activeCount >= MAX_QUEUE) {
      return { block: "3 is the most we'll do at once. One more slot opens as each finishes." };
    }
    if (!user) {
      if (activeCount > 0 || hasUsedFreeGeneration()) {
        return { needsAuth: true };
      }
      return {};
    }
    const have = credits?.total ?? null;
    if (have == null) return {};
    const needed = cost * (activeCount + 1);
    if (have < needed) {
      if (activeCount === 0) {
        return { block: `You have ${have} credits — you need ${cost} to make one product. Top up to keep going.` };
      }
      const canQueue = Math.floor(have / cost);
      return { block: `You have ${have} credits — enough for ${canQueue} more product${canQueue === 1 ? "" : "s"}. Top up to queue more.` };
    }
    return {};
  }


  const usedFree = mounted && !user && (activeCount > 0 || freeUsed);
  const buttonLabel = activeCount > 0
    ? `Add to queue — ${cost} credits`
    : user
      ? `Make my photos — ${cost} credits`
      : usedFree
        ? "Sign up to make my photos"
        : "Make my photos — free";

  return (
    <main className="flex min-h-screen flex-col px-5 pb-28 pt-8">
      <button
        type="button"
        onClick={() => navigate({ to: "/create" })}
        className="mb-4 -ml-1 inline-flex h-9 items-center gap-1.5 rounded-full pl-1 pr-3 text-[14px] font-medium text-muted hover:text-ink"
        aria-label="Back to upload"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <p className="text-[13px] font-medium uppercase tracking-wide text-muted">Check what CowQ found</p>
      <h1 className="mt-1 font-display text-[28px] leading-tight text-ink">
        Confirm your product details
      </h1>
      <p className="mt-1 text-[15px] text-muted">Fix anything wrong, then we'll make your photos.</p>

      <div className="mt-6 overflow-hidden rounded-[12px] bg-surface">
        <img
          src={originalDataUrl}
          alt="Your product"
          className="aspect-square w-full object-cover"
        />
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <Field htmlFor="product-name" label="Product name">
          <input
            id="product-name"
            className="h-12 w-full rounded-[12px] bg-raised px-4 text-[16px] text-ink"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Brass diya set"
          />
        </Field>
        <Field htmlFor="product-price" label="Price (₹)">
          <input
            id="product-price"
            inputMode="numeric"
            className="h-12 w-full rounded-[12px] bg-raised px-4 text-[16px] text-ink"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="499"
          />
        </Field>
        <Field htmlFor="product-detail" label="One detail worth knowing">
          <input
            id="product-detail"
            className="h-12 w-full rounded-[12px] bg-raised px-4 text-[16px] text-ink"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Handmade, cotton, 6-inch, etc."
          />
        </Field>
      </div>

      {activeCount > 0 && (
        <p className="mt-4 text-[13px] text-muted">
          {activeCount} product{activeCount === 1 ? "" : "s"} already in your queue. This one will start when they finish.
        </p>
      )}
      {usedFree && (
        <p className="mt-3 text-[13px] text-muted">
          You've used your free product.{" "}
          <button
            type="button"
            onClick={() => {
              console.log("[confirm] inline 'Sign up to make more' clicked");
              setAuthOpen(true);
            }}
            className="font-medium underline"
            style={{ color: "var(--color-primary)" }}
          >
            Sign up to make more
          </button>
          {" "}— your details are saved.
        </p>
      )}
      {error && <p className="mt-3 text-[14px] text-primary">{error}</p>}

      <PrimaryButton
        fixed
        disabled={!canSubmit}
        onClick={() => {
          console.log("[confirm] primary button clicked; usedFree=", usedFree);
          setError(null);
          const pf = preflight();
          if (pf.needsAuth) {
            console.log("[confirm] preflight needsAuth -> opening AuthModal");
            shouldResumeRef.current = true;
            setAuthOpen(true);
            return;
          }
          if (pf.block) {
            setError(pf.block);
            return;
          }
          startGeneration();
        }}
      >
        {buttonLabel}
      </PrimaryButton>

      <ErrorBoundary label="AuthModal">
      <AuthModal
        open={authOpen}
        onClose={() => {
          setAuthOpen(false);
          shouldResumeRef.current = false;
        }}
        onSuccess={() => {
          setAuthOpen(false);
        }}
      />
      </ErrorBoundary>
    </main>
  );
}

function Field({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[15px] font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}
