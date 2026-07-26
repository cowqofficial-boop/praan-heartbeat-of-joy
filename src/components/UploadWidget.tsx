import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Plus, X } from "lucide-react";
import { getBrowserId } from "@/lib/browser-id";
import { useCowqStore, type CowqPhoto } from "@/lib/cowq-store";
import { createUploadTicket, identifyProduct, signUploadedOriginal } from "@/lib/cowq.functions";
import { useAuth } from "@/lib/use-auth";
import { PrimaryButton } from "@/components/PrimaryButton";

const MAX_PHOTOS = 5;

async function convertHeicIfNeeded(file: File): Promise<Blob> {
  const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (!isHeic) return file;
  const mod = await import("heic2any");
  const out = await mod.default({ blob: file, toType: "image/jpeg", quality: 0.9 });
  return Array.isArray(out) ? out[0] : out;
}

/** Decode + resize + compress entirely off the main upload path. */
async function shrinkToJpeg(blob: Blob, maxSide: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not compress image"))),
      "image/jpeg",
      quality,
    );
  });
}

function blobToObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/** PUT straight to storage with real upload progress. */
function putWithProgress(url: string, blob: Blob, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", blob.type || "image/jpeg");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`upload failed (${xhr.status}): ${xhr.responseText?.slice(0, 200)}`));
    xhr.onerror = () => reject(new Error("Network error while uploading"));
    xhr.send(blob);
  });
}

type LocalPhoto = {
  id: string;
  dataUrl: string;
  url: string | null;
  uploading: boolean;
  progress: number;
  error?: string;
};

export function UploadWidget({ compact = false }: { compact?: boolean }) {
  const mainInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<LocalPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const setUpload = useCowqStore((s) => s.setUpload);
  const navigate = useNavigate();
  const { user } = useAuth();

  async function ingestFile(file: File): Promise<LocalPhoto | null> {
    try {
      const converted = await convertHeicIfNeeded(file);
      const compressed = await shrinkToJpeg(converted, 1600, 0.85);
      if (compressed.size > 5 * 1024 * 1024) {
        setError("A photo is over 5MB even after compressing. Try a smaller one.");
        return null;
      }
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const photo: LocalPhoto = {
        id,
        dataUrl: blobToObjectUrl(compressed),
        url: null,
        uploading: true,
        progress: 0,
      };
      const browserId = getBrowserId();

      void (async () => {
        try {
          const ticket = await createUploadTicket({ data: { browserId, ext: "jpg" } });
          const base = import.meta.env.VITE_SUPABASE_URL as string;
          const putUrl = `${base}/storage/v1/object/upload/sign/${ticket.bucket}/${ticket.path}?token=${encodeURIComponent(ticket.token)}`;
          await putWithProgress(putUrl, compressed, (pct) =>
            setPhotos((cur) => cur.map((p) => (p.id === id ? { ...p, progress: pct } : p))),
          );
          const { url } = await signUploadedOriginal({ data: { path: ticket.path } });
          setPhotos((cur) =>
            cur.map((p) => (p.id === id ? { ...p, url, uploading: false, progress: 100 } : p)),
          );
        } catch (e) {
          const raw = e instanceof Error ? e.message : String(e);
          setPhotos((cur) =>
            cur.map((p) => (p.id === id ? { ...p, uploading: false, error: raw } : p)),
          );
        }
      })();

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
      const urls = photos.map((p) => p.url!);
      const identified = await identifyProduct({ data: { imageUrls: urls } });
      const storePhotos: CowqPhoto[] = photos.map((p) => ({ url: p.url!, dataUrl: p.dataUrl }));
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
    <div className="w-full">
      {photos.length === 0 ? (
        <button
          type="button"
          onClick={() => mainInputRef.current?.click()}
          className={`flex w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-[16px] bg-surface text-ink ${
            compact ? "aspect-[4/3]" : "aspect-square lg:aspect-[3/2]"
          }`}
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground lg:h-20 lg:w-20">
            <Camera className="h-7 w-7 lg:h-8 lg:w-8" />
          </span>
          <span className="text-[17px] font-semibold lg:text-[19px]">Add a product photo</span>
          <span className="text-[13px] text-muted lg:text-[14px]">
            Tap to open camera or pick from your phone
          </span>
        </button>
      ) : (
        <>
          <div className="overflow-hidden rounded-[16px] bg-surface">
            <img
              src={photos[0].dataUrl}
              alt="Main photo"
              className="aspect-square w-full object-cover img-warm"
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar stagger">
            {photos.map((p, i) => (
              <div key={p.id} className="stagger-item relative shrink-0">
                <button
                  type="button"
                  onClick={() => makeMain(p.id)}
                  className={`block h-16 w-16 overflow-hidden rounded-[12px] ${
                    i === 0 ? "ring-2 ring-primary" : ""
                  } bg-surface`}
                  aria-label={i === 0 ? "Main photo" : "Make this the main photo"}
                >
                  <img src={p.dataUrl} alt="" className="h-full w-full object-cover" />
                  {p.uploading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-background/50 text-[10px] font-medium text-ink">
                      …
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => removePhoto(p.id)}
                  aria-label="Remove photo"
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-background shadow"
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
                className="stagger-item grid h-16 w-16 shrink-0 place-items-center rounded-[12px] bg-surface text-muted"
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
        <p className="mt-4 text-center text-[13px] text-muted">
          Your first product is free — no account needed.{" "}
          <Link to="/auth" search={{ mode: "signup" }} className="font-medium text-ink underline">
            Sign up
          </Link>{" "}
          and get 3 more.
        </p>
      )}

      {photos.length > 0 && (
        <div className="mt-6">
          <PrimaryButton disabled={!canContinue} onClick={handleContinue}>
            {busy
              ? "Reading your photos…"
              : anyUploading
                ? "Uploading…"
                : user
                  ? "Make my photos — 90 credits"
                  : "Make my photos"}
          </PrimaryButton>
        </div>
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
    </div>
  );
}
