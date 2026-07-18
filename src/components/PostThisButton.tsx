import { useState } from "react";
import { toast } from "sonner";
import { Check, Facebook, Instagram, MessageCircle, Send, Share2 } from "lucide-react";
import { watermarkImageUrl } from "@/lib/watermark";

type Destination = "instagram" | "whatsapp" | "facebook";

const DEST_LABEL: Record<Destination, string> = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
};

const DEST_ICON: Record<Destination, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  facebook: <Facebook className="h-4 w-4" />,
};

// Fallback deep-links / web intents when file sharing isn't supported.
// Instagram has no public web share intent, so we send the user to the app
// (mobile) or the site (desktop) after the image is downloaded + caption copied.
function fallbackOpenUrl(dest: Destination, caption: string): string {
  const enc = encodeURIComponent(caption);
  if (dest === "whatsapp") return `https://wa.me/?text=${enc}`;
  if (dest === "facebook") return `https://www.facebook.com/`;
  return "https://www.instagram.com/";
}

async function fetchAsFile(url: string, filename: string, watermark: boolean): Promise<File> {
  const blob: Blob = watermark
    ? await watermarkImageUrl(url)
    : await (await fetch(url)).blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Props = {
  imageUrl: string | null | undefined;
  caption: string;
  productName?: string;
  watermark?: boolean;
  filenameHint?: string;
  onPosted?: () => void;
  /** Compact = smaller button, e.g. inside a modal grid. */
  compact?: boolean;
};

/**
 * Post this — one-tap native share (Web Share API with image file).
 * - Lets the user pick Instagram / WhatsApp / Facebook first.
 * - Falls back to "copy caption + download image + open app" on browsers
 *   without file sharing.
 * - After sharing, offers a "Did you post it?" confirmation which triggers
 *   `onPosted` on "Yes" (used by the calendar to mark the day complete).
 */
export function PostThisButton({
  imageUrl,
  caption,
  productName,
  watermark = false,
  filenameHint,
  onPosted,
  compact = false,
}: Props) {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [askPosted, setAskPosted] = useState(false);
  const [busy, setBusy] = useState<Destination | null>(null);

  async function share(dest: Destination) {
    if (!imageUrl) {
      toast.error("Image isn't ready yet.");
      return;
    }
    setBusy(dest);
    try {
      const filename = `${(filenameHint || productName || "praan").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`;
      const file = await fetchAsFile(imageUrl, filename, watermark);
      const nav = navigator as Navigator & {
        share?: (d: ShareData) => Promise<void>;
        canShare?: (d: ShareData) => boolean;
      };

      const shareData: ShareData = { files: [file], text: caption, title: productName ?? "PRAAN" };

      if (nav.share && nav.canShare && nav.canShare(shareData)) {
        try {
          await nav.share(shareData);
          setChooserOpen(false);
          setAskPosted(true);
          return;
        } catch (e) {
          // User cancelled the share sheet — don't fall through to the noisy fallback.
          const err = e as { name?: string };
          if (err?.name === "AbortError") {
            setBusy(null);
            return;
          }
          // Other errors — fall through to the manual path.
        }
      }

      // Fallback: copy caption, save image, open the destination app.
      try {
        await navigator.clipboard.writeText(caption);
      } catch {
        /* clipboard denied — user still gets the image */
      }
      downloadFile(file);
      toast.success("Caption copied. Image saved.", {
        description: `Opening ${DEST_LABEL[dest]}…`,
      });
      // Open in a new tab so we don't lose the results page.
      window.open(fallbackOpenUrl(dest, caption), "_blank", "noopener");
      setChooserOpen(false);
      setAskPosted(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {!chooserOpen && !askPosted && (
        <button
          type="button"
          onClick={() => setChooserOpen(true)}
          className={`flex w-full items-center justify-center gap-2 rounded-[12px] bg-primary font-semibold text-primary-foreground ${
            compact ? "h-11 text-[14px]" : "h-14 text-[16px]"
          }`}
        >
          <Send className="h-4 w-4" />
          Post this
        </button>
      )}

      {chooserOpen && !askPosted && (
        <div className="rounded-[12px] border border-[color:var(--color-border)] bg-white p-3">
          <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
            <Share2 className="h-4 w-4 text-muted" />
            Where to?
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["instagram", "whatsapp", "facebook"] as Destination[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => share(d)}
                disabled={busy !== null}
                className="flex h-11 flex-col items-center justify-center gap-1 rounded-[10px] border border-[color:var(--color-border)] bg-white text-[12px] font-medium text-ink disabled:opacity-50"
              >
                <span className="flex items-center gap-1">
                  {DEST_ICON[d]}
                  <span>{DEST_LABEL[d]}</span>
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setChooserOpen(false)}
            className="mt-2 h-9 w-full text-[13px] font-medium text-muted"
          >
            Cancel
          </button>
        </div>
      )}

      {askPosted && (
        <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[#FFF6EC] p-3">
          <p className="text-[14px] font-medium text-ink">Did you post it?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onPosted?.();
                setAskPosted(false);
                toast.success("Nice — marked as posted.");
              }}
              className="flex h-11 items-center justify-center gap-1 rounded-[10px] bg-primary text-[14px] font-semibold text-primary-foreground"
            >
              <Check className="h-4 w-4" />
              Yes, posted
            </button>
            <button
              type="button"
              onClick={() => setAskPosted(false)}
              className="h-11 rounded-[10px] border border-[color:var(--color-border)] bg-white text-[14px] font-medium text-ink"
            >
              Not yet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
