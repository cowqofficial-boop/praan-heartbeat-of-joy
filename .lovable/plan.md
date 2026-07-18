# Razorpay Payments & Credit System

## Overview

Add a full credit + subscription system to PRAAN using Razorpay. Free tier gains a watermark, paid tiers remove it and unlock features (calendar for Growth+).

## Database (new migration)

**`plans` (seed table)** — static catalog of plans/packs
- `id` (text pk: `free`, `starter_m`, `starter_y`, `growth_m`, `growth_y`, `pro_m`, `pro_y`, `pack_10`, `pack_25`, `pack_60`)
- `kind` (`subscription` | `pack` | `free`), `name`, `credits`, `price_inr`, `interval` (`month` | `year` | null), `features` jsonb

**`user_credits`**
- `user_id` pk, `plan_id` (current active plan), `subscription_credits` (resets on renewal), `pack_credits` (never expire), `period_start`, `period_end`, `razorpay_subscription_id`, `updated_at`
- View helper: `total_credits = subscription_credits + pack_credits`

**`payments`** (invoice history)
- `id`, `user_id`, `razorpay_payment_id`, `razorpay_order_id`, `razorpay_subscription_id` (nullable), `plan_id`, `amount_inr`, `credits_granted`, `status` (`created`/`paid`/`failed`), `invoice_url`, `created_at`

All tables: RLS scoped to `auth.uid()`, GRANTs for authenticated + service_role.

## Backend

**Secrets**: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (via `add_secret`).

**Server functions** (`src/lib/billing.functions.ts`):
- `getMyCredits()` — balance + plan for header/UI
- `getMyPayments()` — invoice history
- `createOrder({ planId })` — creates Razorpay order (one-time packs) or subscription; returns checkout params
- `verifyPayment({ ... })` — verifies signature client-side callback (belt-and-suspenders)

**Webhook route** `src/routes/api/public/razorpay-webhook.ts`:
- Verifies HMAC signature
- Handles `payment.captured`, `subscription.charged`, `subscription.cancelled`
- Grants credits atomically (packs → `pack_credits`, subs → resets `subscription_credits` and updates `period_end`)
- Records payment row + invoice URL

**Credit consumption**:
- Wrap existing `generateOnePost`, `generateCopyAndSave`, and the initial product-generation entrypoint with a `consumeCredit(userId)` helper that deducts 1 credit atomically. Prefers `subscription_credits` first, then `pack_credits`.
- Anonymous path unchanged (browser_id, 1 free).
- Signed-in without paid plan: 3 free lifetime credits (tracked via `subscription_credits` on `free` plan seeded at signup).

**Watermark**:
- New `applyWatermark(imageBase64)` helper server-side using canvas/sharp-free approach — actually simpler: pass a `watermark: true` flag into image generation prompt so Gemini adds "Made with PRAAN" text corner. Fallback: overlay via server-side canvas using `@napi-rs/canvas` if worker supports; else client-side draw at display/download time.
- Decision: **client-side overlay at download time** using canvas — reliable on Cloudflare Worker runtime. Display shows watermark badge overlay in `<img>` container for free users too.

## Frontend

**Pricing page** `/pricing`:
- Toggle: Monthly / **Annual (2 months free)** — annual pre-selected
- Three subscription cards (Starter/Growth/Pro) with feature list
- "One-time packs" section below (10/25/60)
- CTA per card → Razorpay Checkout modal (loads `checkout.razorpay.com/v1/checkout.js`)

**Header credit badge** (added to library, calendar, results):
- `<CreditBadge />` component reads `getMyCredits` via useQuery
- Shows `⚡ 12 left` — click → `/pricing`

**Out-of-credits modal**:
- Friendly banner "You've used your products for this month" + Upgrade button
- Replaces generation attempt when balance is 0

**Billing page** `/billing`:
- Current plan card (name, renewal date, credits used/remaining this period)
- Cancel subscription button (calls Razorpay API)
- Invoice history table with download links

**Calendar gating**:
- `/calendar` checks plan; if `free`/`starter_*`/`pack_*` → shows locked state: "The Calendar plans 30 days of posts for you. Available on Growth and Pro." + Upgrade button
- Growth/Pro → normal calendar

**Brand kit gating**:
- Already accessible; keep as-is but note in pricing that Growth+ formally includes it (Starter can still access but this matches spec — actually spec says Starter doesn't list brand kit; keep it available since it's already built and useful. Only calendar is explicitly locked).

**Watermark**:
- Free plan images show a small "Made with PRAAN" tag in bottom-right corner via CSS overlay in display
- On download (ZIP or single image), draw watermark onto canvas before saving

## Files

**New**:
- `supabase/migrations/*_billing.sql`
- `src/lib/billing.functions.ts`
- `src/lib/razorpay.server.ts` (SDK wrapper)
- `src/routes/api/public/razorpay-webhook.ts`
- `src/routes/pricing.tsx`
- `src/routes/billing.tsx`
- `src/components/CreditBadge.tsx`
- `src/components/UpgradeModal.tsx`
- `src/lib/watermark.ts` (client canvas helper)

**Modified**:
- `src/lib/praan.functions.ts` — consume credit, tag images with watermark flag
- `src/lib/calendar.functions.ts` — consume credit per post
- `src/routes/index.tsx`, `library.tsx`, `calendar.tsx`, `results.$id.tsx` — add CreditBadge, watermark overlay
- `src/routes/calendar.tsx` — plan gate
- `src/routes/auth/callback.tsx` — seed `user_credits` row with 3 free credits on first signup

## Pricing math (verification)

- Annual = monthly × 10 (2 months free): Starter ₹9,990/yr, Growth ₹29,990/yr, Pro ₹69,990/yr

## Open questions

1. **Watermark placement**: I'll do bottom-right corner, semi-transparent white text on dark pill background — matches brand.
2. **Credit cost per action**: 1 credit = 1 product generation (initial 4-photo + copy + CSV bundle). Calendar posts also cost 1 credit each. Confirm?
3. **Razorpay account**: You'll need to create Razorpay Plans (for subscriptions) in the Razorpay dashboard and paste the plan IDs, OR I create them via API on first use. I'll do API-on-first-use to avoid manual setup.
