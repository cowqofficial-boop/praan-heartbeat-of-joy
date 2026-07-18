
# PRAAN — plan

A mobile-first web app for Indian small sellers. Upload one product photo, get studio photos, sales copy, and a Shopify CSV. Four screens, no login, no payment.

## Backend (Lovable Cloud + Lovable AI Gateway)

Enable Lovable Cloud. All AI calls go through the built-in gateway — no external keys.

Tables:
- `generations` — id, created_at, browser_id (client UUID in localStorage), original_image_url, product_name, price, detail, category, generated_images (jsonb: [{url, kind, ratio}]), copy (jsonb: title, description, bullets, tags, instagram, whatsapp, festival), csv_url, feedback_rating (int), feedback_text (text).
- `daily_usage` — browser_id, date, count. Unique on (browser_id, date). Used for the 5/day rate limit.

Storage bucket `praan` (public read) for uploaded originals, generated images, and CSVs.

RLS: public insert/select via anon (no auth in v1). Grants per public-schema rules.

Server functions (TanStack `createServerFn`):
1. `identifyProduct({ imageUrl })` — vision call to `google/gemini-3-pro` returning structured JSON `{ name, category, material, color, features[3] }`. Uses `Output.object` with a small strict-free schema.
2. `generateListing({ generationId, name, price, detail })` — enforces daily limit (increments `daily_usage`, throws friendly limit error if >5), then:
   - Runs 4 parallel image edits with `google/gemini-3-pro-image` using uploaded photo as input reference: (1) white bg e-com, (2) soft studio neutral, (3) lifestyle scene by category, (4) styled flat-lay. For each, produce 1:1 and 9:16 = 8 total. Uploads results to storage.
   - Calls `openai/gpt-5.5` for copy (Indian e-com copywriter system prompt), returning structured JSON per the brief's constraints (title <200, 5 bullets, 15 tags, IG + hashtags, WA <300, festival line).
   - Builds Shopify CSV with the exact column set, uploads as file.
   - Writes row to `generations`, returns full payload.
3. `submitFeedback({ generationId, rating, text })` — updates row.

Progress streaming: `generateListing` isn't streamed. Instead the client shows the 3 sequential steps by calling three thin server fns in order — `identifyProduct` already ran on screen 2, so screen 3 calls: `startGeneration` (marks studying done immediately), `generateImages`, `generateCopy` — each resolves as its step completes, driving the checkmark UI. CSV assembly piggybacks on `generateCopy`.

Rate limit is checked at the top of `generateImages` so users hit the cap before spending image credits when possible.

## Frontend

Routes (TanStack):
- `/` — Screen 1 Upload
- `/confirm` — Screen 2 (holds uploaded file + AI-identified fields in a Zustand store; if state missing, redirect to `/`)
- `/generating` — Screen 3
- `/results/$id` — Screen 4 (loads from `generations` by id)

Global:
- `src/styles.css` sets the design tokens (colors, radius 12, Bricolage Grotesque + Inter loaded via `<link>` in `__root.tsx` head).
- Max-width 480px centered wrapper.
- Reusable `PrimaryButton` fixed to viewport bottom, 56px tall, full-width minus 20px margins.
- `CopyButton` — one-tap copy with "Copied" confirmation.
- Focus rings visible; body 16px, labels 15px.

Screen 1: single large tap target (label + hidden file input, `capture="environment"` for camera). One subtitle. Nothing else.

Screen 2: photo preview on top, three inputs (Name, Price ₹, One detail). Primary button "Create my listing" → navigates to `/generating` and kicks off the three-step pipeline.

Screen 3: three rows with a circle that fills as each step resolves. Copy exactly: "Studying your product", "Shooting studio photos", "Writing your listing". On success, navigate to `/results/{id}`. On failure, show a specific message ("Photos didn't come through" / "Copy didn't come through") + "Try again" button that retries only the failed step.

Screen 4 sections in order:
1. Photos — horizontal snap-scroll carousel of the 8 images, each with a download button. "Make more photos" button re-runs image step (counts against daily limit).
2. Before/after slider — signature element. Custom pointer/touch draggable divider. Original photo on the left half, first white-bg studio image on the right, marigold (#F5A623) 3px vertical handle with a circular grip. Below it: "Share this" button (uses `navigator.share` with the studio image + copy title).
3. Marketplace listing — title, description, bullets, tags. Each block has its own copy button.
4. Social — IG caption + hashtags, WhatsApp message, festival line. Each with copy button.
5. Download — "Download all photos" (zips client-side via `jszip`) + "Download catalog file (CSV)".
Bottom: thumbs up/down + optional text field → `submitFeedback`.

Rate-limit UI: when server throws the limit error, show the exact friendly line on the current screen and disable the primary action.

## PWA

`public/manifest.webmanifest` with name PRAAN, short_name PRAAN, theme #E0402F, background #FFFFFF, display standalone, icons (192, 512, maskable). Head tags in `__root.tsx`. No service worker (manifest-only per PWA skill).

## Files to add/change

- `src/styles.css` — tokens + font imports via link in root head.
- `src/routes/__root.tsx` — head metadata (title "PRAAN — one photo, everything you need to sell it", description, manifest, theme-color, font `<link>`s).
- `src/routes/index.tsx` — Screen 1.
- `src/routes/confirm.tsx` — Screen 2.
- `src/routes/generating.tsx` — Screen 3.
- `src/routes/results.$id.tsx` — Screen 4.
- `src/components/` — `PrimaryButton`, `CopyButton`, `BeforeAfterSlider`, `ProgressSteps`, `PhotoCarousel`.
- `src/lib/praan.functions.ts` — server functions listed above.
- `src/lib/praan-store.ts` — Zustand store for the upload → confirm → generating handoff.
- `src/lib/browser-id.ts` — localStorage UUID.
- `src/lib/csv.ts` — Shopify CSV builder.
- Migration for `generations`, `daily_usage`, storage bucket, grants, RLS.
- `public/manifest.webmanifest` + icons (generated).

## Out of scope for v1

Auth, payments, admin dashboard, service worker/offline, multi-language.
