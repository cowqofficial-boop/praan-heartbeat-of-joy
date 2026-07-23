import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, LibraryBig } from "lucide-react";
import { getBrowserId } from "@/lib/browser-id";
import { usePraanStore } from "@/lib/praan-store";
import { identifyProduct, uploadOriginal } from "@/lib/praan.functions";
import { hasUsedFreeGeneration, useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PRAAN — AI Product Photos & Listings for Indian Sellers" },
      {
        name: "description",
        content:
          "Upload one product photo. Get studio photos, sales copy, and a Shopify catalog file — ready to sell on Amazon, Flipkart, Meesho, Instagram, and WhatsApp.",
      },
      { property: "og:title", content: "PRAAN — AI Product Photos & Listings for Indian Sellers" },
      {
        property: "og:description",
        content:
          "Turn one phone photo into studio images, marketplace copy, and a catalog CSV in under a minute.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://praan-heartbeat-of-joy.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://praan-heartbeat-of-joy.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "PRAAN",
          url: "https://praan-heartbeat-of-joy.lovable.app/",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "PRAAN",
          url: "https://praan-heartbeat-of-joy.lovable.app/",
          logo: "https://praan-heartbeat-of-joy.lovable.app/icon-512.png",
        }),
      },
    ],
  }),
  component: Upload,
});

async function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function convertHeicIfNeeded(file: File): Promise<Blob> {
  const isHeic =
    /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (!isHeic) return file;
  const mod = await import("heic2any");
  const out = await mod.default({ blob: file, toType: "image/jpeg", quality: 0.9 });
  return Array.isArray(out) ? out[0] : out;
}

async function normalizeImage(file: File): Promise<{ dataUrl: string; sizeBytes: number }> {
  const blob = await convertHeicIfNeeded(file);
  const raw = await fileToDataUrl(blob);
  const { dataUrl } = await shrinkAndCompress(raw, 1600, 0.85);
  const sizeBytes = Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);
  return { dataUrl, sizeBytes };
}

function shrinkAndCompress(
  dataUrl: string,
  maxSide: number,
  quality: number,
): Promise<{ dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", quality) });
    };
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = dataUrl;
  });
}

function Upload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const setUpload = usePraanStore((s) => s.setUpload);
  const navigate = useNavigate();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user && hasUsedFreeGeneration()) {
      navigate({ to: "/auth", search: { mode: "signup", next: "/" }, replace: true });
    }
  }, [ready, user, navigate]);

  async function handleFile(file: File) {
    setError(null);
    setDetail(null);
    setShowDetail(false);
    setThumb(null);
    setBusy(true);
    try {
      const { dataUrl, sizeBytes } = await normalizeImage(file);
      if (sizeBytes > 5 * 1024 * 1024) {
        setError("That photo is over 5MB even after compressing. Try a smaller one.");
        setBusy(false);
        return;
      }
      setThumb(dataUrl);
      const browserId = getBrowserId();
      const { url } = await uploadOriginal({ data: { dataUrl, browserId } });
      const identified = await identifyProduct({ data: { imageUrl: url } });
      setUpload({ url, dataUrl, identified });
      navigate({ to: "/confirm" });
    } catch (e) {
      console.error(e);
      const raw = e instanceof Error ? e.message : String(e);
      const [human, tech] = raw.split("||DETAIL||").map((s) => s.trim());
      setError(human || "We couldn't read that photo. Try another one.");
      setDetail(tech || raw);
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5">
      {user && (
        <Link
          to="/library"
          className="absolute left-5 top-5 flex items-center gap-1.5 text-[14px] font-medium text-muted"
        >
          <LibraryBig className="h-4 w-4" />
          Your library
        </Link>
      )}

      <div className="w-full max-w-sm">
        <h1 className="font-display text-[44px] leading-[1.05] text-ink">
          PRAAN — AI Product Photos &amp; Listings
        </h1>
        <p className="mt-3 text-[15px] text-muted">
          One photo. Everything you need to sell it.
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-10 flex aspect-square w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-[12px] border-2 border-dashed border-[color:var(--color-border)] bg-surface text-ink transition-colors active:bg-[#eeeeeb] disabled:opacity-60"
        >
          {thumb ? (
            <img src={thumb} alt="Selected product" className="h-full w-full object-cover" />
          ) : (
            <>
              <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground">
                <Camera className="h-7 w-7" />
              </span>
              <span className="text-[17px] font-semibold">
                {busy ? "Reading your photo…" : "Add your product photo"}
              </span>
            </>
          )}
        </button>

        {busy && thumb && (
          <p className="mt-4 text-center text-[14px] text-muted">Reading your photo…</p>
        )}

        {error && (
          <div className="mt-4 text-center">
            <p className="text-[14px] text-primary">{error}</p>
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
                  <p className="mt-1 break-all text-left text-[11px] leading-snug text-muted">
                    {detail}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {!user && (
          <p className="mt-6 text-center text-[13px] text-muted">
            First product is free — no account needed.{" "}
            <Link to="/auth" search={{ mode: "signin" }} className="font-medium text-ink underline">
              Sign in
            </Link>
          </p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </main>
  );
}
