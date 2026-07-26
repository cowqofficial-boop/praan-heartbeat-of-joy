## Brand Memory — Stage 1

Sellers define their brand once, in plain language, and every future generation uses it automatically. Learning stays off for now, but we start recording the signals so the learning engine can be switched on later without rework.

### 1. Brand Memory data (extends the existing Brand Kit)

One new structured record per seller, stored alongside the current brand kit — no duplicate storage of logo, colours or model.

- **Identity**: brand name, category, industry, audience, mission, personality
- **Voice**: multiple descriptors (warm, premium, bold, traditional…)
- **Communication style**: sentence length, formality, energy, persuasiveness, emoji usage, storytelling, promo intensity
- **Caption preferences**: length, opening style, CTA placement, ending, formatting
- **Hashtags**: count, branded / local / niche / minimal / none
- **Photography defaults**: white background, lifestyle, studio, flat lay, dark luxury, bright minimal, rustic, outdoor…
- **Per-surface overrides**: product description, product title, marketplace listing, SEO description, Instagram, Facebook, WhatsApp, email
- **Housekeeping**: version number, revision history, change log, last confirmed date, and empty slots for learned values + confidence scores (unused in stage 1)

Strict per-account isolation: the record is owned by the seller, readable and writable only by them, never read across accounts.

### 2. Brand voice editor — new Profile tab

New "Brand voice" tab beside Account / My shop, written in plain language, no AI jargon:

- "My brand sounds…" (chips, multi-select)
- "My customers are…"
- "I prefer captions that are…" (short & punchy / detailed / informative / luxury)
- "My usual call-to-action is…"
- "I avoid…" (free text)
- Emoji usage, hashtag style, photo look
- Optional "Fine-tune per channel" accordion for the per-surface overrides

Mobile-first, keyboard accessible, labelled fields, visible focus states, AA contrast. Live example preview showing a sample caption written in the chosen voice, plus a **Current → New** diff with explicit Save confirmation whenever the memory changes.

Existing Brand Kit page keeps logo, colours and model, and links across to Brand voice.

### 3. Injection into generation

A single builder converts the structured record into prompt text, used by every generation path: product copy, service copy and posters, calendar captions and hashtags, and image style selection. Model-agnostic — it emits plain instruction text, so swapping the AI provider later changes nothing here.

Photography defaults bias the style set chosen for each generation, still overridable per product.

### 4. Guardrails

Brand Memory may shape tone, vocabulary, formatting and visual direction only. It is inserted below the safety block and can never relax existing rules: no fake reviews or testimonials, no fabricated claims, no fake urgency or scarcity, no medical or financial advice, no minors, no face-cloning, plus the existing banned-phrase and "concrete fact per bullet" copy rules. Free-text fields are sanitised the same way custom-look already is.

### 5. Signal capture (recorded now, learned from later)

- Generated copy blocks in Results and Calendar become editable and save the seller's version alongside the original
- Each save records what changed (tone, length, emoji, CTA, hashtags) as an event
- Lightweight events too: regenerate, copy-to-clipboard, marked posted, deleted
- Abandoned drafts are not recorded
- No inference, no suggestions, no automatic changes in this stage — the events simply accumulate

### Technical notes

- New `brand_memory` table keyed to the user with a JSON preferences document, `version`, `history`, and a `brand_memory_events` table for signals. Both RLS-scoped to `auth.uid()` with explicit grants; no anon access.
- New `src/lib/brand-memory.ts` (types + defaults), `brand-memory.functions.ts` (load/save/diff server fns via `requireSupabaseAuth`), and `brand-memory.server.ts` (prompt builder + sanitiser).
- Call sites updated: `cowq.functions.ts`, `service.server.ts`, `calendar.functions.ts`.
- New route `src/routes/_authenticated/profile/brand-voice.tsx`; tab added to the profile layout.
- Migration runs first and needs your approval before the code lands.

### Not in this stage

Confidence scores, "we've noticed you rewrite captions…" suggestions, acceptance-rate and brand-consistency analytics. These build directly on the events captured above.
