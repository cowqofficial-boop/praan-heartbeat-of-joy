import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, LibraryBig, Plus, X } from "lucide-react";
import { getBrowserId } from "@/lib/browser-id";
import { usePraanStore, type PraanPhoto } from "@/lib/praan-store";
import { identifyProduct, uploadOriginal } from "@/lib/praan.functions";
import { hasUsedFreeGeneration, useAuth } from "@/lib/use-auth";
import { PrimaryButton } from "@/components/PrimaryButton";

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

const MAX_PHOTOS = 5;

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

type LocalPhoto = {
  id: string;
  dataUrl: string;
  url: string | null; // null while uploading
  uploading: boolean;
  error?: string;
};

function Upload() {
  const mainInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const setUpload = usePraanStore((s) => s.setUpload);
  const navigate = useNavigate();
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;
    if (!user && hasUsedFreeGeneration()) {
      navigate({ to: "/auth", search: { mode: "signup", next: "/" }, replace: true });
    }
  }, [ready, user, navigate]);

  async function ingestFile(file: File): Promise<LocalPhoto | null> {
    try {
      const { dataUrl, sizeBytes } = await normalizeImage(file);
      if (sizeBytes > 5 * 1024 * 1024) {
        setError("A photo is over 5MB even after compressing. Try a smaller one.");
        return null;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const photo: LocalPhoto = { id, dataUrl, url: null, uploading: true };
      // Kick off upload in background.
      const browserId = getBrowserId();
      uploadOriginal({ data: { dataUrl, browserId } })
        .then(({ url }) => {
          setPhotos((cur) => cur.map((p) => (p.id === id ? { ...p, url, uploading: false } : p)));
        })
        .catch((e) => {
          const raw = e instanceof Error ? e.message : String(e);
          setPhotos((cur) =>
            cur.map((p) => (p.id === id ? { ...p, uploading: false, error: raw } : p)),
          );
        });
      return photo;
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setError("We couldn't read that photo. Try another one.");
      setDetail(raw);
      return null;
    }
  }

  async function handleFiles(files: FileList | File[]) {
    setError(null);
    setDetail(null);
    setShowDetail(false);
    const arr = Array.from(files);
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return;
    const take = arr.slice(0, room);
    const added: LocalPhoto[] = [];
    for (const f of take) {
      const p = await ingestFile(f);
      if (p) added.push(p);
    }
    if (added.length) setPhotos((cur) => [...cur, ...added]);
  }

  function removePhoto(id: string) {
    setPhotos((cur) => cur.filter((p) => p.id !== id));
  }

  function makeMain(id: string) {
    setPhotos((cur) => {
      const idx = cur.findIndex((p) => p.id === id);
      if (idx <= 0) return cur;
      const next = cur.slice();
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  }

  async function handleContinue() {
    if (photos.length === 0) return;
    if (photos.some((p) => p.uploading)) return;
    const failed = photos.find((p) => !p.url);
    if (failed) {
      setError("One photo didn't upload. Remove it and try again.");
      setDetail(failed.error ?? null);
      return;
    }
    setBusy(true);
    setError(null);
    setDetail(null);
    try {
      const urls = photos.map((p) => p.url!) ;
      const identified = await identifyProduct({ data: { imageUrls: urls } });
      const storePhotos: PraanPhoto[] = photos.map((p) => ({ url: p.url!, dataUrl: p.dataUrl }));
      setUpload({ photos: storePhotos, identified });
      navigate({ to: "/confirm" });
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const [human, tech] = raw.split("||DETAIL||").map((s) => s.trim());
      setError(human || "We couldn't read your photos. Try again.");
      setDetail(tech || raw);
      setBusy(false);
    }
  }

  const anyUploading = photos.some((p) => p.uploading);
  const canContinue = photos.length > 0 && !anyUploading && !busy && photos.every((p) => p.url);

  return (
    <main className="flex min-h-screen flex-col items-center px-5 pb-28 pt-16">
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
        <h1 className="font-display text-[32px] leading-[1.05] text-ink">
          One photo. Everything you need to sell it.
        </h1>
        <p className="mt-3 text-[15px] text-muted">
          Studio photos, listing, and a catalog file — from your phone.
        </p>

        {photos.length === 0 ? (
          <button
            type="button"
            onClick={() => mainInputRef.current?.click()}
            className="mt-8 flex aspect-square w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-[14px] bg-surface text-ink transition-colors active:bg-[#eeeeeb]"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground">
              <Camera className="h-7 w-7" />
            </span>
            <span className="text-[17px] font-semibold">Add a product photo</span>
          </button>
        ) : (
          <>
            <div className="mt-8 overflow-hidden rounded-[12px] bg-surface">
              <img
                src={photos[0].dataUrl}
                alt="Main product"
                className="aspect-square w-full object-cover"
              />
            </div>

            <div className="mt-4 grid grid-cols-5 gap-2">
              {photos.map((p, i) => (
                <div key={p.id} className="relative">
                  <button
                    type="button"
                    onClick={() => makeMain(p.id)}
                    className={`block aspect-square w-full overflow-hidden rounded-[10px] border-2 ${
                      i === 0 ? "border-primary" : "border-transparent"
                    } bg-surface`}
                    aria-label={i === 0 ? "Main photo" : "Set as main photo"}
                  >
                    <img src={p.dataUrl} alt="" className="h-full w-full object-cover" />
                    {p.uploading && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-[10px] font-medium text-white">
                        …
                      </span>
                    )}
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 bg-primary py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">
                      Main
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    aria-label="Remove photo"
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-white shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <button
                  type="button"
                  onClick={() => addInputRef.current?.click()}
                  aria-label="Add another photo"
                  className="grid aspect-square w-full place-items-center rounded-[10px] border-2 border-dashed border-[color:var(--color-border)] bg-surface text-muted"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>

            <p className="mt-3 text-[13px] text-muted">
              More angles make better photos — try the back, a close-up, and the label.
            </p>
          </>
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

        {!user && photos.length === 0 && (
          <p className="mt-6 text-center text-[13px] text-muted">
            First product is free — no account needed.{" "}
            <Link to="/auth" search={{ mode: "signin" }} className="font-medium text-ink underline">
              Sign in
            </Link>
          </p>
        )}
      </div>

      {photos.length > 0 && (
        <PrimaryButton fixed disabled={!canContinue} onClick={handleContinue}>
          {busy
            ? "Reading your photos…"
            : anyUploading
              ? "Uploading…"
              : user
                ? "Make my photos — 90 credits"
                : "Make my photos"}
        </PrimaryButton>
      )}

      <input
        ref={mainInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files;
          if (f && f.length) handleFiles(f);
          e.currentTarget.value = "";
        }}
      />
      <input
        ref={addInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files;
          if (f && f.length) handleFiles(f);
          e.currentTarget.value = "";
        }}
      />
    </main>
  );
}
