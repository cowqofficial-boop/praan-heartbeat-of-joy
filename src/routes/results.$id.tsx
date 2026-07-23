import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Lock, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { PostThisButton } from "@/components/PostThisButton";
import JSZip from "jszip";
import { generateImages, getGeneration, submitFeedback } from "@/lib/cowq.functions";
import { getBrowserId } from "@/lib/browser-id";
import { CopyButton } from "@/components/CopyButton";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { useAuth } from "@/lib/use-auth";
import { getMyCredits } from "@/lib/billing.functions";
import { watermarkImageUrl } from "@/lib/watermark";

export const Route = createFileRoute("/results/$id")({
  head: ({ params }) => ({
    meta: [
      { title: "Your listing is ready — CowQ Ai" },
      {
        name: "description",
        content:
          "Studio product photos, marketplace copy, and a Shopify catalog CSV — ready to download and post.",
      },
      { property: "og:title", content: "Your listing is ready — CowQ Ai" },
      {
        property: "og:description",
        content: "Download studio photos, copy marketplace text, and export a Shopify CSV.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: `https://praan-heartbeat-of-joy.lovable.app/results/${params.id}`,
      },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [
      {
        rel: "canonical",
        href: `https://praan-heartbeat-of-joy.lovable.app/results/${params.id}`,
      },
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
        <Link to="/" className="text-primary underline">Start over</Link>
      </div>
    );
  }

  const images = (data.generated_images as GenImage[]) ?? [];
  const copy = data.copy as Copy;
  const original = data.original_image_url as string;
  const whiteAfter = images.find((i) => i.kind === "white" && i.ratio === "1:1")?.url ?? images[0]?.url;
  const personSource = ((data.gen_metadata as { person_source?: "ai" | "user" } | null)?.person_source) ?? "ai";

  return (
    <main className="flex min-h-screen flex-col gap-10 pb-16 pt-8">
      <header className="px-5">
        <p className="eyebrow">Ready</p>
        <h1 className="mt-2 font-display text-[40px] leading-[1.02] text-ink sm:text-[48px]">
          Ready to sell.
        </h1>
        <p className="mt-2 text-[15px] text-muted">
          Copy anything with one tap.
        </p>
      </header>


      {/* 1. Photos */}
      <PhotosSection
        images={images}
        id={id}
        productName={data.product_name as string}
        category={data.category as string}
        originalUrl={original}
        onDone={() => refetch()}
        hasAccount={!!user}
        watermark={watermark}
        personSource={personSource}
      />


      {/* 2. Post this — primary action */}
      <div className="px-5">
        <Section title="Post this">
          <PostThisButton
            imageUrl={whiteAfter}
            caption={copy ? `${copy.instagram}\n\n${copy.instagramHashtags.join(" ")}` : ""}
            productName={(data.product_name as string) || undefined}
            filenameHint={(data.product_name as string) || "cowq"}
            watermark={watermark}
          />
        </Section>
      </div>

      {/* 3. Before / after */}
      <div className="px-5">
        <Section title="See the change">
          {whiteAfter && (
            <BeforeAfterSlider before={original} after={whiteAfter} />
          )}
        </Section>
      </div>

      {/* 3. Marketplace listing */}
      <div className="px-5">
        <Section title="Marketplace listing">
          <Block label="Title" text={copy.seoTitle} />
          <Block label="Description" text={copy.description} multiline />
          <Block
            label="Bullet points"
            text={copy.bullets.map((b) => `• ${b}`).join("\n")}
            multiline
          />
          <Block label="Search tags" text={copy.tags.join(", ")} />
        </Section>
      </div>

      {/* 4. Social */}
      <div className="px-5">
        <Section title="Social">
          <Block
            label="Instagram caption"
            text={`${copy.instagram}\n\n${copy.instagramHashtags.join(" ")}`}
            multiline
          />
          <Block label="WhatsApp broadcast" text={copy.whatsapp} multiline />
          <Block label="Festival line" text={copy.festival} />
        </Section>
      </div>

      {/* 5. Download */}
      <div className="px-5">
        <Section title="Download">
          {user ? (
            <div className="flex flex-col gap-3">
              <DownloadAllButton
                images={images}
                name={(data.product_name as string) || "cowq"}
                watermark={watermark}
              />
              <DownloadCsvButton
                url={data.csv_url as string}
                name={(data.product_name as string) || "cowq"}
              />
            </div>
          ) : (
            <SignUpGate
              title="Sign up to save and download"
              body="Free forever. Keep this product in your library and download all photos plus the Shopify catalog file."
              next={`/results/${id}`}
            />
          )}
        </Section>
      </div>

      {/* Feedback */}
      <div className="px-5">
        <Feedback id={id} />
      </div>

      <div className="px-5 pt-6 text-center">
        <button
          onClick={() => navigate({ to: user ? "/library" : "/" })}
          className="text-[14px] font-medium text-muted underline"
        >
          {user ? "Back to your library" : "Start another product"}
        </button>
      </div>

    </main>
  );
}

function SignUpGate({ title, body, next }: { title: string; body: string; next: string }) {
  return (
    <div className="rounded-[12px] border border-[color:var(--color-border)] bg-surface p-5 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-4 w-4" />
      </div>
      <p className="mt-3 text-[16px] font-semibold text-ink">{title}</p>
      <p className="mt-1 text-[14px] text-muted">{body}</p>
      <Link
        to="/auth"
        search={{ mode: "signup", next }}
        className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-primary px-5 text-[15px] font-semibold text-primary-foreground"
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Block({
  label,
  text,
  multiline = false,
}: {
  label: string;
  text: string;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-[color:var(--color-border)] bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <CopyButton text={text} />
      </div>
      <p
        className={`mt-2 text-[15px] text-ink ${multiline ? "whitespace-pre-wrap" : ""}`}
      >
        {text}
      </p>
    </div>
  );
}

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

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-5">
        <h2 className="eyebrow">Photos</h2>
        <div className="inline-flex rounded-full bg-raised p-1">
          {(["1:1", "9:16"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRatio(r)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${
                ratio === r ? "bg-ink text-background" : "text-muted"
              }`}
            >
              {r === "1:1" ? "Square" : "Vertical"}
            </button>
          ))}
        </div>
      </div>
      {/* Full-bleed carousel — the only element allowed to break the 520px column */}
      <div className="w-screen relative left-1/2 right-1/2 -translate-x-1/2 stagger">
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 pt-2 no-scrollbar">
          {filtered.map((img, i) => {
            const isOnModel = img.kind.startsWith("onmodel");
            return (
              <div
                key={`${img.kind}-${img.ratio}-${i}`}
                className="stagger-item flex shrink-0 snap-center flex-col gap-2"
                style={{ width: ratio === "1:1" ? "min(78vw, 460px)" : "min(64vw, 340px)" }}
              >
                <div
                  className="relative overflow-hidden rounded-[16px] bg-surface"
                  style={{
                    aspectRatio: ratio === "1:1" ? "1 / 1" : "9 / 16",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                >
                  <img
                    src={img.url}
                    alt={`${img.kind} ${img.ratio}`}
                    className="h-full w-full object-cover img-warm"
                  />
                  {watermark && (
                    <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                      Made with CowQ
                    </span>
                  )}
                  {hasAccount && (
                    <button
                      type="button"
                      onClick={() => handleDownload(img)}
                      className="absolute bottom-3 right-3 grid h-11 w-11 place-items-center rounded-full bg-raised/90 text-ink backdrop-blur-sm"
                      aria-label="Download photo"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {isOnModel && (
                  <p className="px-1 text-[11px] leading-snug text-muted">
                    {personSource === "user"
                      ? "Your model. Check the fit before you list."
                      : "AI-made model. Check the fit and drape before you list this."}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {hasAccount && (
        <div className="px-5">
          <MakeMoreButton
            id={id}
            productName={productName}
            category={category}
            originalUrl={originalUrl}
            onDone={onDone}
            onLimit={() =>
              alert("You've used today's 5 free products. Come back tomorrow.")
            }
          />
        </div>
      )}
    </section>
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
            data: {
              browserId: getBrowserId(),
              imageUrl: originalUrl,
              productName,
              category,
            },
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
      className="mt-3 h-11 w-full rounded-[12px] border border-[color:var(--color-border)] bg-raised text-[14px] font-semibold text-ink disabled:opacity-60"
    >
      {busy ? "Making more photos…" : "Make more photos"}
    </button>
  );
}

function DownloadAllButton({ images, name, watermark }: { images: GenImage[]; name: string; watermark: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
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
                const buf = await res.arrayBuffer();
                zip.file(filename, buf);
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
        } finally {
          setBusy(false);
        }
      }}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-60"
    >
      <Download className="h-4 w-4" />
      {busy ? "Packing photos…" : "Download all photos"}
    </button>
  );
}

function DownloadCsvButton({ url, name }: { url: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const slug = (name || "cowq").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "cowq";
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
        } finally {
          setBusy(false);
        }
      }}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-[12px] border border-[color:var(--color-border)] bg-raised text-[15px] font-semibold text-ink disabled:opacity-60"
    >
      <Download className="h-4 w-4" />
      {busy ? "Preparing CSV…" : "Download catalog file (CSV)"}
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
    <div className="mt-4 rounded-[12px] border border-[color:var(--color-border)] bg-surface p-4">
      <p className="text-[15px] font-medium text-ink">How did we do?</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setRating(1)}
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-[12px] border text-[14px] font-medium ${
            rating === 1 ? "border-highlight bg-highlight/10 text-ink" : "border-[color:var(--color-border)] bg-raised text-ink"
          }`}
        >
          <ThumbsUp className="h-4 w-4" /> Good
        </button>
        <button
          onClick={() => setRating(-1)}
          className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-[12px] border text-[14px] font-medium ${
            rating === -1 ? "border-primary bg-primary/10 text-ink" : "border-[color:var(--color-border)] bg-raised text-ink"
          }`}
        >
          <ThumbsDown className="h-4 w-4" /> Not great
        </button>
      </div>
      <textarea
        aria-label="Feedback about your listing"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (rating != null && text) {
            submitFeedback({ data: { id, rating, text } })
              .then(() => setSent(true))
              .catch(() => {});
          }
        }}
        rows={2}
        placeholder="What would make this better?"
        className="mt-3 w-full resize-none rounded-[12px] border border-[color:var(--color-border)] bg-raised p-3 text-[15px] text-ink"
      />
      {sent && (
        <p className="mt-2 text-[13px] text-highlight">Thanks — we've got it.</p>
      )}
    </div>
  );
}
