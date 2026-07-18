import { createFileRoute, Link } from "@tanstack/react-router";

const URL = "https://praan-heartbeat-of-joy.lovable.app/blog/flat-lay-guide";
const TITLE = "Flat Lay Product Photography: How to Shoot Perfect Photos with Your Phone";
const DESCRIPTION =
  "A practical flat lay product photography guide for Indian sellers: phone setup, lighting, backgrounds, styling, and how to hand the result to PRAAN for AI-enhanced marketplace photos.";

export const Route = createFileRoute("/blog/flat-lay-guide")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESCRIPTION,
          mainEntityOfPage: URL,
          author: { "@type": "Organization", name: "PRAAN" },
          publisher: {
            "@type": "Organization",
            name: "PRAAN",
            logo: {
              "@type": "ImageObject",
              url: "https://praan-heartbeat-of-joy.lovable.app/icon-512.png",
            },
          },
        }),
      },
    ],
  }),
  component: Guide,
});

function Guide() {
  return (
    <main className="flex min-h-screen flex-col gap-6 px-5 pb-16 pt-10">
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
        Guide
      </p>
      <h1 className="font-display text-[32px] leading-tight text-ink">
        Flat Lay Product Photography: How to Shoot Perfect Photos with Your Phone
      </h1>
      <p className="text-[15px] text-muted">
        A phone, a window, and a clean surface is enough. Here is exactly how to
        shoot a flat lay product photo you can hand to PRAAN for studio-quality
        marketplace images.
      </p>

      <Section title="What is a flat lay?">
        <p>
          A flat lay is a photograph taken from directly above, with the product
          arranged on a flat surface. It is the fastest, most repeatable style
          for e-commerce because you control every variable: the background,
          the light, and the framing. Marketplaces like Amazon, Flipkart, and
          Meesho all accept flat lays as the primary product image.
        </p>
      </Section>

      <Section title="Set up the surface">
        <ul className="list-disc pl-5">
          <li>Use a plain white or light-grey surface — a sheet of chart paper or a bedsheet works.</li>
          <li>Iron out folds. Wrinkles show up more than you expect.</li>
          <li>Give the product a hand-width of empty space on all four sides.</li>
        </ul>
      </Section>

      <Section title="Light it with a window">
        <ul className="list-disc pl-5">
          <li>Shoot near a north-facing window between 10 AM and 4 PM.</li>
          <li>Turn off ceiling tubelights — they cast a yellow-green tint.</li>
          <li>If one side is dark, prop a piece of white paper as a bounce.</li>
        </ul>
      </Section>

      <Section title="Hold the phone parallel">
        <ul className="list-disc pl-5">
          <li>Stand directly above the product, phone parallel to the floor.</li>
          <li>Tap the product on screen to lock focus and exposure.</li>
          <li>Use the phone's main camera — never the ultra-wide, which distorts edges.</li>
          <li>Shoot in the highest resolution setting, not "square" mode.</li>
        </ul>
      </Section>

      <Section title="Style it with 2–3 props, not 10">
        <p>
          Props exist to hint at use, not to compete with the product. Pick two
          or three that share the product's world — a wooden spoon next to a
          steel dabba, a diya beside a brass pot. Keep them smaller than the
          product and off to one side.
        </p>
      </Section>

      <Section title="Common mistakes">
        <ul className="list-disc pl-5">
          <li><strong>Shadows on the product.</strong> Move to indirect window light.</li>
          <li><strong>Tilted angle.</strong> Use the phone grid to align edges.</li>
          <li><strong>Cluttered background.</strong> Reset the surface between shots.</li>
          <li><strong>Yellow cast.</strong> Turn off indoor bulbs; daylight only.</li>
        </ul>
      </Section>

      <Section title="From flat lay to marketplace-ready with PRAAN">
        <p>
          Once you have one clean phone photo, upload it to PRAAN. The app
          generates four studio variants (white background, soft studio,
          lifestyle scene, and enhanced flat-lay) in both square (1:1) and
          vertical (9:16) sizes, plus the full listing text and a Shopify
          catalog CSV. You do the shooting; PRAAN does the polish.
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex h-12 items-center justify-center rounded-[12px] bg-primary px-5 text-[15px] font-semibold text-primary-foreground"
        >
          Try PRAAN with your photo
        </Link>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 text-[15px] leading-[1.55] text-ink">
      <h2 className="font-display text-[22px] leading-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}
