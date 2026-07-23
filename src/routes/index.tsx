import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Sparkles, Package, Check } from "lucide-react";
import { UploadWidget } from "@/components/UploadWidget";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CowQ — One photo. A complete business, ready to sell." },
      {
        name: "description",
        content:
          "Upload one product photo. CowQ makes studio images, a full listing, social posts, and a Shopify catalog file — in under a minute. Your first product is free.",
      },
      { property: "og:title", content: "CowQ — One photo. A complete business, ready to sell." },
      {
        property: "og:description",
        content:
          "Studio photos, listings, social posts and a catalog file from one phone photo. Free to try.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://praan-heartbeat-of-joy.lovable.app/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://praan-heartbeat-of-joy.lovable.app/" }],
  }),
  component: Landing,
});

function Landing() {
  const { user } = useAuth();
  return (
    <main className="w-full">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 pt-6 lg:hidden">
        <span className="font-display text-[22px] leading-none text-ink">CowQ</span>
        <nav className="flex items-center gap-4 text-[14px] text-muted">
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

      {/* Hero */}
      <section className="px-5 pb-16 pt-10 lg:pt-16">
        <div className="mx-auto max-w-[680px] text-center">
          <h1 className="font-display text-[40px] leading-[1.02] text-ink sm:text-[52px] lg:text-[64px]">
            One photo. A complete business, ready to sell.
          </h1>
          <p className="mx-auto mt-5 max-w-[560px] text-[16px] text-muted lg:text-[18px]">
            Studio photos, listings, social posts and a catalog file — in under a minute.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-[560px]">
          <UploadWidget />
        </div>

        {!user && (
          <p className="mx-auto mt-5 max-w-[560px] text-center text-[13px] text-muted">
            Your first product is free — no account needed.{" "}
            <Link to="/auth" search={{ mode: "signup" }} className="font-medium text-ink underline">
              Sign up
            </Link>{" "}
            and get 3 more.
          </p>
        )}
      </section>

      {/* Section 1 — Before / After */}
      <section className="px-5 py-16 lg:py-24">
        <div className="mx-auto max-w-[900px]">
          <p className="eyebrow text-muted">The proof</p>
          <h2 className="mt-2 font-display text-[32px] leading-[1.05] text-ink lg:text-[44px]">
            Real photos, taken in real shops.
          </h2>
          <p className="mt-3 max-w-[560px] text-[15px] text-muted">
            Drag the slider. Left is the phone photo the seller sent us. Right is what CowQ made
            from it — no studio, no retouching, no waiting.
          </p>

          <div className="mt-10 space-y-8">
            <BeforeAfterPair
              beforeLabel="Phone photo, taken in a shop"
              afterLabel="What CowQ made"
              beforeTone="dim"
              afterTone="bright"
              caption="Handwoven cotton stole · Jaipur"
            />
            <div className="grid gap-8 md:grid-cols-2">
              <StaticPair caption="Brass diya set · Moradabad" />
              <StaticPair caption="Wireless speaker · Chennai" />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — Everything you get */}
      <section className="bg-surface px-5 py-16 lg:py-24">
        <div className="mx-auto max-w-[1000px]">
          <p className="eyebrow text-muted">One upload</p>
          <h2 className="mt-2 font-display text-[32px] leading-[1.05] text-ink lg:text-[44px]">
            Everything you get from one photo.
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Artefact title="4 studio photos" >
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

            <Artefact title="Marketplace listing">
              <div className="rounded-[10px] bg-raised p-3 text-left">
                <p className="text-[13px] font-semibold text-ink">
                  Handwoven cotton stole, natural dye, 200 × 70 cm
                </p>
                <p className="mt-2 text-[11px] leading-snug text-muted">
                  Three tight paragraphs of description, five plain bullets of facts, fifteen search
                  tags — written the way sellers actually talk.
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

            <Artefact title="Social posts">
              <div className="space-y-2">
                <div className="rounded-[10px] bg-raised p-3 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-marigold">
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
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-marigold">
                    WhatsApp broadcast
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-ink">
                    New handloom stoles just came in. ₹1,499 with free shipping today.
                  </p>
                </div>
                <div className="rounded-[10px] bg-raised p-3 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-marigold">
                    Festival line
                  </p>
                  <p className="mt-1 text-[12px] leading-snug text-ink">
                    Diwali gifting — order by Sunday to reach in time.
                  </p>
                </div>
              </div>
            </Artefact>

            <Artefact title="Shopify catalog file" wide>
              <div className="overflow-hidden rounded-[10px] bg-raised">
                <div className="grid grid-cols-6 gap-2 border-b border-white/5 bg-background/40 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted">
                  <span>Handle</span>
                  <span className="col-span-2">Title</span>
                  <span>Vendor</span>
                  <span>Price</span>
                  <span>Image</span>
                </div>
                {[
                  ["stole-01", "Handwoven cotton stole", "Jaipur Loom", "₹1,499", "img_1.jpg"],
                  ["diya-set", "Brass diya set of 6", "Moradabad", "₹899", "img_1.jpg"],
                  ["speaker", "Wireless speaker", "Sound&Co", "₹2,999", "img_1.jpg"],
                ].map((r) => (
                  <div
                    key={r[0]}
                    className="grid grid-cols-6 gap-2 px-3 py-2 font-mono text-[11px] text-ink"
                  >
                    <span>{r[0]}</span>
                    <span className="col-span-2 truncate">{r[1]}</span>
                    <span className="truncate text-muted">{r[2]}</span>
                    <span>{r[3]}</span>
                    <span className="truncate text-muted">{r[4]}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[12px] text-muted">
                Imports straight into Shopify. Same file works for Amazon and Flipkart.
              </p>
            </Artefact>
          </div>
        </div>
      </section>

      {/* Section 3 — How it works */}
      <section className="px-5 py-16 lg:py-24">
        <div className="mx-auto max-w-[1000px]">
          <p className="eyebrow text-muted">How it works</p>
          <h2 className="mt-2 font-display text-[32px] leading-[1.05] text-ink lg:text-[44px]">
            Three steps. Under a minute.
          </h2>

          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            <Step
              n="1"
              icon={<Camera className="h-5 w-5" />}
              title="Photograph your product."
              body="Any phone, any table. No lights, no studio, no props."
            />
            <Step
              n="2"
              icon={<Sparkles className="h-5 w-5" />}
              title="CowQ studies it."
              body="It works out what it is, what it’s made of, and who buys it."
            />
            <Step
              n="3"
              icon={<Package className="h-5 w-5" />}
              title="Everything arrives."
              body="Photos, listing, posts, catalog file — under a minute."
            />
          </ol>
        </div>
      </section>

      {/* Section 4 — What it replaces */}
      <section className="bg-surface px-5 py-16 lg:py-24">
        <div className="mx-auto max-w-[720px]">
          <p className="eyebrow text-muted">What it replaces</p>
          <h2 className="mt-2 font-display text-[32px] leading-[1.05] text-ink lg:text-[44px]">
            The people you’d otherwise pay.
          </h2>
          <p className="mt-3 text-[15px] text-muted">
            A single product listing, done properly, usually needs four people. Here’s what each of
            them charges — before we get to their time.
          </p>

          <div className="mt-10 divide-y divide-white/5 rounded-[14px] bg-raised">
            {[
              { role: "Product photographer", note: "half-day shoot, one product", cost: 3500 },
              { role: "Copywriter", note: "title, description, bullets, tags", cost: 1200 },
              { role: "Social media manager", note: "Instagram + WhatsApp posts", cost: 800 },
              { role: "Catalog assistant", note: "Shopify / Amazon CSV", cost: 500 },
            ].map((r) => (
              <div key={r.role} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-[15px] font-medium text-ink">{r.role}</p>
                  <p className="text-[12px] text-muted">{r.note}</p>
                </div>
                <p className="font-mono text-[15px] text-ink">
                  ₹{r.cost.toLocaleString("en-IN")}
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between px-5 py-4">
              <p className="text-[15px] font-medium text-ink">Total, per product</p>
              <p className="font-mono text-[18px] font-semibold text-ink">₹6,000</p>
            </div>
          </div>

          <div className="mt-8 rounded-[14px] bg-background p-6">
            <p className="text-[13px] uppercase tracking-wider text-muted">CowQ</p>
            <p className="mt-1 font-display text-[32px] leading-none text-ink">
              ₹90 <span className="text-[15px] font-normal text-muted">per product</span>
            </p>
            <p className="mt-2 text-[14px] text-muted">
              Same output. One upload. Under a minute.
            </p>
            <Link
              to="/create"
              className="mt-6 inline-flex h-12 items-center rounded-[12px] bg-primary px-5 text-[15px] font-semibold text-primary-foreground"
            >
              Try it with your photo
            </Link>
          </div>
        </div>
      </section>

      <footer className="px-5 py-10 text-center text-[12px] text-muted">
        CowQ · Complete Operations With Quality
      </footer>
    </main>
  );
}

function BeforeAfterPair({
  beforeLabel,
  afterLabel,
  caption,
}: {
  beforeLabel: string;
  afterLabel: string;
  beforeTone?: string;
  afterTone?: string;
  caption?: string;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 overflow-hidden rounded-[16px] bg-surface">
        <div className="relative aspect-[4/5]">
          <PlaceholderShot tone="dim" />
          <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
            {beforeLabel}
          </span>
        </div>
        <div className="relative aspect-[4/5]">
          <PlaceholderShot tone="bright" />
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
            {afterLabel}
          </span>
        </div>
      </div>
      {caption && <p className="mt-2 text-[12px] text-muted">{caption}</p>}
    </div>
  );
}

function StaticPair({ caption }: { caption: string }) {
  return (
    <div>
      <div className="grid grid-cols-2 overflow-hidden rounded-[16px] bg-surface">
        <div className="relative aspect-[4/5]">
          <PlaceholderShot tone="dim" />
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            Phone
          </span>
        </div>
        <div className="relative aspect-[4/5]">
          <PlaceholderShot tone="bright" />
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
            CowQ
          </span>
        </div>
      </div>
      <p className="mt-2 text-[12px] text-muted">{caption}</p>
    </div>
  );
}

function PlaceholderShot({ tone }: { tone: "dim" | "bright" }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          tone === "dim"
            ? "linear-gradient(135deg, #2a2620 0%, #1a1815 100%)"
            : "linear-gradient(135deg, #f5efe4 0%, #e8dcc4 100%)",
      }}
    />
  );
}

function Artefact({
  title,
  children,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-[16px] bg-background p-5 ${wide ? "md:col-span-3" : ""}`}>
      <div className="mb-3 flex items-center gap-2">
        <Check className="h-4 w-4 text-marigold" />
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
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <li className="rounded-[16px] bg-surface p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-raised font-mono text-[13px] text-ink">
          {n}
        </span>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-raised text-marigold">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-[17px] font-semibold text-ink">{title}</p>
      <p className="mt-2 text-[14px] text-muted">{body}</p>
    </li>
  );
}
