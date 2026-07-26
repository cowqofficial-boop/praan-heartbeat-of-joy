## Goal

Sellers can create a **Service** anywhere they create a **Product** today. Both live in one library, one stock view, one calendar, one credit path.

## 1. Data model (one table, one type column)

Migration on `generations`:
- `kind text not null default 'product'` (`'product' | 'service'`)
- `service_details jsonb` — holds category, description, tiers, contact method
- index on `(user_id, kind, created_at desc)`

Migration on `stock_items`:
- `kind text not null default 'product'`
- Quantity/low-stock/movement fields stay untouched and are hidden for services; service rows keep `quantity = 0` and never appear in low-stock or restock UI.

Service details shape:

```text
{ category, description, contact: { method: 'phone'|'whatsapp'|'message', value },
  tiers: [ { name, price, inclusions: [..] } ]   // 1–3, or a single flat price
}
```

## 2. The toggle

A shared `TypeToggle` segmented control (Product | Service), placed in:
- `/create` upload screen — switches between the photo dropzone and the service form
- `/library` — filter tabs; cards get a small badge + icon per type
- `/stock` — filters the list; "Add" opens the matching form
- `/calendar` — source picker when scheduling a post can pick either type

Cards and detail views branch on `kind`: services show a single poster instead of the 4-angle carousel, and a pricing/tier card instead of a stock/photo grid.

## 3. Service form (`/create` → Service tab)

- Service name (required, red asterisk, same validation style as stock)
- Category — free text input with a suggestion datalist (haircut, tailoring, repair, consulting, home visit, tuition, catering…), not a fixed enum
- Optional photo — reuses the existing HEIC/resize/compress + direct-to-storage upload pipeline
- Short description of what's included
- Price: flat price, or "Add tiers" for 1–3 tiers, each with a name, price and 2–3 bullet inclusions
- Contact/booking method: phone, WhatsApp, or "message to book" (+ number where relevant)

## 4. What gets generated

Two paths through the existing Gemini server functions:

- **With photo** → one edited promotional poster from the real photo. Prompt explicitly forbids inventing "after" results, fake customers, fake reviewers, or altering a real person's face.
- **Without photo** → a typographic/iconographic poster. Prompt forbids photorealistic people or result imagery entirely.

Plus, for both: listing description + concrete bullets (what's included, how long it takes, why this seller), social captions + hashtags, a pricing/tier card rendered from the form, and a booking CTA line built from the chosen contact method. Copy prompts inherit the existing shopkeeper rules and banned-phrase list, adapted to services.

A **Make a video ad** button renders on the service results page but stays disabled behind `VIDEO_ENABLED` (currently off) — no fal.ai wiring.

## 5. Credits

Add to the existing `COSTS` table:
- `service_photo: 45`
- `service_no_photo: 90`

Both go through the same `startGenerationJob` reservation → `spend_credits` RPC → `refund_credits` on failure path used by products. No second deduction path. Every service generate button shows its number before it spends, matching the product rule.

## 6. Guardrails

Carried over unchanged: consent gate whenever an uploaded photo shows a real person, no face-cloning, no fake customer reviews, no fabricated before/after, and the same sanitizer applied to the free-text category and description before they reach the model.

## Out of scope this pass

No working video generation, no booking or availability logic — the CTA is text only.

## Technical notes

- New `src/lib/service.functions.ts` for service-specific server fns; image/copy generation reuses `gemini.server.ts` helpers and the `generation_jobs` reservation flow in `cowq.functions.ts`.
- `queue-store` gains a `kind` field so services run through the same background queue and status pill.
- `library.functions.ts` selects and filters on `kind`; `results.$id.tsx` branches its layout on `kind`.
- CSV export includes a type column so the catalog file stays valid for mixed libraries.
