import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Sparkles, Package, Check, Shield, Lock, RefreshCw, ImageIcon, User, Share2, Video, UserRound, FileSpreadsheet, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { UploadWidget } from "@/components/UploadWidget";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { Wordmark } from "@/components/Wordmark";

import { useAuth } from "@/lib/use-auth";
import { SITE_URL, SITE_TITLE, SITE_DESCRIPTION } from "@/lib/site";
import { showcasePairs } from "@/data/showcase";
import how1 from "@/assets/landing/how-1.jpg.asset.json";
import how2 from "@/assets/landing/how-2.jpg.asset.json";
import how3 from "@/assets/landing/how-3.jpg.asset.json";
import who1 from "@/assets/landing/who-1.jpg.asset.json";
import who2 from "@/assets/landing/who-2.jpg.asset.json";
import who3 from "@/assets/landing/who-3.jpg.asset.json";
import who4 from "@/assets/landing/who-4.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SITE_TITLE },
      { name: "twitter:description", content: SITE_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "CowQ",
          url: `${SITE_URL}/`,
          description: SITE_DESCRIPTION,
        }),
      },
    ],
  }),
  component: Landing,
});

/* ---------------- Reveal on scroll ---------------- */
function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) {
      setShown(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 700ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

/* ---------------- Placeholder art ---------------- */
function PlaceholderShot({ tone, label }: { tone: "dim" | "bright"; label?: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          tone === "dim"
            ? "linear-gradient(135deg, #2a2620 0%, #171512 100%)"
            : "linear-gradient(135deg, #efe6d4 0%, #d9c9a6 100%)",
      }}
    >
      {label && (
        <div className="absolute inset-0 grid place-items-center">
          <ImageIcon
            className={`h-10 w-10 ${tone === "dim" ? "text-white/10" : "text-black/15"}`}
          />
        </div>
      )}
    </div>
  );
}

// Data URIs used as slider inputs (works without hosted assets).
const SLIDER_BEFORE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1000'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#2a2620'/><stop offset='1' stop-color='#141210'/></linearGradient></defs><rect width='800' height='1000' fill='url(#g)'/><rect x='260' y='330' width='280' height='340' rx='24' fill='#3a352d'/><rect x='300' y='370' width='200' height='40' rx='6' fill='#524a3f'/></svg>`,
  );
const SLIDER_AFTER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 1000'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#efe6d4'/><stop offset='1' stop-color='#d0bd93'/></linearGradient></defs><rect width='800' height='1000' fill='url(#g)'/><rect x='260' y='330' width='280' height='340' rx='24' fill='#8a6b3d'/><rect x='300' y='370' width='200' height='40' rx='6' fill='#6b5230'/></svg>`,
  );

function StaticPair({ caption }: { caption: string }) {
  return (
    <div>
      <div className="grid grid-cols-2 overflow-hidden rounded-[16px] bg-surface">
        <div className="relative aspect-[4/5]">
          <PlaceholderShot tone="dim" label="before" />
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
            Phone photo, taken in a shop
          </span>
        </div>
        <div className="relative aspect-[4/5]">
          <PlaceholderShot tone="bright" label="after" />
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
            What CowQ made
          </span>
        </div>
      </div>
      {caption && <p className="mt-3 text-[13px] text-muted">{caption}</p>}
    </div>
  );
}

/* ---------------- Page ---------------- */
function Landing() {
  const { user } = useAuth();
  return (
    <main className="w-full">
      {/* Top bar — logo always visible; nav collapses gracefully on small screens. */}
      <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-4 px-6 pt-6">
        {/* Sidebar already shows the wordmark on desktop for signed-in sellers. */}
        <Wordmark className={user ? "lg:hidden" : ""} />

        <nav className="flex items-center gap-5 text-[14px] text-muted">
          <Link to="/how-it-works" className="hover:text-ink">
            How it works
          </Link>
          <Link to="/pricing" className="hover:text-ink">
            Pricing
          </Link>

          {user ? (
            <Link to="/library" className="hover:text-ink">
              Library
            </Link>
          ) : (
            <Link to="/auth" search={{ mode: "signin" }} className="hover:text-ink">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      {/* ================ HERO ================ */}
      <section className="relative px-6 pb-16 pt-10 lg:pt-20">
        {/* The one gradient — Cobalt → Magenta glow behind hero headline. Used nowhere else. */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-8 -z-0 h-[520px] w-[900px] max-w-[95vw] -translate-x-1/2 rounded-full opacity-[0.22] blur-[120px]"
          style={{ background: "linear-gradient(120deg, #3D5AFE 0%, #FF2FA3 100%)" }}
        />
        <div className="relative mx-auto max-w-[820px] text-center">
          <h1 className="font-display text-[40px] leading-[1.02] tracking-[-0.03em] text-ink sm:text-[56px] lg:text-[72px]">
            One photo. A complete business, ready to sell.
          </h1>
          <p className="mx-auto mt-6 max-w-[620px] text-[16px] leading-relaxed text-muted lg:text-[18px]">
            Studio photos, listings, social posts and a catalog file — in under a minute.
          </p>
          <p className="mt-5 text-[14px] text-muted">
            <Link to="/how-it-works" className="underline underline-offset-4 hover:text-ink">
              See exactly how it works
            </Link>{" "}
            — one real product, start to finish.
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-[560px]">
          <UploadWidget />

        </div>
      </section>


      {/* ================ 1. Before / After ================ */}
      <section className="px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <p className="eyebrow text-muted">The proof</p>
            <h2 className="mt-2 font-display text-[32px] leading-[1.05] tracking-[-0.03em] text-ink lg:text-[48px]">
              Real photos, taken in real shops.
            </h2>
            <p className="mt-3 max-w-[620px] text-[15px] text-muted">
              Drag the slider. Left is the phone photo the seller sent us. Right is what CowQ made
              from it — no studio, no retouching, no waiting.
            </p>
          </Reveal>

          <Reveal delay={80}>
            {showcasePairs.length === 0 ? (
              <div className="card-feature mt-10 p-8 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-raised">
                  <ImageIcon className="h-5 w-5 text-muted" />
                </div>
                <p className="mt-4 text-[15px] font-medium text-ink">
                  Real before/after pairs will live here.
                </p>
                <p className="mx-auto mt-2 max-w-[520px] text-[13px] leading-relaxed text-muted">
                  We&rsquo;re only showing this section once we have real seller photos to put in
                  it — no invented examples, no stock imagery. In the meantime, the strongest
                  proof is upstairs: upload your own product and see what comes out.
                </p>
              </div>
            ) : (
              <div className="mt-10 grid gap-8 lg:grid-cols-2">
                <div>
                  <div className="mx-auto max-w-[560px] lg:max-w-none">
                    <BeforeAfterSlider
                      before={showcasePairs[0].before}
                      after={showcasePairs[0].after}
                    />
                  </div>
                  <p className="mt-3 text-[13px] text-muted">
                    {showcasePairs[0].productName} · {showcasePairs[0].location}
                  </p>
                </div>
                {showcasePairs.length > 1 && (
                  <div className="grid gap-6">
                    {showcasePairs.slice(1, 3).map((p) => (
                      <ShowcasePairCard key={p.after} pair={p} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* ================ 2. Everything you get ================ */}
      <section className="bg-surface px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <p className="eyebrow text-muted">One upload</p>
            <h2 className="mt-2 font-display text-[32px] leading-[1.05] tracking-[-0.03em] text-ink lg:text-[48px]">
              Everything you get from one photo.
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <Artefact title="4 studio photos" tone="card-cobalt">
                <div className="grid grid-cols-2 gap-2">
                  {["White background", "Soft studio", "Lifestyle scene", "Flat-lay"].map((s) => (
                    <div
                      key={s}
                      className="flex aspect-square items-end rounded-[10px] bg-raised p-2 text-[11px] text-muted"
                    >
                      {s}
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[12px] text-muted">Square and vertical, both sizes.</p>
              </Artefact>

              <Artefact title="Marketplace listing" tone="card-magenta">
                <div className="rounded-[10px] bg-raised p-3 text-left">
                  <p className="text-[13px] font-semibold text-ink">
                    Handwoven cotton stole, natural dye, 200 × 70 cm
                  </p>
                  <p className="mt-2 text-[11px] leading-snug text-muted">
                    Three tight paragraphs of description, five plain bullets of facts, fifteen
                    search tags — written the way sellers actually talk.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {["cotton stole", "handwoven", "natural dye", "jaipur", "gift"].map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </Artefact>

              <Artefact title="Social posts" tone="card-amber">
                <div className="space-y-2">
                  <div className="rounded-[10px] bg-raised p-3 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--card-accent)]">
                      Instagram
                    </p>
                    <p className="mt-1 text-[12px] leading-snug text-ink">
                      Woven on a wooden handloom in Sanganer. Natural indigo, soft as breath.
                    </p>
                    <p className="mt-1 text-[10px] text-muted">
                      #handwoven #jaipur #cottonstole …
                    </p>
                  </div>
                  <div className="rounded-[10px] bg-raised p-3 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--card-accent)]">
                      WhatsApp broadcast
                    </p>
                    <p className="mt-1 text-[12px] leading-snug text-ink">
                      New handloom stoles just came in. ₹1,499 with free shipping today.
                    </p>
                  </div>
                  <div className="rounded-[10px] bg-raised p-3 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--card-accent)]">
                      Festival line
                    </p>
                    <p className="mt-1 text-[12px] leading-snug text-ink">
                      Diwali gifting — order by Sunday to reach in time.
                    </p>
                  </div>
                </div>
              </Artefact>

              <Artefact title="Website catalog file" wide tone="card-cobalt">
                {/* Spreadsheet document: filename tab, column letters, row numbers. */}
                <div className="overflow-hidden rounded-[10px] bg-raised" style={{ border: "1px solid var(--line)" }}>
                  <div
                    className="flex items-center gap-2 px-3 py-2"
                    style={{ borderBottom: "1px solid var(--line)", background: "color-mix(in oklab, var(--card-accent) 8%, transparent)" }}
                  >
                    <FileSpreadsheet className="h-4 w-4" style={{ color: "var(--card-accent)" }} strokeWidth={1.75} />
                    <span className="font-mono text-[11px] text-ink">cowq-catalog.csv</span>
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-muted">3 rows</span>
                  </div>
                  <div className="grid grid-cols-[22px_repeat(6,minmax(0,1fr))] gap-2 px-3 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted" style={{ borderBottom: "1px solid var(--line)" }}>
                    <span />
                    <span>Handle</span>
                    <span className="col-span-2">Title</span>
                    <span>Vendor</span>
                    <span>Price</span>
                    <span>Image</span>
                  </div>
                  {[
                    ["stole-01", "Handwoven cotton stole", "Jaipur Loom", "₹1,499", "stole-01.jpg"],
                    ["diya-set", "Brass diya set of 6", "Moradabad", "₹899", "diya-set.jpg"],
                    ["speaker", "Wireless speaker", "Sound&Co", "₹2,999", "speaker.jpg"],
                  ].map((r, i) => (
                    <div
                      key={r[0]}
                      className="grid grid-cols-[22px_repeat(6,minmax(0,1fr))] gap-2 px-3 py-2 font-mono text-[11px] text-ink"
                      style={{ borderBottom: i < 2 ? "1px solid color-mix(in oklab, var(--line) 60%, transparent)" : "none" }}
                    >
                      <span className="text-muted">{i + 1}</span>
                      <span>{r[0]}</span>
                      <span className="col-span-2 truncate">{r[1]}</span>
                      <span className="truncate text-muted">{r[2]}</span>
                      <span>{r[3]}</span>
                      <span className="truncate text-muted">{r[4]}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[12px] text-muted">
                  Upload it to your website, Shopify, Amazon or Flipkart — one file, every shop.
                </p>
              </Artefact>

            </div>
          </Reveal>
        </div>
      </section>

      {/* ================ 3. How it works ================ */}
      <section className="px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <p className="eyebrow text-muted">How it works</p>
            <h2 className="mt-2 font-display text-[32px] leading-[1.05] tracking-[-0.03em] text-ink lg:text-[48px]">
              Three steps. Under a minute.
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              <Step
                n="1"
                icon={<Camera className="h-5 w-5" />}
                title="Photograph your product."
                body="Any phone, any table. No lights, no studio, no props."
                photo={how1.url}
                alt="Hand holding a phone photographing a product on a wooden table"
              />
              <Step
                n="2"
                icon={<Sparkles className="h-5 w-5" />}
                title="CowQ studies it."
                body="It works out what it is, what it’s made of, and who buys it."
                photo={how2.url}
                alt="Extreme close-up of woven fibres"
              />
              <Step
                n="3"
                icon={<Package className="h-5 w-5" />}
                title="Everything arrives."
                body="Photos, listing, posts, catalog file — under a minute."
                photo={how3.url}
                alt="Phone on a desk showing a finished product listing"
              />
            </ol>
          </Reveal>

        </div>
      </section>

      {/* ================ 4. What it replaces ================ */}
      <section className="bg-surface px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-[820px]">
          <Reveal>
            <p className="eyebrow text-muted">What it replaces</p>
            <h2 className="mt-2 font-display text-[32px] leading-[1.05] tracking-[-0.03em] text-ink lg:text-[48px]">
              The team you’d otherwise pay.
            </h2>
            <p className="mt-3 text-[15px] text-muted">
              A proper listing usually needs five people. Here’s what each of them costs, per
              month, at reasonable Indian rates.
            </p>
          </Reveal>

          <Reveal delay={80}>
            <div className="card-list mt-10 divide-y divide-white/5">
              {[
                { role: "Product photographer", note: "10–20 products a month", cost: "₹40,000 – ₹70,000" },
                { role: "Copywriter", note: "titles, descriptions, tags", cost: "₹30,000 – ₹60,000" },
                { role: "Social media manager", note: "Instagram + WhatsApp posts", cost: "₹40,000 – ₹80,000" },
                { role: "Catalog assistant", note: "marketplace uploads", cost: "₹25,000 – ₹45,000" },
                { role: "Designer, part-time", note: "banners, thumbnails, edits", cost: "₹50,000 – ₹70,000" },
              ].map((r) => (
                <div key={r.role} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <p className="text-[15px] font-medium text-ink">{r.role}</p>
                    <p className="text-[12px] text-muted">{r.note}</p>
                  </div>
                  <p className="font-mono text-[14px] text-ink">{r.cost}</p>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-4">
                <p className="text-[15px] font-medium text-ink">Total, per month</p>
                <p className="font-mono text-[16px] font-semibold text-ink">
                  ₹1.85 – 3.25 lakh
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="card-feature mt-8 p-6">
              <p className="text-[13px] uppercase tracking-wider text-muted">CowQ starts at</p>
              <p className="mt-1 font-display text-[40px] leading-none text-ink">
                ₹999 <span className="text-[15px] font-normal text-muted">/ month</span>
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">
                CowQ does the work. You still decide what to sell and what your brand stands for.
              </p>
              <Link
                to="/pricing"
                className="mt-6 inline-flex h-11 items-center rounded-[12px] bg-raised px-5 text-[14px] font-medium text-ink hover:brightness-110"
              >
                See plans
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================ 5. Trust ================ */}
      <section className="px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-[1000px]">
          <Reveal>
            <p className="eyebrow text-muted">Trust</p>
            <h2 className="mt-2 font-display text-[32px] leading-[1.05] tracking-[-0.03em] text-ink lg:text-[48px]">
              Why you can believe this works.
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              <TrustCard
                icon={<Sparkles className="h-5 w-5" />}
                title="Try it before you sign up."
                tone="card-cobalt"
                body="One product free, no account, no card. Nothing else on this page proves as much."
              />
              <TrustCard
                icon={<Lock className="h-5 w-5" />}
                title="Your photos stay yours."
                tone="card-magenta"
                body="We don’t sell them, share them, or use them to train anything."
              />
              <TrustCard
                icon={<Shield className="h-5 w-5" />}
                title="The product stays exactly as it is."
                tone="card-amber"
                body="CowQ changes the background and the light — never the product."
              />
              <TrustCard
                icon={<RefreshCw className="h-5 w-5" />}
                title="No lock-in."
                tone="card-cobalt"
                body="Cancel any time. Download everything you’ve made."
              />
            </div>
          </Reveal>

          <Reveal delay={140}>
            {/* Founder note — placeholder only. Do NOT invent a name, quote, or photograph.
                Drop a real portrait into /public/founder.jpg and replace [FOUNDER_NAME]
                and the note body with the actual founder's words. */}
            <div className="card-magenta mt-10 p-6 lg:p-8">
              <div className="flex items-start gap-4">
                <div
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-raised text-muted"
                  aria-label="Founder photo — replace with /public/founder.jpg"
                >
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[13px] uppercase tracking-wider text-muted">
                    A note from the founder
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">
                    [Founder note goes here — first person, one short paragraph, why CowQ exists
                    and who it&rsquo;s for. Replace this placeholder with the real note before
                    launch.]
                  </p>
                  <p className="mt-3 text-[13px] text-muted">— Tarak Sundhar, founder</p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================ 6. Who it's for ================ */}
      <section className="bg-surface px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <p className="eyebrow text-muted">Who it’s for</p>
            <h2 className="mt-2 font-display text-[32px] leading-[1.05] tracking-[-0.03em] text-ink lg:text-[48px]">
              Small sellers with a product and no team.
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { t: "Marketplace sellers", b: "Amazon, Flipkart, Meesho.", src: who1.url, alt: "Marketplace packing table with boxes" },
                { t: "Instagram & WhatsApp shops", b: "Post daily without a designer.", src: who2.url, alt: "Phone showing an Instagram shop grid" },
                { t: "Physical shops going online", b: "Your first proper catalog.", src: who3.url, alt: "Small retail shop counter" },
                { t: "Anyone with a product", b: "And no team behind them.", src: who4.url, alt: "Artisan workbench with tools" },
              ].map((c, ci) => (
                <div
                  key={c.t}
                  className={`${["card-cobalt", "card-magenta", "card-amber", "card-cobalt"][ci]} overflow-hidden`}
                >
                  <div className="relative aspect-[4/3]">
                    <img src={c.src} alt={c.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                  <div className="p-5">
                    <p className="text-[15px] font-semibold text-ink">{c.t}</p>
                    <p className="mt-1 text-[13px] text-muted">{c.b}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================ 7. Questions ================ */}
      <section className="px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-[820px]">
          <Reveal>
            <p className="eyebrow text-muted">Questions</p>
            <h2 className="mt-2 font-display text-[32px] leading-[1.05] tracking-[-0.03em] text-ink lg:text-[48px]">
              The things sellers actually ask.
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <div className="card-list mt-10 divide-y divide-white/5">
              <Faq
                q="Will my product look different from the real thing?"
                a="No. Only the background and lighting change. Colour, texture, pattern and shape stay exactly as they are."
              />
              <Faq
                q="Can I use these on Amazon and Flipkart?"
                a="Yes. Keep scenes honest to the product and they meet marketplace guidelines."
              />
              <Faq
                q="What if I don’t like the photos?"
                a="Regenerate. If a generation fails, credits come back automatically."
              />
              <Faq
                q="Do I need a good camera?"
                a="No. A clear phone photo in daylight is enough."
              />
              <Faq
                q="What does it cost?"
                a={
                  <>
                    First product free. Plans from ₹999 —{" "}
                    <Link to="/pricing" className="underline underline-offset-2">
                      see pricing
                    </Link>
                    .
                  </>
                }
              />
              <Faq
                q="Is my product data private?"
                a="Yes. Yours only, deleted on request."
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================ 7b. What's coming ================ */}
      <section className="px-6 py-16 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <p className="eyebrow text-muted">What's coming</p>
            <h2 className="mt-2 font-display text-[32px] leading-[1.05] tracking-[-0.03em] text-ink lg:text-[48px]">
              Built next.
            </h2>
            <p className="mt-3 max-w-[620px] text-[15px] text-muted">
              CowQ ships every month. Here's what's rolling out now and what's next.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <RoadmapCard
                icon={Video}
                tone="card-magenta"
                date="Rolling out"
                live
                title="Product videos"
                body="Short videos made from the same photos — the product turning, the detail up close, ready for Reels and Shorts. Switching on for sellers now, a few at a time."
              />
              <RoadmapCard
                icon={Share2}
                tone="card-cobalt"
                date="September 2026"
                title="Posting everywhere"
                body="One tap posts to Instagram, Facebook, YouTube, Threads, X, LinkedIn, Pinterest and more. Connect once, then never open another app to publish."
              />
              <RoadmapCard
                icon={UserRound}
                tone="card-amber"
                date="December 2026"
                title="Presenter videos"
                body="A presenter introducing your product on camera, in your brand's voice."
              />
            </div>
            <p className="mt-8 text-center text-[13px] text-muted">
              Dates are our honest best estimate. We'd rather ship late than promise something that isn't ready.
            </p>
          </Reveal>

        </div>
      </section>

      {/* ================ 8. Close ================ */}
      <section className="bg-surface px-6 py-20 lg:py-28">
        <div className="mx-auto max-w-[820px] text-center">
          <Reveal>
            <h2 className="font-display text-[36px] leading-[1.05] tracking-[-0.03em] text-ink lg:text-[56px]">
              Try it on your own product. Free.
            </h2>
            <p className="mx-auto mt-5 max-w-[520px] text-[16px] text-muted">
              One photo. No account. Under a minute.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="mx-auto mt-10 max-w-[560px]">
              <UploadWidget />
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="px-6 py-10 text-center text-[12px] text-muted">
        CowQ · Complete Operations With Quality ·{" "}
        <Link to="/how-it-works" className="hover:text-ink">
          How it works
        </Link>{" "}
        ·{" "}
        <Link to="/pricing" className="hover:text-ink">
          Pricing
        </Link>{" "}
        ·{" "}
        <Link to="/auth" search={{ mode: "signin" }} className="hover:text-ink">
          Sign in
        </Link>
      </footer>
    </main>
  );
}

/* ---------------- Small pieces ---------------- */

function ShowcasePairCard({ pair }: { pair: { before: string; after: string; productName: string; location: string } }) {
  return (
    <div>
      <div className="grid grid-cols-2 overflow-hidden rounded-[16px] bg-surface">
        <div className="relative aspect-[4/5]">
          <img src={pair.before} alt={`${pair.productName} — phone photo`} className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
            Phone photo
          </span>
        </div>
        <div className="relative aspect-[4/5]">
          <img src={pair.after} alt={`${pair.productName} — made by CowQ`} className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white">
            What CowQ made
          </span>
        </div>
      </div>
      <p className="mt-3 text-[13px] text-muted">{pair.productName} · {pair.location}</p>
    </div>
  );
}


function Artefact({
  title,
  children,
  wide,
  tone = "card-cobalt",
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
  tone?: string;
}) {
  return (
    <div className={`${tone} p-5 ${wide ? "md:col-span-3" : ""}`}>
      <div className="mb-3 flex items-center gap-2">
        <Check className="h-4 w-4 text-[color:var(--card-accent)]" />
        <p className="text-[13px] font-semibold text-ink">{title}</p>
      </div>
      {children}
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  body,
  photo,
  alt,
}: {
  n: string;
  icon: ReactNode;
  title: string;
  body: string;
  photo?: string;
  alt?: string;
}) {
  return (
    <li className="card-feature overflow-hidden">
      {photo && (
        <div className="relative aspect-[4/3]">
          <img src={photo} alt={alt ?? ""} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      )}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-raised font-mono text-[13px] text-ink">
            {n}
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-raised text-muted">
            {icon}
          </span>
        </div>
        <p className="mt-4 text-[17px] font-semibold text-ink">{title}</p>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">{body}</p>
      </div>
    </li>
  );
}


function TrustCard({
  icon,
  title,
  body,
  tone = "card-cobalt",
}: {
  icon: ReactNode;
  title: string;
  body: string;
  tone?: string;
}) {
  return (
    <div className={`${tone} p-5`}>
      <span className="grid h-9 w-9 place-items-center rounded-full bg-raised text-[color:var(--card-accent)]">
        {icon}
      </span>
      <p className="mt-4 text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="w-full px-5 py-4 text-left"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-[15px] font-medium text-ink">{q}</p>
        <span className="font-mono text-[16px] text-muted">{open ? "–" : "+"}</span>
      </div>
      {open && <p className="mt-2 text-[14px] leading-relaxed text-muted">{a}</p>}
    </button>
  );
}

function RoadmapCard({
  icon: Icon,
  date,
  title,
  body,
  tone = "card-cobalt",
  live = false,
}: {
  icon: LucideIcon;
  date: string;
  title: string;
  body: string;
  tone?: string;
  /** true = shipping now, shown as a live green pill instead of an amber date. */
  live?: boolean;
}) {

  return (
    <div className={`${tone} p-6`}>
      <span
        className="grid h-10 w-10 place-items-center rounded-[10px]"
        style={{
          background: "color-mix(in oklab, var(--card-accent) 18%, transparent)",
          color: "var(--card-accent)",
        }}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span
        className="mt-5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{
          background: `color-mix(in oklab, ${live ? "#00E5A0" : "#FF8A1E"} 14%, transparent)`,
          color: live ? "#00E5A0" : "#FF8A1E",
        }}
      >
        {live && (
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#00E5A0" }} aria-hidden />
        )}
        {date}
      </span>

      <p className="mt-3 text-[17px] font-semibold text-ink">{title}</p>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}
