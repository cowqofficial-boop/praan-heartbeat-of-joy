# CowQ MVP v1.0 — Implementation Roadmap
**Source of truth:** Product Bible v1.0 · Design DNA v1.1 · Engineering Handbook · AI Playbook · Database Blueprint
**Status:** Build Mode — Phase 1 (Monetization Proof)

---

## 0. Framing

This roadmap is not "build everything in the Bible." Per Chapter 18 (MVP Definition) and Chapter 19 (Version Strategy), the core photo→listing loop is **already built and already validated** — ten warm sellers have used it hands-on and reacted positively. What's unproven is *willingness to pay*.

This roadmap defines **MVP v1.0 = the smallest, most reliable, most trustworthy version of CowQ that ten real sellers will pay for today**, without waiting for auto-posting or video (Phase 2, Chapter 17). It intentionally **excludes**: video generation, auto-posting, referral system, native apps, multi-language, international expansion, marketplace network effects, and services/bookings depth — these are documented and deferred at the bottom, not forgotten.

Everything included below passes Chapter 16's three-test filter: **Promise Test → Founder-Seller Test → Invisible-AI Test.**

---

## 1. Milestones (dependency-ordered)

| # | Milestone | Why it's here / why now |
|---|---|---|
| **M0** | Foundation & Trust Repair | Nothing else should ship on top of a known credit-integrity bug and unaudited RLS. This is the floor. |
| **M1** | Core Loop Hardening | The generation loop already exists — it needs to be production-reliable before it's sold. |
| **M2** | Public Shop Page | Roadmap priority #1 (Ch.17). Doubles as sales collateral for converting the next cohort. |
| **M3** | Brand Memory | Roadmap priority #2. Makes every subsequent generation better with zero seller effort — the retention mechanic. |
| **M4** | Partial Editing / Regeneration | Roadmap priority #3. The validated, differentiated answer to the FlyAds complaint pattern. |
| **M5** | Commerce Essentials | Without cart → checkout → order → payment, sellers can show a shop but can't get paid *through* CowQ. |
| **M6** | Trust, Safety & Compliance | Required before strangers pay strangers; required before any public-facing launch. |
| **M7** | Retention Infrastructure | Notifications discipline + plain-language Insights — keeps the seller coming back without harassment. |
| **M8** | Launch Operations | Instrumentation, TTFV tracking, monitoring — needed to actually *learn* from Phase 1. |

Dependency logic: M2–M4 all read/write the same AI-generation and catalog tables that M0–M1 stabilize; M5 needs a live public shop (M2) to sell against; M6 gates anything customer-facing; M7–M8 wrap the whole thing for a real, monitored launch.

---

## 2. M0 — Foundation & Trust Repair

*Blocks everything else. No new AI feature merges until this is closed.*

| Feature | Priority | Complexity | Est. Time (Lovable + AI-assisted) | Depends on |
|---|---|---|---|---|
| Fix `generateBrandModelPortrait` credit bug — migrate off `spendOrThrow` to `spend_credits` RPC | **Must Have** | Small | 0.5–1 day | — |
| Codebase audit: verify **100% of credit-consuming features** route through `spend_credits` (manual pass, since CI script below doesn't exist yet) | **Must Have** | Small | 0.5 day | Bug fix |
| Add `audit-credit-deduction-paths.js` CI script (permanent guardrail, Eng. Handbook Ch.38) | **Must Have** | Small | 0.5 day | — |
| Three-part credit test suite (success deducts, failure deducts nothing, insufficient balance blocks pre-generation) for every existing credit-consuming feature | **Must Have** | Medium | 1–2 days | Bug fix |
| RLS audit across all tables — allow + deny case, especially `catalog_items`, `customers`, cross-seller isolation | **Must Have** | Medium | 1–2 days | — |
| `credit_costs` versioned config table + `get_credit_cost(action_type)` so displayed cost never drifts from charged cost | **Must Have** | Small | 1 day | — |
| Reconciliation job for the "generation succeeded, deduction crashed" edge case | **Should Have** | Small | 0.5 day | Bug fix |

**Blocker flag:** This bug is not just a fix — Chapter 21 makes it a *company rule*. Every milestone below that touches AI credits (M3, M4, and future video/posting work) inherits this foundation; skipping M0 re-introduces the exact failure class CowQ already learned from.

---

## 3. M1 — Core Loop Hardening (Photo → Studio Images → Listing → Captions → CSV)

*The loop exists. This milestone is about making it sellable, not building it from scratch.*

| Feature | Priority | Complexity | Est. Time | Depends on |
|---|---|---|---|---|
| Confidence-tier classification (`classifyConfidence`) verified/wired for every generation step (High/Medium/Low, per Design DNA §54.1) | **Must Have** | Medium | 2 days | M0 |
| `ai_activity_log` — append-only log for every AI action, silent or surfaced | **Must Have** | Small | 1 day | M0 |
| Reliability pass on the Gemini pipeline: shared `GeminiClient`, explicit timeouts, defined fallback path on every call | **Must Have** | Medium | 2 days | M0 |
| Structured (JSON-schema-constrained) output for listing copy, captions, pricing — no regex-parsed freeform text | **Must Have** | Medium | 1–2 days | — |
| E2E test: onboarding → first storefront-ready generation (critical path, Ch.10) | **Must Have** | Medium | 1–2 days | — |
| TTFV instrumentation — log at "storefront publicly viewable," not at signup | **Must Have** | Small | 1 day | M2 |
| Catalog CSV export polish — verified correctness across edge cases (special characters, multi-image rows) | **Should Have** | Small | 1 day | — |
| AI model configurator (attire, regional appearance, cultural style, face-lock) given landing-page/onboarding prominence — currently under-leveraged per Ch.22 | **Should Have** | Medium | 2 days | — |

**Subtotal M1:** ~10–13 days

---

## 4. M2 — Public Shop Page (`cowq.app/shop/[seller-slug]`)

*Roadmap item #1. Also functions as the founder's own outreach asset for the next cohort.*

| Feature | Priority | Complexity | Est. Time | Depends on |
|---|---|---|---|---|
| `storefronts` table + fixed section schema (`hero`, `featured`, `grid`, `about`, `trust_strip`) — no freeform page builder | **Must Have** | Medium | 1–2 days | M0, M1 |
| ISR/SSG shop page render — hero + Trust Strip must be in first paint, zero auth required | **Must Have** | Large | 3–4 days | Storefronts table |
| Server-side validated `sections` writes (reject unknown section types) | **Must Have** | Small | 0.5 day | Storefronts table |
| Trust Strip component (verification, rating, response time, tenure) — server-computed, short-TTL cache | **Must Have** | Medium | 1–2 days | M6 (verification data) |
| Shop completeness threshold gate — a shop isn't used for outreach until it looks "finished" (Ch.24 edge case) | **Must Have** | Small | 0.5 day | — |
| Full catalog grid + featured shelf sections | **Must Have** | Medium | 1–2 days | — |
| Atomic revalidation on catalog change (no half-rendered intermediate state) | **Should Have** | Medium | 1 day | — |
| Lighthouse LCP check in CI for shop page hero/name | **Should Have** | Small | 0.5 day | — |
| System-generated collections ("New This Week," "Best Sellers") | **Nice to Have** | Medium | 1–2 days | Requires 4+ products/seller |

**Subtotal M2:** ~9–13 days
**Blocker:** Trust Strip needs at least a minimal verification signal from M6 — sequence M6's verification tier alongside, not strictly after.

---

## 5. M3 — Brand Memory

*Roadmap item #2. Makes the product visibly get smarter for a seller the longer they stay — a genuine switching cost.*

| Feature | Priority | Complexity | Est. Time | Depends on |
|---|---|---|---|---|
| `brand_memory_profiles` table (tone, preferred/avoided terms, photo style notes, pricing philosophy notes) | **Must Have** | Small | 1 day | M0 |
| `brand_memory_corrections` table + logging on every seller edit to AI output | **Must Have** | Small | 1 day | — |
| Background aggregation job — pattern threshold (e.g. 3+ similar corrections) proposes profile updates | **Must Have** | Medium | 2 days | Corrections table |
| Shared prompt-construction layer auto-injects Brand Memory into every generative call (listing copy, captions, pricing reasoning) | **Must Have** | Medium | 2 days | M1's prompt architecture |
| "What CowQ knows about your brand" seller-facing screen — fully visible, fully editable, no hidden state | **Must Have** | Medium | 1–2 days | Profile table |
| Bulk reset/edit path for sellers whose voice genuinely shifts (rebrand) | **Should Have** | Small | 0.5 day | — |

**Subtotal M3:** ~7.5–8.5 days

---

## 6. M4 — Partial Editing / Regeneration

*Roadmap item #3. This is the explicit, validated competitive differentiator vs. FlyAds — do not under-scope it.*

| Feature | Priority | Complexity | Est. Time | Depends on |
|---|---|---|---|---|
| `ai_generations` table — every title, description, photo angle, caption stored as an independently addressable, versioned unit (never a monolithic blob) | **Must Have** | Large | 2–3 days | M0, M1 |
| `regenerate-unit` Edge Function — scoped to one `generation_type` + `unit_key`, separate from full `generate-listing` | **Must Have** | Medium | 1–2 days | Generations table |
| Lower, distinct credit cost for partial vs. full regeneration in `credit_costs` | **Must Have** | Small | 0.5 day | M0's credit_costs table |
| `RegenerateUnitButton` + `useRegenerateUnit` hook, wired into listing/caption/photo UI | **Must Have** | Medium | 1–2 days | Edge Function |
| Regenerating one unit never invalidates sibling units (verified test) | **Must Have** | Small | 0.5 day | — |
| Dependency handling for linked units (e.g. a "worn shot" that depends on the front-angle framing) | **Should Have** | Medium | 1–2 days | — |

**Subtotal M4:** ~6–10 days

---

## 7. M5 — Commerce Essentials

*A public shop that can't take payment isn't yet monetizable. This is the minimum to close the loop: browse → buy → get paid.*

| Feature | Priority | Complexity | Est. Time | Depends on |
|---|---|---|---|---|
| Per-shop cart (never blended across sellers) | **Must Have** | Medium | 1–2 days | M2 |
| Guest checkout (account creation offered only *after* purchase) | **Must Have** | Medium | 1–2 days | Cart |
| Checkout screen stripped of all AI surfaces, nav chrome, upsells (Design DNA §52.2/§24.16) | **Must Have** | Small | 1 day | Cart |
| UPI listed first, cards/netbanking secondary (India-first trust signal) | **Must Have** | Medium | 1–2 days | Payment gateway integration |
| Payment gateway integration via official SDK (not hand-rolled) | **Must Have** | Large | 3–4 days | — |
| Honest, specific payment failure states (insufficient funds / bank decline / network timeout / cancellation) | **Must Have** | Small | 1 day | Gateway integration |
| Five-state order model (`Placed → Confirmed → Preparing → Out for Delivery/Ready → Completed`, + `Cancelled`/`Refunded`) — identical vocabulary seller and customer side | **Must Have** | Medium | 2 days | — |
| Three-tier stock display (In Stock / Low Stock with count / Out of Stock) | **Must Have** | Small | 1 day | — |
| AI-suggested stock counts write to a suggested field only — one-tap confirm required, never silent overwrite | **Must Have** | Medium | 1–2 days | AI confidence tiering (M1) |
| Order-status timeline UI (seller + customer) | **Must Have** | Medium | 1–2 days | Order model |
| Re-authentication required for payout bank-detail changes (server-enforced) | **Must Have** | Small | 1 day | — |

**Subtotal M5:** ~14–19 days
**Note:** Shipping (Ch.29) and Services/Bookings (Ch.30–31) are explicitly **not** in this milestone — see Deferred section.

---

## 8. M6 — Trust, Safety & Compliance

*Gates any surface a stranger-customer sees. Must land alongside or just before M2/M5 go live publicly.*

| Feature | Priority | Complexity | Est. Time | Depends on |
|---|---|---|---|---|
| Seller verification tier (identity-check based, never purchasable/unlockable) | **Must Have** | Medium | 2 days | — |
| Reviews — sellers cannot hide, remove, or filter (permanent guardrail) | **Must Have** | Medium | 1–2 days | — |
| Privacy Snapshot (plain-language, 3–5 sentences, shown at checkout + seller data settings) | **Must Have** | Small | 1 day | M5 checkout |
| Database-level RLS verified to block cross-seller access to any customer's order history | **Must Have** | Medium | 1–2 days | M0's RLS audit |
| Fraud prevention: invisible friction + seller-visible-not-blocking risk signals | **Should Have** | Large | 3–4 days | — |
| Dignified, fast resolution path for false-positive fraud flags | **Should Have** | Small | 1 day | Fraud prevention |
| WCAG 2.1 AA baseline: keyboard focus states, color never sole meaning-carrier, touch target sizing | **Must Have** | Medium | 2–3 days | — |
| Automated accessibility checks in CI | **Must Have** | Small | 1 day | — |
| Consent trail for seller customer-list exports | **Should Have** | Small | 1 day | — |

**Subtotal M6:** ~13–18 days (Must Have subset: ~9–12 days)

---

## 9. M7 — Retention Infrastructure

*Keeps a paying seller paying. Not flashy, but directly protects Chapter 4's Value #1 (seller time is sacred).*

| Feature | Priority | Complexity | Est. Time | Depends on |
|---|---|---|---|---|
| Three-tier notifications: "Needs you now" / "Worth knowing" / "AI did this" (silent) | **Must Have** | Medium | 2 days | M1's ai_activity_log |
| Server-side hard cap on non-critical push notifications/day | **Must Have** | Small | 1 day | Notification tiers |
| Batch summary pattern (e.g. overnight AI actions → one morning digest, not N pushes) | **Should Have** | Medium | 1–2 days | — |
| Seller-configurable notification granularity override | **Should Have** | Small | 1 day | — |
| Insights: revenue, order volume, AI activity, customer reach — line/bar charts only, zero pie charts | **Must Have** | Medium | 2–3 days | M5's orders |
| Plain-language leading sentence above every chart ("Revenue is up 12%...") | **Must Have** | Small | 1 day | Insights |

**Subtotal M7:** ~8–10 days

---

## 10. M8 — Launch Operations

*Turns the build into something CowQ can actually learn from during the ten-seller conversion push (Ch.53).*

| Feature | Priority | Complexity | Est. Time | Depends on |
|---|---|---|---|---|
| KPI dashboard segmented by persona from day one (TTFV, onboarding completion, feature-pillar breadth, Free→Paid conversion) | **Must Have** | Medium | 2 days | M1, M5 |
| Monitoring/observability baseline (error rates, Edge Function latency, failed generations) | **Must Have** | Medium | 1–2 days | — |
| Staging → production deploy pipeline (explicit, reviewed, never automatic on merge) | **Must Have** | Medium | 1–2 days | M0's CI work |
| Secret scanning + credit-deduction audit script as required, non-bypassable CI status checks | **Must Have** | Small | 0.5 day | M0 |
| Roadmap dates (Posting/Sept, Video/Oct, Presenter/Dec) sourced from one canonical config, not hardcoded per-surface | **Should Have** | Small | 0.5 day | — |
| Individual conversion-outcome tracking for the ten warm sellers (converted / declined-with-reason / undecided) | **Must Have** | Small | 0.5 day (process, not code) | — |

**Subtotal M8:** ~5.5–7.5 days

---

## 11. Recommended Build Order

```
Week 1        M0 — Foundation & Trust Repair (credit bug, RLS audit, CI guardrails)
Week 1–2      M1 — Core Loop Hardening (in parallel with tail end of M0)
Week 2–3      M2 — Public Shop Page   ┐
Week 3        M6 (verification only) ─┴─ these two interleave; Trust Strip needs verification data
Week 3–4      M3 — Brand Memory
Week 4–5      M4 — Partial Editing / Regeneration
Week 5–6      M5 — Commerce Essentials (cart → checkout → payment → orders → inventory)
Week 6        M6 (remainder) — reviews, privacy snapshot, fraud, accessibility
Week 6–7      M7 — Retention Infrastructure (notifications + Insights)
Week 7        M8 — Launch Operations, then: begin direct conversion conversations with the ten warm sellers
```

**Total estimated build time: ~7 weeks** of solo-founder, Lovable + AI-assisted development, assuming steady focus and no major vendor surprises (Gemini/fal.ai outages, Lovable platform changes).

**Critical path logic:**
- M0 blocks everything — it is a trust and data-integrity floor, not a nice-to-have.
- M2 (shop page) and M6-verification move together because the Trust Strip is a first-paint requirement of the shop page.
- M3 and M4 can technically run in parallel with each other (different tables, same prompt-architecture dependency from M1) if founder capacity allows — sequenced here for solo-founder focus, not because of a hard technical dependency.
- M5 depends on M2 existing (nothing to sell against otherwise) but not on M3/M4 — could be pulled earlier if seller conversion conversations reveal payment is the actual blocker, not content quality (watch for this per Ch.53's "genuine blocker vs. polite deferral" test).

---

## 12. Explicitly Deferred (Post-MVP — do not pull forward)

| Item | Why deferred | Where it lives |
|---|---|---|
| Video for products | Roadmap #4 — needs a 5–10 seller cost test before pricing; targeted October | Ch.17, Ch.20, Ch.21 |
| Auto-posting (self-hosted Postiz) | Roadmap #5 — targeted September; infra can be provisioned early but the feature is Phase 2 | Ch.17, Ch.37 |
| Referral system | Explicitly too early — Phase 3 (Growth Infrastructure), CowQ is still Phase 0/1 | Ch.39, Ch.40 |
| Multi-language (Hindi, Tamil, Telugu, etc.) | Phase 3 — needs locale-native prompt templates, not a translate-after step | Ch.44, Ch.19 |
| Native iOS/Android apps | Needs proven retention data first; mobile-first web already covers thumb zones, camera-first UX, offline | Ch.42, Design DNA §55/§61 |
| Marketplace cross-seller discovery / collections at scale | Needs marketplace density CowQ doesn't have yet — Phase 3 growth loop | Ch.23, Ch.39 |
| Services & Bookings full depth | Real persona (Ch.8) but not in the current roadmap sequence; revisit once product-seller monetization is proven | Ch.30, Ch.31 |
| CRM depth, AI recommendations, marketplace intelligence | Compounding-value features that matter more once there's a marketplace and retained base to compound across | Ch.32–34 (AI Playbook) |
| International expansion | Explicitly not in scope; requires a full re-run of market discovery, not a translation exercise | Ch.43 |
| Shipping carrier integrations | Only needed once real order volume exists; basic order-status "Out for Delivery" text suffices for MVP | Ch.29 |

**Guardrail from Ch.16:** if founder-led conversion conversations (M8's tracked outcomes) reveal that sellers still decline specifically because video/posting are missing — not politely deferring — that's real data to *revisit* this list, not evidence the list was wrong to begin with.

---

## 13. Launch Checklist

**Do not begin active conversion conversations with the ten warm sellers until every box below is checked.**

### Integrity & Trust
- [ ] Zero credit-deduction code paths outside `spend_credits` (CI-verified)
- [ ] Three-part credit test suite passing for every credit-consuming feature
- [ ] RLS allow + deny tests passing for every table, especially cross-seller customer data
- [ ] Zero pie charts anywhere in the product
- [ ] Zero purchasable/unlockable verification tiers
- [ ] Zero seller ability to hide/filter/remove reviews
- [ ] Privacy Snapshot live at checkout and in seller settings
- [ ] Re-authentication enforced server-side for payout bank-detail changes

### Core Experience
- [ ] Photo → studio images → listing → captions → CSV loop tested end-to-end, real seller catalogs
- [ ] TTFV measured and under the 10-minute / <8-input onboarding standard
- [ ] Public shop page: hero + Trust Strip render in first paint (Lighthouse-verified)
- [ ] Brand Memory: "What CowQ knows about your brand" screen live, editable, non-empty after real usage
- [ ] Partial regeneration live for photos, titles, descriptions, and captions independently
- [ ] Partial regeneration priced lower than full regeneration, verified in `credit_costs`

### Commerce
- [ ] Guest checkout functional, account creation offered only post-purchase
- [ ] UPI listed first in payment methods
- [ ] All four payment-failure states tested (insufficient funds, bank decline, timeout, cancellation)
- [ ] Order status uses identical five-state vocabulary on seller and customer views
- [ ] Stock never silently overwritten by AI — suggested-count confirm flow verified

### Operations
- [ ] Staging → production deploy pipeline tested, no direct-to-main commits possible
- [ ] Monitoring live for Edge Function errors and failed generations
- [ ] WCAG 2.1 AA automated checks passing in CI
- [ ] KPI dashboard live and segmented by persona
- [ ] Known Issues Register (Ch.61 Appendix) updated — credit bug marked resolved

### Go-to-Market
- [ ] All ten warm sellers scheduled for direct, individual conversion conversations
- [ ] Each shop page meets the completeness threshold before being used in outreach
- [ ] Outcome-tracking sheet ready: converted / declined-with-reason / undecided
- [ ] Founder posting publicly, visibly using CowQ in their own 1,400-product shop

---

*This roadmap is a living document. Per Ch.17's own governance rule: if real seller conversion data shows the current feature set converts without video/posting, don't accelerate the deferred list — that would be the roadmap serving its own momentum instead of the mission it's supposed to serve.*
