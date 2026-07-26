## Group E — Billing & invoicing

**E1. GST details (Billing)**
Migration adds `gstin`, `invoice_business_name`, `invoice_address`, `invoice_state_code` to `profiles`. New "GST details" card on `/billing` (own tint in the cycle) with the nudge line "Add your GST details to get a GST invoice on every payment." GSTIN is validated loosely (15 alphanumeric chars, uppercased) — a soft magenta hint appears if it doesn't look right, but saving is never blocked. Saved through a new authenticated server fn; Profile → Account reads the same fields.

**E2. Invoices**
- Migration adds an `invoices` table (user, payment ref, sequential `invoice_no` via a Postgres sequence + `CowQ/2026-27/000123` format, buyer snapshot, taxable value, CGST/SGST/IGST, total) with owner-only RLS and grants.
- On successful payment (Razorpay webhook path, where credits are already granted) an invoice row is created. Tax at 18% on a reverse-computed taxable value: IGST 18% when the buyer's GSTIN state code differs from the seller state, otherwise CGST 9% + SGST 9%. No GST details on file → the same row is rendered as a plain payment receipt.
- New printable invoice page `/invoice/$id` (own route, auth-gated read via server fn) styled as a clean white A4-style document with a print/download button (browser print-to-PDF). Seller block is an explicit placeholder: `SELLER_LEGAL_NAME / SELLER_GSTIN / SELLER_ADDRESS` in one constant so the founder edits one file.
- "Invoice history" list on `/billing` (date, invoice no, plan, amount, Download).

**E3. Inline upgrade + top-ups on Billing**
Below the current-plan card: compact cards for only the plans above the current one (key difference + price) each with an "Upgrade" button, plus a "Top up credits" section with the four packs (300/₹599, 800/₹1,399, 2,000/₹3,199, 5,000/₹7,499). Both reuse the existing `createCheckout` + Razorpay script flow lifted out of `/pricing` into a shared `useRazorpayCheckout` hook — no navigation to Pricing.

**E4. Honest storage tiers**
`planRetention()` added to `src/lib/plans.ts`: Free 30 days (files removed, product record kept so it can be regenerated), Starter 6 months while subscribed, Growth and Pro kept while subscribed (Pro also priority). Shown as a "Your photos" block on Billing and in Profile → Plan & usage, worded generously ("Your photos stay with you for as long as you're on CowQ") and never using the word "unlimited". The existing `pruneExpiredGeneratedFiles` helper gets wired to plan-based retention and runs on library/results access for free users (cheap, guarded) — no new infrastructure.

## Group F — Content & visual polish

**F1.** Rename every "Shopify catalog file"/"Shopify" reference in `index.tsx`, `how-it-works.tsx`, `results.$id.tsx`, `library.tsx`, `create.tsx`, `csv.ts`, `bulk-download.ts`, `blog.flat-lay-guide.tsx` to "Website catalog file" with the subline "Works with Shopify, WooCommerce, Amazon, Flipkart and more." The preview becomes a document-style card: `products.csv` filename header bar, CSV badge, monospaced column headers, subtle grid lines, download affordance.

**F2.** "Built next" reordered: Posting everywhere (September) first, then the newer items. The video card becomes "Product & presenter videos — rolling out"; all "months away" wording removed.

**F3/F4.** Generate realistic paired imagery: four before/after sets (brass diya, saree, jewellery, packaged good) where the "before" reads as a dim casual phone snap and the "after" as a studio result, plus ~4 additional showcase studio samples across varied products. Uploaded as CDN assets and wired into the before/after slider and studio showcase.

**F5.** Upload box carousel: when the drop zone is empty, ~10 example product photos cross-fade beside/behind it at low opacity. Pauses on hover/focus, disabled under `prefers-reduced-motion`, images lazy-loaded and unmounted the moment a file is selected, so uploads are never delayed.

**F6.** `/how-it-works` audit pass: back button uses history with `/` fallback, brass-diya worked example flows through all steps, comparison strip intact, images load, no horizontal overflow at 390px, and a line noting video is rolling out.

**F7.** Chrome-only premium pass in `styles.css` and section shells: deeper ambient gradients on dark sections, larger confident display headers, crisper card shadow/glow tokens, slightly more vertical rhythm, smoother staggered entrance (reduced-motion respected). Layout, palette, tints and product imagery untouched.

## Group G — Guidance

**G1.** Move the tour/help trigger on `/profile` into the page header row, matching the "?" placement on every other page; remove the floating/overlapping instance.

**G2.** Calendar explainer: a short collapsible intro block (and matching expanded "?" help) with five scannable lines — what it is, how it works, where posts go (download/copy now; auto-posting to Instagram & Facebook in September), when to use it, why it helps. Dismissible and remembered per user.

## Verification

Playwright sweep of `/`, `/how-it-works`, `/pricing`, `/library`, `/stock`, `/billing`, `/calendar`, `/brand-kit`, `/profile` at 390/820/1440 with a console-error assertion, plus checks that an invoice renders and downloads, GST fields save and reload, upgrade/top-up buttons appear on Billing, "Website catalog file" appears with no stray "Shopify catalog" text, the calendar explainer renders, and the profile tour button sits in the header. Anonymous free-product flow and credit deduction are re-run to confirm they still work.

### Technical notes
- One migration: profile GST columns + `invoices` table (sequence, RLS, grants).
- Invoice numbering is DB-sequential per financial year, so it stays gap-free and audit-friendly.
- Checkout logic is shared, not duplicated, between `/pricing` and `/billing`.
