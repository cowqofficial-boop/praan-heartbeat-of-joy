import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { getBrowserId } from "@/lib/browser-id";
import { usePraanStore } from "@/lib/praan-store";
import { identifyProduct, uploadOriginal } from "@/lib/praan.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PRAAN — one photo, everything you need to sell it" },
      {
        name: "description",
        content:
          "Upload one product photo. Get studio photos, sales copy, and a catalog file — ready to sell on Amazon, Flipkart, Meesho, Instagram, and WhatsApp.",
      },
    ],
  }),
  component: Upload,
});

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function shrinkImage(dataUrl: string, maxSide = 1600): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      if (scale === 1) return resolve(dataUrl);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function Upload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUpload = usePraanStore((s) => s.setUpload);
  const navigate = useNavigate();

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const raw = await fileToDataUrl(file);
      const dataUrl = await shrinkImage(raw);
      const browserId = getBrowserId();
      const { url } = await uploadOriginal({ data: { dataUrl, browserId } });
      const identified = await identifyProduct({ data: { imageUrl: url } });
      setUpload({ url, dataUrl, identified });
      navigate({ to: "/confirm" });
    } catch (e) {
      console.error(e);
      setError("We couldn't read that photo. Try another one.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-[44px] leading-[1.05] text-ink">PRAAN</h1>
        <p className="mt-3 text-[15px] text-muted">
          One photo. Everything you need to sell it.
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-10 flex aspect-square w-full flex-col items-center justify-center gap-4 rounded-[12px] border-2 border-dashed border-[color:var(--color-border)] bg-surface text-ink transition-colors active:bg-[#eeeeeb] disabled:opacity-60"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground">
            <Camera className="h-7 w-7" />
          </span>
          <span className="text-[17px] font-semibold">
            {busy ? "Reading your photo…" : "Add your product photo"}
          </span>
        </button>

        {error && (
          <p className="mt-4 text-center text-[14px] text-primary">{error}</p>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
    </div>
  );
}
