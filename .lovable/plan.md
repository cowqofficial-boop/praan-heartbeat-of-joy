## Public seller shops — Stage 1

Every seller gets a shareable public storefront at `https://cowq.app/shop/<slug>`. Nothing is public until the seller turns it on: the shop starts unpublished and every listing starts hidden.

Analytics (views, clicks, charts) is deliberately left for Stage 2 — the tracking hooks will be designed in, but no dashboard this pass.

### What the seller gets

**Shop settings** (new tab in Profile → "My shop")
- Publish shop switch (off by default)
- Slug — auto-suggested from the Brand kit business name (`sharma-handloom`), editable, checked for uniqueness and reserved words
- Shop name, short bio, business category, city/region, country — prefilled from Brand kit / profile but stored separately so nothing private leaks
- Logo/profile image (reuses the brand-kit logo if present)
- Public contact: method (WhatsApp / phone / SMS / email) + the value the seller types here. Profile phone/email are never used.
- Public social links: Instagram, Facebook, LinkedIn, X, YouTube, Website. Empty fields are hidden; URLs validated.
- Copy shop link, Share (native share sheet), Preview shop. QR code left as a clearly marked later addition.

**Per-listing visibility**
- A "Show on my public shop" toggle on each generation and each stock item, default OFF, in the Library card menu, the results page, and the stock sheet.
- A listing appears publicly only if the shop is published AND the listing toggle is on AND the listing isn't archived/deleted.
- Bulk "show/hide" from the Library toolbar for convenience.

### The public page

Server-rendered, no auth, single 480-ish column on mobile widening to a grid on desktop, in the existing CowQ dark design language.

- Header: logo, shop name, bio, category, city/country, count of public listings, sticky "Contact on WhatsApp" (label follows the chosen method)
- Grid of public listings: image, title, price in ₹, short description, category, product/service badge, "Contact to buy". Services show their pricing/package card and booking CTA.
- Social row with real icons, `rel="noopener noreferrer"`
- Empty state: "This seller hasn't published any products yet." plus the Contact button
- Accessibility: semantic landmarks, alt text on every image, visible focus rings, 44px targets, AA contrast
- Performance: lazy-loaded responsive images, skeletons, no client-side data fetching for first paint, 1-hour edge cache

**SEO**: unique title `<Shop name> | CowQ`, unique description, canonical + og:url on `https://cowq.app/shop/<slug>`, og/twitter image from the shop logo or first listing photo, JSON-LD `Store` + `BreadcrumbList` + `Product`/`Service` entries, and every published shop added to `/sitemap.xml`. Unpublished or unknown slugs return a proper 404 with `noindex`.

### Technical notes

- Migration: new `shop_settings` table (user_id PK, slug unique, published, name, bio, category, city, region, country, logo_url, contact_method, contact_value, six social columns, timestamps) with owner-only write policies and a narrow `TO anon` SELECT policy limited to published shops. `generations` and `stock_items` each gain `public_visible boolean not null default false`, with an anon SELECT policy that only exposes rows whose owner's shop is published and whose flag is true. GRANTs included.
- Public reads go through a public server function using the publishable key (never the admin client), selecting an explicit safe column list — no credits, wallet, internal IDs, quantities, or owner UUIDs cross the boundary.
- Route `src/routes/shop.$slug.tsx` with a loader calling that public function; `head()` builds all meta and JSON-LD from loader data. `notFoundComponent` + `errorComponent` included.
- Shop URLs use the hardcoded `https://cowq.app` base you chose, via a single constant so it can be switched later. Note: those links will 404 until cowq.app is connected as a custom domain — the in-app Preview button uses the current domain so you can still test.
- Structure is left open for Stage 2: analytics event table, collections, reviews, search/filters slot into the same page shell without rework.

### Not in this pass
Analytics dashboard, QR codes, payments/checkout, reviews, custom domains per seller, store themes.
