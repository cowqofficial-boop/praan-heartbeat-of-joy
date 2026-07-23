import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Copy, Check, Download, FileText, Image as ImageIcon, Lock, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { PostThisButton } from "@/components/PostThisButton";
import JSZip from "jszip";
import { generateImages, getGeneration, submitFeedback } from "@/lib/cowq.functions";
import { getBrowserId } from "@/lib/browser-id";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { useAuth } from "@/lib/use-auth";
import { getMyCredits } from "@/lib/billing.functions";
import { watermarkImageUrl } from "@/lib/watermark";
import { showAlert } from "@/components/Dialogs";

export const Route = createFileRoute("/results/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Your listing is ready — CowQ" },
      { name: "description", content: "Studio product photos, marketplace copy, and a Shopify catalog CSV — ready to download and post." },
      { property: "og:title", content: "Your listing is ready — CowQ" },
      { property: "og:description", content: "Download studio photos, copy marketplace text, and export a Shopify CSV." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/results/${params.id}` },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [
      { rel: "canonical", href: `${SITE_URL}/results/${params.id}` },
    ],
  }),
  component: Results,
});

type GenImage = { kind: string; ratio: "1:1" | "9:16"; url: string };
type Copy = {
  seoTitle: string;
  description: string;
  bullets: string[];
  tags: string[];
  instagram: string;
  instagramHashtags: string[];
  whatsapp: string;
  festival: string;
};

function Results() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["gen", id],
    queryFn: () => getGeneration({ data: { id } }),
  });
  const { data: credits } = useQuery({
    queryKey: ["my-credits"],
    queryFn: () => getMyCredits(),
    enabled: !!user,
    staleTime: 30_000,
  });
  const watermark = !user || (credits?.features?.watermark ?? true);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <p className="text-[15px] text-muted">Loading…</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-5">
        <p className="text-[15px] text-muted">This listing isn't here.</p>
        <Link to="/create" className="text-primary underline">Start over</Link>
      </div>
    );
  }

  const images = (data.generated_images as GenImage[]) ?? [];
  const copy = data.copy as Copy;
  const original = data.original_image_url as string;
  const whiteAfter = images.find((i) => i.kind === "white" && i.ratio === "1:1")?.url ?? images[0]?.url;
  const personSource = ((data.gen_metadata as { person_source?: "ai" | "user" } | null)?.person_source) ?? "ai";
  const productName = (data.product_name as string) || "cowq";

  return (
    <main className="min-h-screen pb-16 pt-6 lg:pt-10">
      {/* Header */}
      <header className="px-6 lg:px-8">
        <p className="eyebrow">Ready</p>
        <h1 className="mt-2 page-headline lg:text-[56px]">Ready to sell.</h1>
        <p className="mt-2 text-[15px] text-muted">Tap a row to open it. Copy anything with one tap.</p>
      </header>

      {/* Two-column desktop layout: photos left (sticky), everything else right */}
      <div className="mt-8 grid grid-cols-1 gap-8 px-6 lg:mt-10 lg:grid-cols-[3fr_2fr] lg:gap-12 lg:px-8">
        {/* LEFT — the photos are the page */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <PhotosSection
            images={images}
            id={id}
            productName={productName}
            category={data.category as string}
            originalUrl={original}
            onDone={() => refetch()}
            hasAccount={!!user}
            watermark={watermark}
            personSource={personSource}
          />
          {/* Before / after on desktop only — mobile keeps it lower to avoid dominating */}
          {whiteAfter && (
            <div className="mt-6 hidden lg:block">
              <p className="eyebrow mb-3">See the change</p>
              <BeforeAfterSlider before={original} after={whiteAfter} />
            </div>
          )}
        </div>

        {/* RIGHT — actions, listing, feedback */}
        <div className="flex min-w-0 flex-col gap-8">
          {/* Primary actions: quiet trio, only Post this is Sindoor */}
          <ActionRow
            id={id}
            images={images}
            productName={productName}
            csvUrl={data.csv_url as string}
            whiteAfter={whiteAfter}
            caption={copy ? `${copy.instagram}\n\n${copy.instagramHashtags.join(" ")}` : ""}
            watermark={watermark}
            hasAccount={!!user}
          />

          {/* Collapsed listing: one panel, hairline rows, single-open accordion */}
          <ListingPanel copy={copy} />

          {/* Before/after mobile only */}
          {whiteAfter && (
            <div className="lg:hidden">
              <p className="eyebrow mb-3">See the change</p>
              <BeforeAfterSlider before={original} after={whiteAfter} />
            </div>
          )}

          {/* Sign-up gate for anon */}
          {!user && (
            <SignUpGate
              title="Sign up to save and download"
              body="Free forever. Keep this product in your library and download the ZIP plus catalog CSV."
              next={`/results/${id}`}
            />
          )}

          {/* Quiet feedback line */}
          <Feedback id={id} />

          <div className="pt-2 text-center">
            <button
              onClick={() => navigate({ to: user ? "/library" : "/" })}
              className="text-[13px] font-medium text-muted underline underline-offset-4"
            >
              {user ? "Back to your library" : "Start another product"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   PHOTOS
   ============================================================ */

function PhotosSection({
  images,
  id,
  productName,
  category,
  originalUrl,
  onDone,
  hasAccount,
  watermark,
  personSource,
}: {
  images: GenImage[];
  id: string;
  productName: string;
  category: string;
  originalUrl: string;
  onDone: () => void;
  hasAccount: boolean;
  watermark: boolean;
  personSource: "ai" | "user";
}) {
  const [ratio, setRatio] = useState<"1:1" | "9:16">("1:1");
  const filtered = images.filter((i) => i.ratio === ratio);
  const [active, setActive] = useState(0);
  const current = filtered[active] ?? filtered[0];

  // Reset active when ratio changes
  useEffect(() => setActive(0), [ratio]);

  async function handleDownload(img: GenImage) {
    try {
      let href = img.url;
      let revoke = false;
      if (watermark) {
        const blob = await watermarkImageUrl(img.url);
        href = URL.createObjectURL(blob);
        revoke = true;
      }
      const a = document.createElement("a");
      a.href = href;
      a.download = `cowq-${img.kind}-${img.ratio.replace(":", "x")}.png`;
      a.click();
      if (revoke) URL.revokeObjectURL(href);
    } catch {
      window.open(img.url, "_blank");
    }
  }

  const isOnModel = current?.kind.startsWith("onmodel");

  return (
    <section className="flex flex-col gap-3">
      {/* Quiet toggle */}
      <div className="flex items-center justify-between">
        <p className="eyebrow">Photos</p>
        <div className="inline-flex rounded-full bg-raised p-0.5 text-[12px] font-medium">
          {(["1:1", "9:16"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRatio(r)}
              className={`rounded-full px-3 py-1 ${
                ratio === r ? "bg-ink text-background" : "text-muted"
              }`}
            >
              {r === "1:1" ? "Square" : "Vertical"}
            </button>
          ))}
        </div>
      </div>

      {/* DESKTOP: main image + thumbnail strip */}
      <div className="hidden lg:block">
        <div
          className="group relative overflow-hidden rounded-[16px] bg-surface"
          style={{
            aspectRatio: ratio === "1:1" ? "1 / 1" : "9 / 16",
            maxHeight: "72vh",
            boxShadow: "var(--shadow-raised)",
          }}
        >
          {current && (
            <img
              key={current.url}
              src={current.url}
              alt={current.kind}
              className="h-full w-full object-contain img-warm"
            />
          )}
          {watermark && (
            <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
              Made with CowQ
            </span>
          )}
          {hasAccount && current && (
            <button
              type="button"
              onClick={() => handleDownload(current)}
              className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
              aria-label="Download photo"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Thumbnail strip */}
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          {filtered.map((img, i) => (
            <button
              key={`${img.kind}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={`relative shrink-0 overflow-hidden rounded-[10px] bg-surface transition-all ${
                i === active ? "ring-2 ring-marigold" : "opacity-70 hover:opacity-100"
              }`}
              style={{
                width: ratio === "1:1" ? 72 : 56,
                aspectRatio: ratio === "1:1" ? "1 / 1" : "9 / 16",
              }}
              aria-label={`Show ${img.kind}`}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>

        {isOnModel && (
          <p className="mt-3 text-[11px] leading-snug text-muted">
            {personSource === "user"
              ? "Your model. Check the fit before you list."
              : "AI-made model. Check the fit and drape before you list this."}
          </p>
        )}
      </div>

      {/* MOBILE: full-bleed swipeable carousel with dot indicator */}
      <div className="lg:hidden">
        <div
          className="relative -mx-6 w-screen"
          style={{ maxWidth: "100vw" }}
          onScroll={(e) => {
            const el = e.currentTarget;
            const w = el.clientWidth;
            const idx = Math.round(el.scrollLeft / w);
            if (idx !== active && filtered[idx]) setActive(idx);
          }}
          // let default overflow scroll — moved below to inner track
        >
          <MobileCarousel
            filtered={filtered}
            ratio={ratio}
            active={active}
            setActive={setActive}
            watermark={watermark}
            hasAccount={hasAccount}
            onDownload={handleDownload}
          />
        </div>
        {isOnModel && (
          <p className="mt-2 px-1 text-[11px] leading-snug text-muted">
            {personSource === "user"
              ? "Your model. Check the fit before you list."
              : "AI-made model. Check the fit and drape before you list this."}
          </p>
        )}
      </div>

      {hasAccount && (
        <MakeMoreButton
          id={id}
          productName={productName}
          category={category}
          originalUrl={originalUrl}
          onDone={onDone}
          onLimit={() => showAlert({ title: "That's today's free products used", body: "Come back tomorrow — the daily limit resets at midnight." })}
        />
      )}
    </section>
  );
}

function MobileCarousel({
  filtered,
  ratio,
  active,
  setActive,
  watermark,
  hasAccount,
  onDownload,
}: {
  filtered: GenImage[];
  ratio: "1:1" | "9:16";
  active: number;
  setActive: (i: number) => void;
  watermark: boolean;
  hasAccount: boolean;
  onDownload: (img: GenImage) => void;
}) {
  return (
    <>
      <div
        className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
        onScroll={(e) => {
          const el = e.currentTarget;
          const w = el.clientWidth;
          const idx = Math.round(el.scrollLeft / w);
          if (idx !== active && filtered[idx]) setActive(idx);
        }}
      >
        {filtered.map((img, i) => (
          <div
            key={`${img.kind}-${i}`}
            className="relative flex w-full shrink-0 snap-center items-center justify-center px-6"
          >
            <div
              className="relative w-full overflow-hidden rounded-[16px] bg-surface"
              style={{
                aspectRatio: ratio === "1:1" ? "1 / 1" : "9 / 16",
                boxShadow: "var(--shadow-raised)",
              }}
            >
              <img src={img.url} alt={img.kind} className="h-full w-full object-cover img-warm" />
              {watermark && (
                <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                  Made with CowQ
                </span>
              )}
              {hasAccount && (
                <button
                  type="button"
                  onClick={() => onDownload(img)}
                  className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-black/60 text-white backdrop-blur"
                  aria-label="Download photo"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* dot indicator */}
      <div className="mt-3 flex justify-center gap-1.5">
        {filtered.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to photo ${i + 1}`}
            onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-5 bg-ink" : "w-1.5 bg-muted/40"
            }`}
          />
        ))}
      </div>
    </>
  );
}

/* ============================================================
   ACTIONS (quiet trio, Post this is the loud one)
   ============================================================ */

function ActionRow({
  id: _id,
  images,
  productName,
  csvUrl,
  whiteAfter,
  caption,
  watermark,
  hasAccount,
}: {
  id: string;
  images: GenImage[];
  productName: string;
  csvUrl: string;
  whiteAfter: string | undefined;
  caption: string;
  watermark: boolean;
  hasAccount: boolean;
}) {
  const [showShare, setShowShare] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <QuietAction
          label="Photos"
          icon={<ImageIcon className="h-4 w-4" />}
          disabled={!hasAccount}
          onClick={() => downloadAllPhotos(images, productName, watermark)}
        />
        <QuietAction
          label="CSV"
          icon={<FileText className="h-4 w-4" />}
          disabled={!hasAccount}
          onClick={() => downloadCsv(csvUrl, productName)}
        />
        <button
          type="button"
          onClick={() => setShowShare((v) => !v)}
          className="flex h-12 items-center justify-center gap-1.5 rounded-[14px] bg-primary text-[14px] font-semibold text-primary-foreground hover:brightness-110"
        >
          <Share2 className="h-4 w-4" />
          Post this
        </button>
      </div>
      {showShare && whiteAfter && (
        <div className="rounded-[14px] bg-surface p-3">
          <PostThisButton
            imageUrl={whiteAfter}
            caption={caption}
            productName={productName}
            filenameHint={productName}
            watermark={watermark}
          />
        </div>
      )}
      {!hasAccount && (
        <p className="text-[12px] text-muted">Sign in to download the photos and CSV.</p>
      )}
    </section>
  );
}

function QuietAction({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-12 items-center justify-center gap-1.5 rounded-[14px] bg-raised text-[14px] font-medium text-ink hover:brightness-110 disabled:opacity-40"
    >
      {icon}
      {label}
    </button>
  );
}

async function downloadAllPhotos(images: GenImage[], name: string, watermark: boolean) {
  try {
    const zip = new JSZip();
    await Promise.all(
      images.map(async (img, i) => {
        const filename = `${name}-${img.kind}-${img.ratio.replace(":", "x")}-${i + 1}.png`;
        if (watermark) {
          const blob = await watermarkImageUrl(img.url);
          zip.file(filename, blob);
        } else {
          const res = await fetch(img.url);
          zip.file(filename, await res.arrayBuffer());
        }
      }),
    );
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}-photos.zip`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    showAlert({ title: "Couldn't build the ZIP", body: "Try again in a moment." });
  }
}

async function downloadCsv(url: string, name: string) {
  const slug = (name || "cowq").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "cowq";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const text = await res.text();
    const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `cowq-${slug}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch {
    window.open(url, "_blank");
  }
}

/* ============================================================
   LISTING PANEL — one card, hairline rows, single-open accordion
   ============================================================ */

type Row = { key: string; label: string; text: string; multiline?: boolean };

function ListingPanel({ copy }: { copy: Copy }) {
  const rows: Row[] = [
    { key: "title", label: "Title", text: copy.seoTitle },
    { key: "desc", label: "Description", text: copy.description, multiline: true },
    { key: "bullets", label: "Bullets", text: copy.bullets.map((b) => `• ${b}`).join("\n"), multiline: true },
    { key: "tags", label: "Tags", text: copy.tags.join(", ") },
    { key: "insta", label: "Instagram", text: `${copy.instagram}\n\n${copy.instagramHashtags.join(" ")}`, multiline: true },
    { key: "whatsapp", label: "WhatsApp", text: copy.whatsapp, multiline: true },
    { key: "festival", label: "Festival", text: copy.festival },
  ];

  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="card-lift overflow-hidden">
      <ul className="flex flex-col">
        {rows.map((r, i) => (
          <ListingRow
            key={r.key}
            row={r}
            isOpen={open === r.key}
            isLast={i === rows.length - 1}
            onToggle={() => setOpen((cur) => (cur === r.key ? null : r.key))}
          />
        ))}
      </ul>
    </section>
  );
}

function ListingRow({
  row,
  isOpen,
  isLast,
  onToggle,
}: {
  row: Row;
  isOpen: boolean;
  isLast: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const firstLine = row.text.split("\n")[0];

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(row.text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = row.text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <li className={isLast ? "" : "border-b border-[color:var(--line)]"}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02]"
      >
        <span className="eyebrow w-24 shrink-0">{row.label}</span>
        <span className="min-w-0 flex-1 truncate text-[14px] text-muted">
          {firstLine}
        </span>
        <span
          onClick={handleCopy}
          role="button"
          tabIndex={0}
          aria-label={copied ? "Copied" : `Copy ${row.label}`}
          className="grid h-8 w-8 shrink-0 place-items-center text-muted hover:text-ink"
        >
          {copied ? <Check className="h-4 w-4 text-marigold scale-in" /> : <Copy className="h-4 w-4" />}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className="grid overflow-hidden transition-[grid-template-rows] duration-300"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="min-h-0 overflow-hidden">
          <p
            className={`px-4 pb-4 pt-1 text-[15px] text-ink ${row.multiline ? "whitespace-pre-wrap" : ""}`}
          >
            {row.text}
          </p>
        </div>
      </div>
    </li>
  );
}

/* ============================================================
   SIGN-UP GATE, FEEDBACK
   ============================================================ */

function SignUpGate({ title, body, next }: { title: string; body: string; next: string }) {
  return (
    <div className="card-lift p-5 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-4 w-4" />
      </div>
      <p className="mt-3 text-[16px] font-semibold text-ink">{title}</p>
      <p className="mt-1 text-[14px] text-muted">{body}</p>
      <Link
        to="/auth"
        search={{ mode: "signup", next }}
        className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-[14px] bg-primary px-5 text-[15px] font-semibold text-primary-foreground"
      >
        Create free account
      </Link>
      <Link
        to="/auth"
        search={{ mode: "signin", next }}
        className="mt-2 inline-block text-[13px] font-medium text-muted underline"
      >
        Already have one? Sign in
      </Link>
    </div>
  );
}

function MakeMoreButton({
  id: _id,
  productName,
  category,
  originalUrl,
  onDone,
  onLimit,
}: {
  id: string;
  productName: string;
  category: string;
  originalUrl: string;
  onDone: () => void;
  onLimit: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await generateImages({
            data: { browserId: getBrowserId(), imageUrl: originalUrl, productName, category },
          });
          onDone();
        } catch (e) {
          const msg = String((e as Error).message);
          if (msg.includes("DAILY_LIMIT")) onLimit();
          else alert("Photos didn't come through. Try again.");
        } finally {
          setBusy(false);
        }
      }}
      className="mt-1 h-11 w-full rounded-[14px] bg-raised text-[13px] font-medium text-muted hover:text-ink disabled:opacity-60"
    >
      {busy ? "Making more photos…" : "Make more photos"}
    </button>
  );
}

function Feedback({ id }: { id: string }) {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (rating == null) return;
    submitFeedback({ data: { id, rating, text: text || undefined } }).catch(() => {});
  }, [rating]); // eslint-disable-line

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-[13px] text-muted">
        <span>Was this good?</span>
        <button
          type="button"
          onClick={() => setRating(1)}
          aria-label="Yes"
          className={`grid h-7 w-7 place-items-center rounded-full ${rating === 1 ? "text-marigold" : "hover:text-ink"}`}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setRating(-1)}
          aria-label="No"
          className={`grid h-7 w-7 place-items-center rounded-full ${rating === -1 ? "text-primary" : "hover:text-ink"}`}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
        {sent && <span className="text-marigold">Thanks.</span>}
      </div>
      {rating != null && !sent && (
        <textarea
          aria-label="Feedback about your listing"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            if (text) {
              submitFeedback({ data: { id, rating, text } })
                .then(() => setSent(true))
                .catch(() => {});
            }
          }}
          rows={2}
          placeholder="What would make this better?"
          className="w-full resize-none rounded-[12px] bg-raised p-3 text-[14px] text-ink"
        />
      )}
    </div>
  );
}
