import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  LibraryBig,
  Package,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { UploadWidget } from "@/components/UploadWidget";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { CopyButton } from "@/components/CopyButton";
import { BackButton } from "@/components/BackButton";
import { Wordmark } from "@/components/Wordmark";
import { SITE_URL } from "@/lib/site";

import heroPhone from "@/assets/how/hero-phone.jpg.asset.json";
import diyaOriginal from "@/assets/how/diya-original.jpg.asset.json";
import diyaWhite from "@/assets/how/diya-white.jpg.asset.json";
import diyaStudio from "@/assets/how/diya-studio.jpg.asset.json";
import diyaLifestyle from "@/assets/how/diya-lifestyle.jpg.asset.json";
import diyaFlatlay from "@/assets/how/diya-flatlay.jpg.asset.json";

const TITLE = "How CowQ works — one photo to a full storefront";
const DESCRIPTION =
  "Follow one real product — a brass diya set — from a dim phone photo to studio images, listing copy, social posts and a catalog file.";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `${SITE_URL}/how-it-works` },
      { property: "og:image", content: `${SITE_URL}${diyaLifestyle.url}` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: `${SITE_URL}${diyaLifestyle.url}` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/how-it-works` }],
  }),
  component: HowItWorks,
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
        transform: shown ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 400ms cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 400ms cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function SectionShell({
  children,
  tinted = false,
}: {
  children: ReactNode;
  tinted?: boolean;
}) {
  return (
    <section className={`px-6 py-16 lg:py-24 ${tinted ? "bg-surface" : ""}`}>
      <div className="mx-auto max-w-[1100px]">{children}</div>
    </section>
  );
}

function StepLabel({ n, text }: { n: number; text: string }) {
  return (
    <p className="eyebrow flex items-center gap-2 text-muted">
      <span
        className="grid h-6 w-6 place-items-center rounded-full font-mono text-[11px] tabular-nums text-background"
        style={{ background: "var(--page-accent)" }}
      >
        {n}
      </span>
      {text}
    </p>
  );
}

function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-3 font-display text-[30px] leading-[1.05] tracking-[-0.03em] text-ink lg:text-[44px]">
      {children}
    </h2>
  );
}

function Body({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-[15px] leading-relaxed text-muted lg:text-[17px]">{children}</p>;
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="card-list mt-4 rounded-[12px] px-4 py-3 text-[13px] leading-relaxed text-muted">
      {children}
    </p>
  );
}

function Shot({
  src,
  alt,
  caption,
  ratio = "4 / 5",
}: {
  src: string;
  alt: string;
  caption?: string;
  ratio?: string;
}) {
  return (
    <figure>
      <div className="overflow-hidden rounded-[12px] bg-surface" style={{ aspectRatio: ratio }}>
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      </div>
      {caption && <figcaption className="mt-2 text-[12px] text-muted">{caption}</figcaption>}
    </figure>
  );
}

/* ---------------- Page ---------------- */
function HowItWorks() {
  return (
    <main className="w-full">
      <header className="flex items-center gap-3 px-6 pt-6">
        <BackButton fallback="/" />
        <Wordmark className="lg:hidden" />
      </header>
      {/* ================ HERO ================ */}
      <section className="relative px-6 pb-10 pt-8 lg:pt-14">

        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-6 -z-0 h-[440px] w-[820px] max-w-[95vw] -translate-x-1/2 rounded-full opacity-[0.2] blur-[120px]"
          style={{ background: "linear-gradient(120deg, #3D5AFE 0%, #FF2FA3 100%)" }}
        />
        <div className="relative mx-auto grid max-w-[1100px] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="eyebrow text-muted">How it works</p>
            <h1 className="mt-3 font-display text-[38px] leading-[1.02] tracking-[-0.03em] text-ink sm:text-[52px] lg:text-[64px]">
              From one photo to a full storefront.
            </h1>
            <p className="mt-5 max-w-[560px] text-[16px] leading-relaxed text-muted lg:text-[18px]">
              Follow one real product — a brass diya set — through every step. This is exactly what
              you get.
            </p>
            <Link
              to="/create"
              className="mt-7 inline-flex h-11 items-center gap-2 rounded-[12px] px-5 text-[14px] font-semibold text-background"
              style={{
                background: "linear-gradient(180deg, #5C74FF 0%, #3D5AFE 100%)",
                boxShadow: "0 8px 24px rgba(61,90,254,0.35)",
              }}
            >
              Try it free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <Shot
            src={heroPhone.url}
            alt="A shopkeeper photographing brass diyas on a wooden counter with a phone"
            ratio="4 / 3"
          />
        </div>
      </section>

      {/* ================ STEP 1 ================ */}
      <SectionShell tinted>
        <Reveal>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Shot
              src={diyaOriginal.url}
              alt="Dim phone photo of six brass diyas on a shop counter"
              caption="What the seller uploaded."
            />
            <div>
              <StepLabel n={1} text="You take one photo" />
              <H2>Snap it on your phone.</H2>
              <Body>
                No studio, no lights, no props. Ravi photographed his diya set on his shop counter
                in ten seconds. That&rsquo;s all CowQ needs.
              </Body>
              <Note>
                You can add two or three more angles — the back, a close-up, the label — for even
                better results.
              </Note>
            </div>
          </div>
        </Reveal>
      </SectionShell>

      {/* ================ STEP 2 ================ */}
      <SectionShell>
        <Reveal>
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="lg:order-2">
              <StepLabel n={2} text="CowQ studies it" />
              <H2>It works out what your product is.</H2>
              <Body>
                In seconds, CowQ reads the material, the type, who buys it, and what occasion
                it&rsquo;s for — the way an experienced seller would. Everything after this is built
                on that understanding.
              </Body>
            </div>

            <div className="lg:order-1">
              <div className="relative overflow-hidden rounded-[12px] bg-surface">
                <img
                  src={diyaWhite.url}
                  alt="Brass diya set on a white background with detected attributes"
                  loading="lazy"
                  className="h-full w-full object-cover"
                  style={{ aspectRatio: "4 / 5" }}
                />
                <div className="absolute inset-0 grid grid-cols-2 content-between gap-2 p-3">
                  {["brass", "diya set of 6", "festival / Diwali", "home décor", "traditional"].map(
                    (t, i) => (
                      <span
                        key={t}
                        className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur ${
                          i % 2 ? "justify-self-end" : ""
                        }`}
                        style={{
                          background: "rgba(6,7,10,0.72)",
                          borderColor: "color-mix(in oklab, var(--page-accent) 45%, transparent)",
                          color: "var(--ink)",
                        }}
                      >
                        <Sparkles
                          className="h-3 w-3"
                          style={{ color: "var(--card-accent)" }}
                        />
                        {t}
                      </span>
                    ),
                  )}
                </div>
              </div>
              <p className="mt-2 text-[12px] text-muted">What CowQ identified, in seconds.</p>
            </div>
          </div>
        </Reveal>
      </SectionShell>

      {/* ================ STEP 3 ================ */}
      <SectionShell tinted>
        <Reveal>
          <StepLabel n={3} text="Your photos" />
          <H2>Studio photos, from that one snap.</H2>
          <Body>
            The exact same diya set — same brass, same shape — now shot four ways. White background
            for Amazon, a warm scene for Instagram, a flat lay for your catalogue. Square and
            vertical, ready for every platform.
          </Body>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div>
              <BeforeAfterSlider before={diyaOriginal.url} after={diyaStudio.url} />
              <p className="mt-2 text-[12px] text-muted">Drag to compare. Same lamps, new light.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Shot src={diyaWhite.url} alt="Brass diya set on a white background" caption="White background" />
              <Shot src={diyaStudio.url} alt="Brass diya set in warm studio light" caption="Soft studio" />
              <Shot src={diyaLifestyle.url} alt="Brass diya set lit for Diwali on a wooden table" caption="Diwali lifestyle" />
              <Shot src={diyaFlatlay.url} alt="Brass diya set arranged flat on linen" caption="Flat lay" />
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <Note>
            Your product stays exactly as it is. CowQ changes the background and the light — never
            the product.
          </Note>
        </Reveal>
      </SectionShell>

      {/* ================ STEP 4 ================ */}
      <SectionShell>
        <Reveal>
          <StepLabel n={4} text="Your words" />
          <H2>Every word written for you.</H2>
          <Body>
            The listing, the search tags, the social posts, the WhatsApp message — all written the
            way a good seller talks. Copy any of it with one tap.
          </Body>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <CopyCard label="Marketplace title" tone="card-cobalt">
              <p className="text-[15px] font-semibold leading-snug text-ink">
                Handcrafted Brass Diya Set of 6 — Traditional Oil Lamps for Diwali &amp; Pooja
              </p>
            </CopyCard>

            <CopyCard label="Description" tone="card-magenta">
              <p className="text-[14px] leading-relaxed text-muted">
                Six solid brass diyas, turned and hand-finished in Moradabad. Each lamp is 5 cm
                across with a raised stem, so it sits steady on a shelf or a rangoli. Takes standard
                cotton wicks and oil or ghee.
              </p>
            </CopyCard>

            <CopyCard label="Bullet points" tone="card-amber">
              <ul className="space-y-2">
                {[
                  "Set of 6 solid brass diyas, 5 cm across, 4 cm tall",
                  "Hand-finished in Moradabad — no plating, no coating",
                  "Works with cotton wicks, oil or ghee; wipes clean with a dry cloth",
                ].map((b) => (
                  <li key={b} className="flex gap-2 text-[14px] leading-snug text-muted">
                    <Check
                      className="mt-[3px] h-3.5 w-3.5 shrink-0"
                      style={{ color: "var(--card-accent)" }}
                    />
                    {b}
                  </li>
                ))}
              </ul>
            </CopyCard>

            <CopyCard label="Instagram caption" tone="card-cobalt">
              <p className="text-[14px] leading-relaxed text-ink">
                Six little brass lamps, turned by hand in Moradabad. Fill them with ghee, light them
                at dusk, and the whole doorway changes.
              </p>
              <p className="mt-2 text-[12px] text-muted">
                #brassdiya #diwali2026 #diyaset #handmadeinindia #poojaessentials #moradabadbrass
              </p>
            </CopyCard>

            <CopyCard label="WhatsApp broadcast" tone="card-magenta">
              <p className="text-[14px] leading-relaxed text-ink">
                New brass diya sets just in — ₹899, free delivery before Diwali.
              </p>
            </CopyCard>

            <CopyCard label="Festival line" tone="card-amber">
              <p className="text-[14px] leading-relaxed text-ink">
                Diwali is on the 8th — order by Sunday and the set reaches you in time to light it.
              </p>
            </CopyCard>
          </div>
        </Reveal>
      </SectionShell>

      {/* ================ STEP 5 ================ */}
      <SectionShell tinted>
        <Reveal>
          <StepLabel n={5} text="Your catalog file" />
          <H2>One file for your whole store.</H2>
          <Body>
            Download a catalog file that imports straight into Shopify, Amazon or Flipkart. No
            typing product details twice.
          </Body>
        </Reveal>

        <Reveal delay={80}>
          <div className="card-list mt-8 overflow-x-auto rounded-[12px]">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="bg-background/40 text-[10px] uppercase tracking-wider text-muted">
                  {["Handle", "Title", "Price", "Image", "Tags"].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="font-mono text-[12px] text-ink">
                  <td className="px-3 py-3 align-top">brass-diya-set-6</td>
                  <td className="max-w-[280px] px-3 py-3 align-top">
                    Handcrafted Brass Diya Set of 6
                  </td>
                  <td className="px-3 py-3 align-top tabular-nums">899.00</td>
                  <td className="px-3 py-3 align-top text-muted">diya-white-1.jpg</td>
                  <td className="px-3 py-3 align-top text-muted">brass, diya, diwali, pooja</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[12px] text-muted">
            One row per product, one line per photo. Ready to import.
          </p>
        </Reveal>
      </SectionShell>

      {/* ================ STEP 6 ================ */}
      <SectionShell>
        <Reveal>
          <StepLabel n={6} text="It keeps working" />
          <H2>Not just photos — your whole selling day.</H2>
          <Body>
            This is what makes CowQ different from a photo app. One photo doesn&rsquo;t just get you
            pictures. It gets you a listing, a month of posts, a stocked catalogue, and soon,
            automatic posting everywhere.
          </Body>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <SmallCard
              tone="card-cobalt"
              icon={<LibraryBig className="h-5 w-5" />}
              title="Your library"
              body="Every product saved forever. Come back and download any time."
            />
            <SmallCard
              tone="card-magenta"
              icon={<Package className="h-5 w-5" />}
              title="Stock"
              body="Track what you have. CowQ won’t advertise what you’ve sold out of."
            />
            <SmallCard
              tone="card-amber"
              icon={<Share2 className="h-5 w-5" />}
              title="Coming September"
              body="One tap posts everywhere — Instagram, Facebook, YouTube and more."
            />
          </div>
        </Reveal>
      </SectionShell>

      {/* ================ COMPARISON ================ */}
      <SectionShell tinted>
        <Reveal>
          <p className="eyebrow text-muted">The difference</p>
          <H2>Why one photo is enough.</H2>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="card-neutral rounded-[12px] p-6">
              <p className="text-[15px] font-semibold text-ink">A photo app gives you:</p>
              <p className="mt-2 text-[14px] text-muted">Nicer pictures.</p>
              <ul className="mt-5 space-y-3">
                {[
                  "You still write the listing",
                  "You still make the posts",
                  "You still type the catalogue",
                  "You still post everything by hand",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5 text-[14px] text-muted">
                    <X className="mt-[3px] h-4 w-4 shrink-0 text-muted" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-cobalt rounded-[12px] p-6">

              <p className="text-[15px] font-semibold text-ink">CowQ gives you:</p>
              <p className="mt-2 text-[14px] text-muted">Everything, from the same one photo.</p>
              <ul className="mt-5 space-y-3">
                {[
                  "The pictures — four styles, two sizes",
                  "The listing — title, description, bullets, tags",
                  "The posts — Instagram, WhatsApp, festival lines",
                  "The catalogue file — ready to import",
                  "Stock tracking that keeps your posts honest",
                  "And soon, the posting itself",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5 text-[14px] text-ink">
                    <Check
                      className="mt-[3px] h-4 w-4 shrink-0"
                      style={{ color: "var(--card-accent)" }}
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </SectionShell>

      {/* ================ CLOSE ================ */}
      <section className="px-6 pb-24 pt-8">
        <div className="mx-auto max-w-[640px] text-center">
          <Reveal>
            <h2 className="font-display text-[32px] leading-[1.05] tracking-[-0.03em] text-ink lg:text-[44px]">
              Try it on your own product. Free.
            </h2>
            <p className="mt-4 text-[15px] text-muted lg:text-[17px]">
              One photo. No account. Under a minute.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-8">
              <UploadWidget />
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

function CopyCard({
  label,
  children,
  tone = "card-cobalt",
}: {
  label: string;
  children: ReactNode;
  tone?: string;
}) {
  return (
    <div className={`${tone} rounded-[12px] p-4`}>
      <div className="flex items-center justify-between gap-3">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--card-accent)" }}
        >
          {label}
        </p>
        <CopyButton text={extractText(children)} />
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(" ");
  const el = node as { props?: { children?: ReactNode } };
  if (el.props?.children) return extractText(el.props.children);
  return "";
}

function SmallCard({
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
    <div className={`${tone} rounded-[12px] p-5`}>

      <span
        className="grid h-10 w-10 place-items-center rounded-[10px]"
        style={{
          background: "color-mix(in oklab, var(--card-accent) 16%, transparent)",
          color: "var(--card-accent)",
        }}
      >
        {icon}
      </span>
      <p className="mt-4 text-[15px] font-semibold text-ink">{title}</p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{body}</p>
    </div>
  );
}
