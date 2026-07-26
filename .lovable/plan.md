## Modular AI Editing & Partial Regeneration

Today a generation (`generations` row) is one blob: `copy` JSON + `generated_images` JSON. Any change means a full 90-credit rerun. This turns each output into independently editable, independently regenerable, individually versioned components — without duplicating the parent record.

### Scope of this build (Stage 1)

Components covered now: **Title, Description, Bullets/Features, Hashtags, CTA, SEO metadata + alt text, and each individual image (1-4)**, for both Products and Services.

Deliberately deferred to a later stage (they need their own scoping): pricing/package cards, video audio track, video thumbnail, inpainting/upscale/canvas-expand image ops, translations, and the future-expansion list. The schema is built so they slot in with no structural change.

### How it will work for the seller

Results page becomes a stack of component cards. Each card shows its content, an inline editable field (manual edits are free and autosave), and its own action row:

- **Edit** — inline, free, saves on blur with a "Saved" indicator
- **Improve** — a small menu per component type (Shorten, Expand, Make premium, Make persuasive, Friendly, Fix grammar, Change tone) for text; (Regenerate this photo, Change angle, Change lighting, Change background) for images
- **History** — previous versions with timestamp and an AI/You badge, one-tap restore
- Every AI action shows its credit cost on the button, and opens a confirm sheet: what changes, what it costs, what stays untouched. Cancel / Continue.

"Regenerate everything" stays, moved to the bottom of the page, visually separated, labelled with the full 90-credit cost.

Restoring or regenerating one component never touches the others. Only that card re-renders and refetches.

### Credit costs (new entries in the existing `COSTS` table)

| Action | Credits |
|---|---|
| Rewrite one text component (title, description, bullets, benefits, CTA, SEO) | 5 |
| Regenerate hashtags | 5 |
| Regenerate one image | 25 |
| Manual edit | 0 |
| Full regeneration | 90 (unchanged) |

All deductions go through the existing `spend_credits` RPC via `spendOrThrow` — no new credit path. If the AI call fails, credits are refunded through the existing `refund_credits` function and the old content is left intact.

### Technical details

**Schema** — one new migration, two tables:

- `generation_components`: `id`, `generation_id` (FK cascade), `user_id`, `component_type` (text, open-ended so future types need no migration), `component_key` (e.g. `image_2`, null for singletons), `content` (jsonb), `updated_at`, `updated_by` ('ai' | 'seller'), `credits_spent_total`, `metadata` jsonb. Unique on (generation_id, component_type, component_key).
- `generation_component_versions`: `id`, `component_id` (FK cascade), `content` jsonb, `source` ('ai'|'seller'), `credits_spent`, `created_at`.

Both get GRANTs for `authenticated` + `service_role`, RLS on, owner-scoped policies via `auth.uid() = user_id` (versions scoped through an EXISTS on the parent component). Version rows are capped at the 10 most recent per component by a trim on insert.

**Backfill/adapter** — existing rows keep `copy`/`generated_images` as the source of truth. A `getComponents` server fn materialises components lazily on first read of a generation, and every component write mirrors back into `copy`/`generated_images` so the library, shop, CSV, calendar and video pipelines keep working untouched.

**Server functions** — new `src/lib/components.functions.ts`:
- `listComponents({ generationId })`
- `saveComponent({ componentId, content })` — free, seller source, pushes a version
- `regenerateComponent({ componentId, instruction })` — authorises owner, runs the same brand-memory + safety/guardrail prompt assembly used by full generation (shared helper extracted from `cowq.functions.ts` / `service.server.ts` so partial and full generation cannot diverge), spends credits, writes a version, refunds on failure
- `restoreComponentVersion({ versionId })` — free

Text goes through Gemini text; images through the existing `gemini-3-pro-image` path with the original photo + brand memory as reference, so the regenerated image matches the set.

**Safety** — partial regeneration reuses the identical sanitiser and guardrail prompt block as full generation (no people/child/face-clone rules, no fabricated claims or fake reviews, custom-instruction sanitising). Seller-supplied instructions ("change tone to…") are sanitised on the same path as custom-look text.

**Client** — new `ComponentCard`, `ComponentActions`, `RegenerateConfirmSheet`, `VersionHistorySheet` components. TanStack Query per-generation component list with optimistic updates on manual edits and targeted invalidation of the single component on regenerate. Mobile-first: 56px action row, bottom sheets rather than dialogs, full keyboard focus management and ARIA labels on every control.

**Learning engine** — every manual edit continues to log a `brand_memory_events` "edited" signal, now tagged with the component type, so brand memory gets finer-grained feedback.

### Out of scope
No layout, palette, or navigation changes. Existing full-generation flow, queue, library, shop and calendar behaviour stay as they are.
