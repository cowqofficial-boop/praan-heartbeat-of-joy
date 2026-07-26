import { createFileRoute, notFound } from "@tanstack/react-router";
import { MapPin, Package, Store, Wrench } from "lucide-react";
import { getPublicShop } from "@/lib/shop.functions";
import {
  contactCta,
  contactHref,
  formatRupees,
  shopUrl,
  type PublicListing,
  type PublicShop,
} from "@/lib/shop";

export const Route = createFileRoute("/shop/$slug")({
  loader: async ({ params }) => {
    const result = await getPublicShop({ data: { slug: params.slug } });
    if (!result) throw notFound();
    return result;
  },
  head: ({ params, loaderData }) => {
    const url = shopUrl(params.slug);
    if (!loaderData) {
      return { meta: [{ title: "Shop unavailable — CowQ" }, { name: "robots", content: "noindex" }] };
    }
    const { shop, listings } = loaderData;
    const title = `${shop.shop_name} | CowQ`;
    const place = [shop.city, shop.region, shop.country].filter(Boolean).join(", ");
    const description =
      (shop.bio && shop.bio.slice(0, 155)) ||
      `${shop.shop_name}${shop.category ? ` — ${shop.category}` : ""}${place ? ` in ${place}` : ""}. ${listings.length} listing${listings.length === 1 ? "" : "s"} you can order directly.`;
    const image = shop.logo_url ?? listings.find((l) => l.image)?.image ?? null;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Store",
            name: shop.shop_name,
            description: shop.bio || description,
            url,
            ...(shop.logo_url ? { image: shop.logo_url } : {}),
            ...(shop.city || shop.country
              ? {
                  address: {
                    "@type": "PostalAddress",
                    addressLocality: shop.city || undefined,
                    addressRegion: shop.region || undefined,
                    addressCountry: shop.country || undefined,
                  },
                }
              : {}),
            sameAs: shop.socials.map((s) => s.url),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "CowQ shops", item: `${shopUrl("")}`.replace(/\/$/, "") },
              { "@type": "ListItem", position: 2, name: shop.shop_name, item: url },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: ShopNotFound,
  errorComponent: ShopNotFound,
  component: ShopPage,
});

function ShopNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center px-6 text-center">
      <Store className="h-8 w-8 text-muted" aria-hidden="true" />
      <h1 className="mt-4 text-[22px] font-semibold text-ink">This shop isn't available</h1>
      <p className="mt-2 text-[15px] text-muted">
        The link may be wrong, or the seller has taken their shop offline.
      </p>
      <a href="/" className="mt-6 text-[15px] font-semibold" style={{ color: "var(--cobalt)" }}>
        See what CowQ does
      </a>
    </main>
  );
}

function ShopPage() {
  const { shop, listings } = Route.useLoaderData() as {
    shop: PublicShop;
    listings: PublicListing[];
  };

  const place = [shop.city, shop.region, shop.country].filter(Boolean).join(", ");
  const href = contactHref(shop.contact_method, shop.contact_value, { shopName: shop.shop_name });
  const cta = contactCta(shop.contact_method);

  return (
    <main className="mx-auto w-full max-w-[720px] px-5 pb-28 pt-8">
      <header className="flex items-start gap-4">
        {shop.logo_url ? (
          <img
            src={shop.logo_url}
            alt={`${shop.shop_name} logo`}
            width={72}
            height={72}
            loading="eager"
            className="h-[72px] w-[72px] shrink-0 rounded-[14px] object-cover"
          />
        ) : (
          <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-[14px] bg-raised" aria-hidden="true">
            <Store className="h-7 w-7 text-muted" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-tight text-ink">{shop.shop_name}</h1>
          {shop.category && <p className="mt-1 text-[14px] text-muted">{shop.category}</p>}
          {place && (
            <p className="mt-1 flex items-center gap-1 text-[13px] text-muted">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {place}
            </p>
          )}
        </div>
      </header>

      {shop.bio && <p className="mt-4 text-[15px] leading-relaxed text-ink/90">{shop.bio}</p>}

      <p className="mt-3 text-[13px] text-muted">
        {listings.length} {listings.length === 1 ? "listing" : "listings"}
      </p>

      {shop.socials.length > 0 && (
        <nav aria-label="Seller links" className="mt-4 flex flex-wrap gap-2">
          {shop.socials.map((s) => (
            <a
              key={s.key}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex h-10 items-center rounded-[12px] px-3.5 text-[14px] font-semibold text-ink"
              style={{ background: "var(--raised)" }}
            >
              {s.label}
            </a>
          ))}
        </nav>
      )}

      <section aria-label="What this shop offers" className="mt-8">
        {listings.length === 0 ? (
          <div className="rounded-[14px] p-6 text-center" style={{ background: "var(--raised)" }}>
            <p className="text-[15px] text-ink">This seller hasn't published any products yet.</p>
            <p className="mt-1 text-[14px] text-muted">You can still get in touch.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {listings.map((item) => (
              <ListingCard key={item.id} item={item} shop={shop} />
            ))}
          </ul>
        )}
      </section>

      <footer className="mt-10 text-center text-[12px] text-muted">
        <a href="/" className="underline-offset-2 hover:underline">Shop page by CowQ</a>
      </footer>

      {href && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3" style={{ borderColor: "var(--line)", background: "color-mix(in oklab, var(--background) 92%, transparent)", backdropFilter: "blur(10px)" }}>
          <a
            href={href}
            target={shop.contact_method === "whatsapp" || shop.contact_method === "email" ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="mx-auto flex h-14 w-full max-w-[680px] items-center justify-center rounded-[12px] text-[16px] font-semibold text-primary-foreground"
            style={{ background: "var(--primary)" }}
          >
            {cta}
          </a>
        </div>
      )}
    </main>
  );
}

function ListingCard({ item, shop }: { item: PublicListing; shop: PublicShop }) {
  const price =
    formatRupees(item.price) ??
    (item.tiers.length
      ? `From ₹${item.tiers
          .map((t) => Number(t.price) || 0)
          .filter(Boolean)
          .sort((a, b) => a - b)[0] ?? ""}`
      : null);
  const href = contactHref(shop.contact_method, shop.contact_value, {
    shopName: shop.shop_name,
    itemName: item.name,
  });
  const Icon = item.kind === "service" ? Wrench : Package;

  return (
    <li className="overflow-hidden rounded-[14px]" style={{ background: "var(--raised)" }}>
      <div className="aspect-[4/5] w-full overflow-hidden bg-surface">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center" aria-hidden="true">
            <Icon className="h-6 w-6 text-muted" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h2 className="line-clamp-2 text-[14px] font-semibold text-ink">{item.name}</h2>
        {price && <p className="mt-1 text-[14px] text-ink">{price}</p>}
        {item.category && <p className="mt-0.5 text-[12px] text-muted">{item.category}</p>}
        {item.detail && <p className="mt-1 line-clamp-2 text-[12px] text-muted">{item.detail}</p>}
        {item.tiers.length > 0 && (
          <ul className="mt-2 grid gap-1">
            {item.tiers.map((t) => (
              <li key={t.name} className="text-[12px] text-muted">
                {t.name} — ₹{t.price}
              </li>
            ))}
          </ul>
        )}
        {href && (
          <a
            href={href}
            target={shop.contact_method === "whatsapp" || shop.contact_method === "email" ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="mt-3 flex h-11 items-center justify-center rounded-[12px] text-[13px] font-semibold text-ink"
            style={{ background: "color-mix(in oklab, var(--primary) 18%, transparent)" }}
          >
            Contact to buy
          </a>
        )}
      </div>
    </li>
  );
}
