# CowQ Design DNA
### The Official Internal Design System
**Version 1.1 · Confidential · Internal Use Only**
**(Merged Edition — combines the original v1.0 core system with the v1.1 Addendum into one canonical document)**

> "CowQ runs my entire business."

---

## How to Read This Document

This is not a style guide. It is the operating law for every pixel CowQ ships. A style guide describes what things look like. A Design DNA describes *why* they exist, *what they must never do*, and *how to judge if new work still belongs to CowQ*. Every designer, engineer, and AI system (including Claude, Lovable, and any generative tool used to build CowQ) is bound by this document.

Each section follows a fixed structure — **Purpose, Rules, Examples, Do, Don't, Implementation Notes, Acceptance Criteria** (Sections 51 onward add **Principles** and **Lovable Notes** as well) — so any contributor can audit any part of the product against a single page and get an unambiguous verdict: on-brand or off-brand.

This document has two parts, numbered continuously:
- **Part I — Sections 1–49**: the foundational system — vision, mission, design philosophy, IA, layout, color, typography, motion, the core component library, accessibility, and Lovable implementation rules.
- **Part II — Sections 51–63**: the extension system — marketplace, commerce, trust, AI experience, mobile, motion library, signature moments, performance, metrics, expanded components, native platform guidelines, India-first/multi-language UX, and future-proofing rules. Part II was originally published separately as the "v1.1 Addendum" and is folded in here as of this merge; any citation elsewhere reading `§v1.0-XX` refers to a Part I section number in this same document.
- **Section 64 — Version History** closes the document, combining the history of both original documents plus this merge.

---

# 1. Introduction

**Purpose**
To establish CowQ as a product with a singular, recognizable visual and behavioral identity — one that cannot be confused with a Bootstrap admin panel, a generic SaaS dashboard, or a copy of Linear, Arc, Stripe, or Apple. This document is the source of truth that resolves every future design disagreement.

**Rules**
1. No design decision ships without a corresponding rule in this document, or a proposed amendment to it (see Section 47, Future Expansion Rules).
2. When a new pattern is needed and this document is silent, the designer must default to the Core Design Principles (Section 4) — never to habit, never to "what Linear does."
3. This document supersedes personal taste. If a contributor disagrees with a rule, they file an amendment; they do not quietly deviate.
4. Every screen, in every product surface (web app, mobile app, storefront, admin console, onboarding), must be traceable back to this document.

**Examples**
- A new engineer joins and needs to build a "Refund" dialog. They open Section 24 (Component Library → Dialogs), find the rules, and ship a dialog indistinguishable in spirit from every other dialog in CowQ — without ever speaking to a designer.

**Do**
- Treat this document as versioned, living law (see Section 50, Version History).
- Cite section numbers in PR descriptions and design reviews ("per DNA §13.2").

**Don't**
- Don't treat this as inspiration. Treat it as specification.
- Don't let a single high-visibility launch (a demo, a fundraising deck) bypass these rules "just this once."

**Implementation Notes**
Store this document in the CowQ design repo as `cowq-design-dna.md`. Every Figma library, every Lovable prompt scaffold, and every component README should link back to the relevant section number.

**Acceptance Criteria**
- [ ] Every net-new component PR references a section number.
- [ ] Every design review checklist includes "DNA compliance" as a gating item.

---

# 2. Vision

**Purpose**
To define the single sentence CowQ is building toward, so that ambiguous decisions resolve in its favor.

**Rules**
1. The Vision statement is: **"CowQ runs my entire business."**
2. Every screen must answer, implicitly, the question: *does this make the business feel more run, or does it make the owner feel like they have more work to do?*
3. If a feature increases the owner's daily workload, it violates the Vision unless it is a one-time setup cost that eliminates future workload.

**Examples**
- A daily "review your AI-drafted responses" inbox is on-vision only if it takes under 60 seconds and is optional — otherwise it becomes a second job, which is off-vision.
- A dashboard that opens on "Everything is fine. Nothing needs you today." is maximally on-vision.

**Do**
- Design toward autonomy: the interface should feel like a competent employee, not a tool that waits for input.
- Measure every new feature against "does the owner do less after this ships, or more?"

**Don't**
- Don't design engagement loops (streaks, badges, "come back daily" prompts). CowQ is not a habit app; making the owner feel *safe leaving* is a feature, not a failure.

**Implementation Notes**
Product and design write a one-line "Vision Check" in every spec: "This feature reduces owner effort because ___."

**Acceptance Criteria**
- [ ] Every feature spec includes a Vision Check line.
- [ ] No feature ships that increases required daily logins without an explicit, documented exception.

---

# 3. Mission

**Purpose**
To define the operational mission that vision serves.

**Rules**
1. The Mission is: **"Become the fastest way to get any business online."**
2. "Fastest" is a design constraint, not a marketing line. Time-to-first-value (TTFV) is a tracked design metric, on par with accessibility or visual QA.
3. Onboarding is treated as the single most important surface in the product. Every millisecond and every question removed from onboarding is a design win.

**Examples**
- Onboarding for a local shop owner should go from "download the app" to "my shop has a live storefront" in under 10 minutes, with fewer than 8 required inputs.
- If CowQ's AI can infer a business category from a photo of a shopfront, it must — rather than asking the owner to select from a dropdown.

**Do**
- Default to AI-inference over manual form-filling wherever legally and practically possible (see Section 30, AI Experience Guidelines).
- Track and publish an internal TTFV metric per user segment (Local Shop, Freelancer, D2C Brand, etc).

**Don't**
- Don't add an onboarding step "to be thorough." Every step must earn its place by unlocking something the owner could not get otherwise.

**Implementation Notes**
Onboarding flows require a dedicated design QA pass measuring input count, screen count, and median completion time before every release.

**Acceptance Criteria**
- [ ] TTFV is measured and reported per release.
- [ ] No onboarding flow exceeds 8 required manual inputs without a documented, reviewed exception.

---

# 4. Design Philosophy

**Purpose**
To establish the immutable principles that govern every design decision in CowQ, forever. These are not guidelines. They are constraints.

**Rules — The Eight Immutable Principles**

1. **One primary action per screen.** Every screen has exactly one thing it wants the user to do next. Secondary actions exist, but visually and hierarchically defer to the one primary action.
2. **Never destroy user work.** No irreversible action happens without confirmation, undo, or a recovery path. Drafts autosave. Deletions are soft by default.
3. **AI works, people work less.** Every AI feature must remove a task from the human's plate. AI that merely assists but still requires full human review is a stepping stone, not a destination.
4. **Speed is a feature.** Perceived and actual performance are treated as design requirements, not engineering afterthoughts. A beautiful screen that loads slowly is a broken screen.
5. **Trust before delight.** In commerce and money contexts, clarity and predictability outrank charm. Delight is layered on top of trust — never at its expense.
6. **Every pixel earns its place.** If a design element cannot justify its existence in one sentence, it is removed.
7. **Seller owns everything.** Data, customer relationships, pricing, and content belong to the seller. The interface must never obscure this, upsell against it, or make the seller feel like a tenant in their own business.
8. **Simplicity beats feature count.** A shorter, more opinionated feature set that works flawlessly beats a longer one that requires configuration.

**Examples**
- A settings screen with 40 toggles violates Principle 8. CowQ instead ships strong, sensible defaults and reveals advanced controls only on request ("Show advanced settings").
- A "Delete Product" button always opens a confirmation with the product's name spelled out, plus a 10-second "Undo" toast after deletion (Principle 2).

**Do**
- Print these eight principles and pin them above every designer's desk (literally, in the Figma cover page).
- Reject any design in review that cannot be mapped to at least one principle.

**Don't**
- Don't add a "Cancel" and "Delete" button pair without a differentiated visual weight — ambiguity here violates Principle 2.
- Don't let engineering convenience ("it's easier to make this a global setting") override Principle 8.

**Implementation Notes**
Every Figma frame includes a footer comment: "Primary action: ___." This is a mandatory field in the design review template.

**Acceptance Criteria**
- [ ] Every screen in the product has one, and only one, visually dominant action.
- [ ] Every destructive action has a confirmation or undo path, audited quarterly.

---

# 5. UX Philosophy

**Purpose**
To translate the Design Philosophy into how the product *behaves*, second to second.

**Rules**
1. **Silence is the default state.** The product should feel calm when nothing is wrong. Noise (badges, alerts, red dots) is reserved for things that genuinely need the owner's attention.
2. **Progressive disclosure over walls of options.** Show the minimum needed to act. Reveal depth only when the user reaches for it.
3. **Recognition over recall.** Never make the user remember a code, an ID, or a step they took three screens ago. Surface context inline.
4. **The interface narrates state, not mechanism.** Say "Payment received" not "Webhook processed." Say "Syncing your orders" not "Running batch job #4."
5. **Every wait has a reason, visible.** No blank spinners. State what is happening and, where feasible, how long it will take.
6. **The user is never wrong.** Errors are framed as system limitations or missing information, never as user failure.

**Examples**
- Instead of a settings menu with "Notification Preferences," "Alert Rules," "Digest Settings," "Sound Settings" as four separate destinations, CowQ ships one "Notifications" screen with sensible defaults and an optional "Customize" expander.
- A failed payment shows: "This card was declined by the bank. Try another card or contact your customer." — never "Error 402."

**Do**
- Write every empty, loading, and error state as if a calm, competent operations manager were speaking.
- Default every list, filter, and setting to the choice 80% of users would want.

**Don't**
- Don't expose internal system names, job queues, or engineering vocabulary anywhere in the UI.
- Don't use exclamation points or urgency language for non-urgent information.

**Implementation Notes**
UX writers and designers co-own a shared "state language" glossary (see Section 39, Microcopy Guidelines) that all state copy must be pulled from.

**Acceptance Criteria**
- [ ] No raw error codes, stack traces, or internal job names are ever user-visible.
- [ ] Every asynchronous action >1.5s shows a labeled, human-readable state.

---

# 6. Information Architecture

**Purpose**
To define how CowQ's world is organized so an owner with zero technical background can always answer "where do I go to do X?" without searching.

**Rules**
1. CowQ's IA is organized around **five permanent pillars**, present in every business's account regardless of vertical:
   - **Storefront** (what customers see)
   - **Orders** (money in motion)
   - **Catalog** (products & services)
   - **Customers** (relationships)
   - **Insights** (what's happening, in plain language)
2. A sixth, contextual pillar — **AI** — is never a separate destination users must visit. It is a layer inside every pillar (see Section 30).
3. **Settings is a single destination**, not scattered across pillars. Business identity, payments, team, and integrations live there — and only there.
4. Maximum navigation depth is **three levels**: Pillar → Section → Detail. No screen requires more than 3 taps/clicks from home.
5. Search (⌘K / command palette, see Section 37) is a first-class IA shortcut that can reach anything in fewer than 3 levels.

**Examples**
- "Edit my shop's opening hours" lives at Storefront → Shop Details → Hours. Never buried inside Settings.
- A new product photo shoot upload lives at Catalog → Products → [Product] → Photos. Not in a separate "Media Library" pillar.

**Do**
- Keep the five pillars fixed across all verticals (a jewellery shop and a freelance consultant see the same five pillars, populated differently).
- Let AI-suggested actions surface *inside* the relevant pillar (an AI reorder suggestion appears inside Catalog, not in a separate AI inbox).

**Don't**
- Don't create vertical-specific navigation structures. A "Service Bookings" pillar for service providers instead of using Orders breaks the universal mental model.
- Don't nest settings inside individual pillars ("Payment settings" must never live inside Orders).

**Implementation Notes**
The five-pillar model is enforced in the primary navigation component (Section 24, Sidebar) at the code level — it is not a per-page design choice.

**Acceptance Criteria**
- [ ] 100% of product surfaces map to one of the five pillars or Settings.
- [ ] No screen is more than three navigation levels deep from Home.

---

# 7. Navigation Rules

**Purpose**
To keep wayfinding predictable across desktop, tablet, and mobile.

**Rules**
1. **Persistent left sidebar on desktop** (see Section 24) housing the five pillars + Settings + Search, always visible, never collapsible on desktop ≥1280px.
2. **Bottom navigation on mobile** (see Section 29) with a maximum of five items: the five pillars collapse contextually, with Settings and Search reachable via the profile avatar and a persistent search affordance.
3. The active pillar is always indicated by exactly one visual signal: a filled icon + label weight change. Never color alone (accessibility, Section 25).
4. Breadcrumbs are used only at depth 3 (Detail level) and never exceed three segments.
5. Back navigation always returns to the exact prior scroll position and filter state — no state loss.
6. The CowQ logo/mark, when clicked, always returns to Home (the Insights-first dashboard) — never to a marketing page.

**Examples**
- Sidebar: Home · Storefront · Orders · Catalog · Customers · Insights — with Settings and Search fixed at the bottom, visually separated by a divider.

**Do**
- Keep navigation labels as nouns the owner already uses ("Orders," not "Transactions").
- Preserve filter/sort state when navigating away and back within a session.

**Don't**
- Don't use icon-only navigation on desktop. Icon + label always, for a non-technical audience.
- Don't introduce a secondary top navigation bar — one navigation system per breakpoint, no exceptions.

**Implementation Notes**
Navigation state (active pillar, scroll position, filters) is stored in a single client-side store, not per-page state, to guarantee restoration.

**Acceptance Criteria**
- [ ] Navigating away and back preserves scroll and filter state 100% of the time.
- [ ] No screen introduces a second, competing navigation pattern.

---

# 8. Layout System

**Purpose**
To define how content is composed on the page so every screen feels like it belongs to the same product.

**Rules**
1. Every screen uses a **three-zone layout**: Context Bar (top, 64px) → Content Canvas (scrollable) → Primary Action (bottom-right, floating on desktop; bottom-fixed on mobile).
2. Content Canvas max-width is **1120px**, centered, on displays wider than 1440px — CowQ never stretches tables and forms edge-to-edge on ultrawide monitors.
3. Dense data screens (Orders, Catalog tables) may use full available width up to 1440px, but retain 32px minimum side gutters.
4. Cards, not raw tables, are the default container for anything the owner needs to scan emotionally (revenue, orders, customer health). Tables are reserved for anything the owner needs to scan operationally (bulk product edits, line items).
5. Vertical rhythm follows the Spacing System (Section 10) exactly — no ad hoc margins.

**Examples**
- The Insights home screen uses cards for KPIs (revenue, orders today, AI actions taken) and a table only for the "Recent Orders" list beneath them.

**Do**
- Keep the Context Bar identical in height and behavior across every screen (houses page title, primary action, and contextual filters).
- Let empty space be a deliberate design tool — see Section 6's "calm" mandate.

**Don't**
- Don't center dense tables at 1120px max-width if it forces excessive horizontal scrolling — use the wide-table exception (Rule 3).
- Don't stack more than two levels of nested cards.

**Implementation Notes**
Layout primitives (`ContextBar`, `Canvas`, `PrimaryActionSlot`) are shared React components; no screen builds its own layout shell.

**Acceptance Criteria**
- [ ] Every screen uses the shared layout primitives.
- [ ] No screen exceeds two levels of card nesting.

---

# 9. Grid System

**Purpose**
To give every layout decision a shared mathematical foundation — CowQ's grid is inspired by the ledger book: quiet, ruled, precise, because CowQ is fundamentally a commerce and money product.

**Rules**
1. **12-column grid** on desktop (≥1280px), **8-column** on tablet (768–1279px), **4-column** on mobile (<768px).
2. Column gutter: **24px** desktop, **20px** tablet, **16px** mobile.
3. Margin (edge gutter): **32px** desktop, **24px** tablet, **16px** mobile.
4. The grid is always visible in dev mode as a toggleable ledger overlay (thin hairlines, 8% opacity) — a nod to CowQ's ledger-precision identity, used internally only, never shipped to production.
5. Components snap to whole-column widths. Half-column or arbitrary-pixel component widths are not permitted.

**Examples**
- A KPI card row on desktop: 4 cards × 3 columns each = 12 columns, no remainder.
- A two-panel settings layout: 4-column nav + 8-column content.

**Do**
- Design every new screen by first laying the 12-column grid, then placing components — never freehand.
- Use the ledger overlay during design QA to catch off-grid placements.

**Don't**
- Don't use 5-column or 7-column splits — they don't divide cleanly and produce visual imbalance.
- Don't allow a component to bleed across a gutter without explicit intent (e.g., a full-bleed hero image).

**Implementation Notes**
Grid is implemented as a CSS Grid utility (`--cowq-grid-12`, `--cowq-grid-8`, `--cowq-grid-4`) mapped to breakpoints in Tailwind config (see Section 45).

**Acceptance Criteria**
- [ ] Every shipped screen aligns to the grid, verified via the ledger overlay in QA.
- [ ] No arbitrary pixel-width components in the codebase.

---

# 10. Spacing System

**Purpose**
To ensure consistent rhythm and to make density a deliberate, systemic choice rather than an accident of individual components.

**Rules**
1. Base unit: **4px**. All spacing is a multiple of the base unit.
2. Scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128` (named `space-1` through `space-10`).
3. Component-internal padding uses the lower half of the scale (4–24px). Layout-level spacing (between sections, cards) uses the upper half (32–128px).
4. Text blocks always use `space-3` (12px) minimum between a label and its value; `space-5` (24px) minimum between unrelated content groups.
5. No hardcoded pixel margins in code — every spacing value maps to a token.

**Examples**
- A KPI card: 24px internal padding (`space-6`), 8px between label and number (`space-2`), 32px gap between cards (`space-7`).

**Do**
- Use the spacing scale for both `margin` and `gap` properties consistently — prefer `gap` in flex/grid layouts to avoid margin-collapse bugs.

**Don't**
- Don't use `space-4` (16px) between major page sections — that's a component-internal value, not a layout value.
- Don't introduce one-off values like `18px` or `30px`.

**Implementation Notes**
Spacing scale is defined once as design tokens (`--cowq-space-1` … `--cowq-space-10`) and mapped into Tailwind's spacing scale (Section 45) so `p-6`, `gap-6`, etc. are the only vocabulary engineers use.

**Acceptance Criteria**
- [ ] Zero hardcoded pixel spacing values in the codebase (enforced via lint rule).
- [ ] Every component's Figma spec lists spacing by token name, not pixel value.

---

# 11. Color Philosophy

**Purpose**
To define *why* CowQ looks the way it does — not a palette chosen for taste, but one chosen to embody the brand's emotional goals: confidence, relief, power, calm, trust.

**Rules**
1. **The Night Pasture principle.** CowQ's primary surface is a deep, near-black, slightly warm charcoal-green — not pure black (which reads cold and technical) and not navy (which reads generic-SaaS). This is CowQ's own territory: it evokes dusk over a working farm — calm, settled, everything accounted for before nightfall.
2. **The Bell Mark principle.** A single warm brass-gold accent — inspired by a cowbell, not by gold jewelry or "premium" gradients — is CowQ's signature color. It is used sparingly, always to mean "this is the one thing to notice," echoing the cowbell's role: a small sound that tells the herder everything is where it should be.
3. **Milk, not white.** CowQ's light surfaces and light-mode background are a warm off-white ("Milk"), never clinical pure white — because pure white reads sterile, and CowQ is a working product, not a hospital.
4. **Clover for AI and success.** A muted, confident green — distinct from "success green" clichés — is reserved for AI-completed actions and positive states, reinforcing "something grew because CowQ worked on it."
5. Color signals meaning, never decoration. Every non-neutral color used must map to a defined semantic role (Section 12).
6. CowQ never uses gradients as a primary design device. Gradients, if used at all, are reserved for rare, deliberate "AI moment" surfaces (Section 30) and never for buttons, cards, or backgrounds by default.

**Examples**
- The primary "Publish Storefront" button is Bell Gold on Night Pasture — the one warm object in a cool, calm frame.
- A dashboard full of neutral cards with a single gold-highlighted "3 things need you today" card demonstrates restraint in action.

**Do**
- Ask, before adding any color: "What does this color mean, and could it be neutral instead?"
- Reserve gold for true primary actions and the AI signature (Section 30's Bell Mark component) — never for both a button and a decorative icon on the same screen.

**Don't**
- Don't use gold as a hover state color for every interactive element — it must remain rare to stay meaningful.
- Don't introduce a second "premium" accent color (e.g., a purple or blue "Pro" badge) — CowQ has one accent, period.

**Implementation Notes**
Color roles are enforced via semantic tokens (`--color-action-primary`, `--color-ai-signature`), never raw hex values, in component code.

**Acceptance Criteria**
- [ ] No screen uses gold in more than one distinct semantic role simultaneously.
- [ ] Every color in the product traces to a token in Section 12.

---

# 12. Complete Color Tokens

**Purpose**
To provide the exact, exhaustive palette — the only colors CowQ is permitted to use.

**Rules — Core Palette**

| Token | Name | Hex | Usage |
|---|---|---|---|
| `night-pasture-950` | Night Pasture (darkest) | `#0B0F0D` | App background, dark mode base |
| `night-pasture-900` | Night Pasture | `#141A16` | Primary surface |
| `night-pasture-800` | Pasture Elevated | `#1A211D` | Cards, elevated surfaces (dark mode) |
| `night-pasture-700` | Pasture Border | `#242B26` | Borders, dividers (dark mode) |
| `milk-50` | Milk | `#FAF7F0` | Light mode background |
| `milk-100` | Milk Elevated | `#F2EEE3` | Light mode card surface |
| `milk-200` | Milk Border | `#E4DFD0` | Light mode borders |
| `bell-gold-500` | Bell Gold | `#C79A3D` | Primary action, AI signature accent |
| `bell-gold-400` | Bell Gold Light | `#DDB65E` | Hover state |
| `bell-gold-600` | Bell Gold Deep | `#A67D2A` | Active/pressed state |
| `clover-500` | Clover | `#4C8B5C` | Success, AI-completed states |
| `clover-100` | Clover Tint | `#E4EFE6` | Success background tint |
| `rust-500` | Rust | `#B4543B` | Error, destructive states |
| `rust-100` | Rust Tint | `#F3E2DC` | Error background tint |
| `amber-500` | Amber | `#C98A2E` | Warning states (distinct from Bell Gold by tone/context, never used for actions) |
| `amber-100` | Amber Tint | `#F5E9D3` | Warning background tint |
| `ink-900` | Ink | `#1B1B18` | Primary text (light mode) |
| `ink-600` | Ink Muted | `#5C5B54` | Secondary text (light mode) |
| `ink-400` | Ink Faint | `#96958C` | Disabled/placeholder text |
| `paper-50` | Paper | `#F5F2EA` | Primary text (dark mode) |
| `paper-600` | Paper Muted | `#A8A599` | Secondary text (dark mode) |

**Examples**
- Dark mode primary button: background `bell-gold-500`, text `night-pasture-950`, hover `bell-gold-400`.
- Light mode success toast: background `clover-100`, text `clover-500`-derived dark variant, icon `clover-500`.

**Do**
- Always pair a "tint" background with its full-strength token for text/icon, never mix semantic families (no rust-100 background with clover-500 text).
- Maintain identical semantic token *names* across light and dark themes; only their resolved values switch.

**Don't**
- Don't introduce a new hex value outside this table without a documented amendment (Section 47).
- Don't use `amber-500` for CTAs — it is reserved for warnings and must stay visually distinct from `bell-gold-500`.

**Implementation Notes**
Tokens ship as CSS custom properties and a Tailwind theme extension (Section 45): `bg-bell-gold-500`, `text-ink-900`, etc. Dark/light switching is handled via a `data-theme` attribute, not duplicated class names.

**Acceptance Criteria**
- [ ] Zero raw hex values in component code — 100% token usage, enforced by lint rule.
- [ ] Contrast ratios for all text/background pairs meet Section 25 standards.

---

# 13. Typography Scale

**Purpose**
To give CowQ a distinctive typographic voice — precise and warm, like a well-kept ledger, not a generic geometric sans.

**Rules**
1. **Display face:** *Fraunces* (variable, optical size high) — a warm, slightly rustic serif with real personality, used only for large numbers, hero moments, and the wordmark. Used sparingly — never for body UI.
2. **Interface face:** *Inter* — for all UI text, labels, buttons, navigation. Chosen for legibility and neutrality so the display face and the Bell Gold accent carry the personality instead.
3. **Data/Mono face:** *JetBrains Mono* — for all monetary figures in tables, order IDs, SKUs, timestamps, and anything the owner needs to scan for precision. This is CowQ's "ledger" texture — every number that represents money or a unique record renders in mono, everywhere, without exception.
4. Type scale (desktop):

| Token | Size / Line-height | Face | Usage |
|---|---|---|---|
| `display-xl` | 56/60px | Fraunces | Marketing hero only |
| `display-lg` | 40/48px | Fraunces | Dashboard hero numbers |
| `display-md` | 28/36px | Fraunces | Section headers, empty-state headlines |
| `heading-lg` | 22/28px | Inter SemiBold | Page titles |
| `heading-md` | 18/24px | Inter SemiBold | Card titles |
| `body-lg` | 16/24px | Inter Regular | Primary body text |
| `body-md` | 14/20px | Inter Regular | Default UI text |
| `body-sm` | 13/18px | Inter Regular | Captions, helper text |
| `label` | 12/16px | Inter Medium, uppercase, tracked +4% | Field labels, table headers |
| `mono-lg` | 20/28px | JetBrains Mono | Large monetary figures |
| `mono-md` | 14/20px | JetBrains Mono | Table monetary/ID values |
| `mono-sm` | 12/16px | JetBrains Mono | Timestamps, order refs |

5. Mobile scale reduces `display-lg` to 32/40 and `display-md` to 24/32; all other sizes remain constant (Inter and mono remain legible at small sizes without reduction).

**Examples**
- A revenue KPI card: label "Today's Revenue" in `label` token, value "₹48,200" in `display-lg` Fraunces for the emotional hero number... except monetary values always use JetBrains Mono per Rule 3 — so the correct rendering is `mono-lg`-scaled-up (28px) for the number, keeping the mono texture even at hero size, with Fraunces reserved for non-monetary emotional headlines like "Nothing needs your attention today."

**Do**
- Use Fraunces only where a human, not a system, is "speaking" (headlines, empty states, milestones).
- Set every monetary and ID value in mono, at every size, without exception.

**Don't**
- Don't use Fraunces for body copy or buttons — it breaks legibility and the calm/utility balance.
- Don't mix a fourth typeface into the product for any reason.

**Implementation Notes**
Fonts are self-hosted (not Google Fonts CDN) for performance (Section 43). Variable font files used for Fraunces and Inter to minimize payload.

**Acceptance Criteria**
- [ ] No fourth typeface appears anywhere in shipped product.
- [ ] All monetary/ID values audit at 100% JetBrains Mono usage.

---

# 14. Elevation

**Purpose**
To define a calm, restrained system of visual hierarchy through layering — not decoration.

**Rules**
1. Four elevation levels only: `flat` (0), `raised` (1), `overlay` (2), `modal` (3).
2. Elevation is communicated primarily through **background tone shift and border**, not heavy shadow — consistent with the calm, ledger-like identity (see Section 16, Shadow System, for the restrained shadow values that supplement tone).
3. Higher elevation always correlates with higher interactivity/urgency: `flat` = page background, `raised` = cards, `overlay` = dropdowns/popovers/toasts, `modal` = dialogs and command palette.
4. Only one `modal`-level element may be visible at a time.

**Examples**
- A card at `raised` uses `night-pasture-800` background with a 1px `night-pasture-700` border and no shadow in dark mode; light mode adds a soft 4% shadow (Section 16) since tone shift alone is less perceptible on light backgrounds.

**Do**
- Use border + tone shift as the primary elevation cue in dark mode.
- Reserve shadow for light mode and for `overlay`/`modal` levels in both modes.

**Don't**
- Don't stack more than one `overlay` element (e.g., a dropdown inside a popover).
- Don't use elevation purely decoratively on flat, non-interactive content.

**Implementation Notes**
Elevation levels map to a single `data-elevation` attribute driving both background and shadow tokens together, so they can never drift independently.

**Acceptance Criteria**
- [ ] No more than one `modal`-level surface open simultaneously (enforced in code).
- [ ] Elevation tokens applied consistently — audited each release.

---

# 15. Glassmorphism Rules

**Purpose**
To define the narrow, deliberate role of translucency in CowQ — used to signal "AI is present," never as a general aesthetic.

**Rules**
1. Glassmorphism (background blur + translucency) is reserved **exclusively** for AI-surfaced content: the Bell Mark AI indicator, AI suggestion cards, and the command palette (Section 37).
2. Standard specification: `backdrop-filter: blur(20px)`, background `night-pasture-800` at 72% opacity, 1px border at `bell-gold-500` 24% opacity.
3. Glass surfaces always float above content (elevation `overlay` or `modal`), never sit flush in the layout flow.
4. Glass is never used on: buttons, standard cards, tables, forms, or navigation.

**Examples**
- An AI suggestion ("I've reordered your 3 lowest-stock items — review?") appears as a glass card floating over the Catalog screen, with the Bell Gold border signaling both "AI" and "one thing to notice."

**Do**
- Use glass sparingly enough that its appearance alone signals "this is AI, pay attention."

**Don't**
- Don't apply glass to marketing pages, empty states, or any non-AI surface — this dilutes its meaning.

**Implementation Notes**
Ship as a single `<AISurface>` component that always applies the glass spec — engineers cannot access `backdrop-filter` outside this component.

**Acceptance Criteria**
- [ ] Glass effect appears only within `<AISurface>` instances, audited via component usage report.

---

# 16. Shadow System

**Purpose**
To keep depth cues restrained and premium rather than heavy or skeuomorphic.

**Rules**
1. Three shadow tokens only:
   - `shadow-sm`: `0 1px 2px rgba(11,15,13,0.06)` — raised cards in light mode.
   - `shadow-md`: `0 4px 12px rgba(11,15,13,0.10)` — overlays, popovers, dropdowns.
   - `shadow-lg`: `0 16px 40px rgba(11,15,13,0.18)` — modals, command palette.
2. Dark mode uses shadows at 50% the opacity of light mode equivalents, since tone-shift (Section 14) already carries most of the depth signal.
3. No colored shadows (e.g., a gold-tinted shadow under a gold button) — shadows are always neutral `ink`/black-based, regardless of the element's color, to avoid a "glow" effect that reads as gimmicky.

**Examples**
- The command palette (Section 37) uses `shadow-lg` in light mode, `shadow-lg` at 50% opacity in dark mode, combined with the glass spec from Section 15.

**Do**
- Use the smallest shadow that achieves legible separation — default to `shadow-sm` unless the elevation level requires more.

**Don't**
- Don't use shadow as the *only* elevation cue in dark mode — pair with tone shift (Section 14).
- Don't create one-off shadow values in component CSS.

**Implementation Notes**
Shadows are tokens (`--shadow-sm/md/lg`), consumed via Tailwind's `shadow-*` utilities mapped to these values only (Section 45).

**Acceptance Criteria**
- [ ] Zero custom shadow values outside the three tokens, enforced by lint rule.

---

# 17. Border Radius

**Purpose**
To define a consistent geometric language — soft enough to feel calm and human, structured enough to feel precise, like a well-bound ledger rather than a rounded toy.

**Rules**
1. Four radius tokens: `radius-sm` (6px, inputs/tags), `radius-md` (10px, buttons/cards), `radius-lg` (16px, modals/panels), `radius-full` (9999px, avatars/pills/status dots only).
2. Radius must always be consistent within a compound component (a card's radius and its internal button radius must relate proportionally — never a sharply-cornered button inside a heavily-rounded card).
3. Data tables use `radius-sm` at the table container level only; individual cells are never rounded.

**Examples**
- A KPI card: `radius-lg` (16px) container. Its internal "View Details" button: `radius-md` (10px).

**Do**
- Reserve `radius-full` strictly for circular/pill elements — avatars, status dots, filter chips.

**Don't**
- Don't use `radius-full` on rectangular buttons or cards — this is a common generic-SaaS default CowQ explicitly avoids (see Section 21's aesthetic guardrails).
- Don't mix more than two radius tokens on a single component.

**Implementation Notes**
Radius tokens map directly to Tailwind's `rounded-*` scale overrides (Section 45).

**Acceptance Criteria**
- [ ] No fully-pill-shaped buttons in the product (a deliberate deviation from Arc/Linear-style pill CTAs).
- [ ] Radius audit passes on every new component PR.

---

# 18. Motion Philosophy

**Purpose**
To make motion feel like the product breathing calmly — never like it's performing.

**Rules**
1. Motion exists to **confirm cause and effect**, orient attention, and communicate state change — never to decorate.
2. The default motion feeling is: **settled, not springy.** CowQ does not use bouncy, elastic, or overshoot easing — that reads playful/consumer, not commerce-grade trust.
3. AI actions get one, and only one, distinctive motion signature: the "Bell Pulse" — a slow, soft radial pulse (2.4s cycle) on the Bell Mark indicator whenever AI is actively working, and a single gentle chime-like scale+fade (not a literal sound by default) when an AI action completes.
4. Page transitions are cross-fades, never slides, to avoid feeling like a mobile-native stack navigation pattern borrowed from iOS.
5. Reduced motion (`prefers-reduced-motion`) disables all non-essential animation; state changes still occur but instantly, with opacity crossfade only.

**Examples**
- When AI finishes drafting a customer reply, the Bell Mark pulses once slowly, then settles — no sound, no toast that demands dismissal, just a quiet, visible completion.

**Do**
- Use motion to answer "what just happened?" — a card that updates should briefly highlight (background tint flash, 400ms) so the eye catches the change.

**Don't**
- Don't use bounce/elastic/overshoot easing anywhere in the product.
- Don't animate on every state change indiscriminately — silence (Section 5) applies to motion too.

**Implementation Notes**
All motion tokens live in a single `motion.ts` config consumed by both CSS transitions and any JS animation library, so easing/duration never drifts between components.

**Acceptance Criteria**
- [ ] Zero bounce/spring easing curves in the codebase.
- [ ] `prefers-reduced-motion` respected on 100% of animated components.

---

# 19. Animation Durations

**Purpose**
To standardize timing so motion feels like one coherent system.

**Rules**

| Token | Duration | Usage |
|---|---|---|
| `duration-instant` | 100ms | Hover states, focus rings |
| `duration-fast` | 180ms | Button press, toggle switches |
| `duration-base` | 240ms | Card hover lift, dropdown open |
| `duration-moderate` | 320ms | Page cross-fade, modal open |
| `duration-slow` | 480ms | Empty-state illustrations entering |
| `duration-ambient` | 2400ms | Bell Pulse (AI working) loop |

**Examples**
- Modal open: 320ms fade+scale from 98%→100%. Modal close: 180ms (`duration-fast` — closing should always feel snappier than opening).

**Do**
- Make "closing/dismissing" actions faster than "opening/revealing" actions — reinforces that getting out of the way is effortless.

**Don't**
- Don't exceed 480ms for any UI-blocking transition — nothing should make the user wait on animation.

**Implementation Notes**
Durations are CSS custom properties (`--duration-fast`, etc.) consumed uniformly.

**Acceptance Criteria**
- [ ] No transition duration outside this table appears in code.

---

# 20. Animation Curves

**Purpose**
To define the exact easing curves that produce CowQ's "settled, not springy" motion feeling.

**Rules**
1. `ease-settle` (default, most UI motion): `cubic-bezier(0.22, 0.61, 0.36, 1)` — fast start, gentle, non-overshooting settle.
2. `ease-enter`: `cubic-bezier(0.16, 1, 0.3, 1)` — for elements entering the viewport (empty-state illustrations, onboarding steps).
3. `ease-exit`: `cubic-bezier(0.4, 0, 1, 1)` — quick, linear-leaning acceleration out, reinforcing "getting out of your way."
4. `ease-ambient` (Bell Pulse only): `cubic-bezier(0.45, 0, 0.55, 1)` — symmetrical, breathing rhythm.
5. No curve in CowQ ever produces a visible overshoot or bounce.

**Examples**
- A toast entering: `ease-enter`, `duration-base`. A toast auto-dismissing: `ease-exit`, `duration-fast`.

**Do**
- Pair curve + duration tokens together as named "motion presets" (e.g., `motion.cardHover = { duration-base, ease-settle }`) so engineers never combine them arbitrarily.

**Don't**
- Don't hand-pick bezier values per component.

**Implementation Notes**
Motion presets exported from `motion.ts`; Framer Motion / CSS transition usage always references presets by name.

**Acceptance Criteria**
- [ ] 100% of animated components use a named motion preset, not raw bezier values.

---

# 21. Iconography

**Purpose**
To give CowQ a distinct, custom icon language rather than a default icon library aesthetic (explicitly not Lucide/Feather/Material defaults used unmodified).

**Rules**
1. Base grid: 24×24px, **1.75px stroke weight**, rounded caps and joins — slightly heavier and softer than typical thin-line icon sets (like Linear's), giving icons a more tactile, "drawn with intent" feel appropriate to a product for hands-on business owners, not just developers.
2. Icons are strictly **line style** in default state; filled variants exist only for the single active navigation item (Section 7) and status dots.
3. A small custom icon subset is bespoke to CowQ and must never be swapped for a generic library equivalent: the **Bell Mark** (AI indicator — a small cowbell silhouette, abstracted to a simple rounded trapezoid with a single dot, used only for AI), the **Herd icon** (Customers pillar — three overlapping soft circles), and the **Ledger icon** (Insights pillar — three horizontal rules of varying length inside a rounded square).
4. Icons never carry color alone as a meaning signal — always paired with label text or shape difference (accessibility, Section 25).

**Examples**
- Storefront pillar: a simple rounded awning/roofline glyph. Orders: a rounded receipt/tag glyph. Catalog: a stacked-box glyph. These four plus Herd and Ledger form CowQ's six core navigation icons — all custom-drawn, never stock.

**Do**
- Commission/design all navigation and pillar icons as an original bespoke set; only use a base icon library (if any) for long-tail utility icons (chevrons, close, search) where distinctiveness doesn't matter.

**Don't**
- Don't use any icon library's default "AI/sparkle/magic wand" icon for AI — the Bell Mark is CowQ's only AI symbol, everywhere, always.

**Implementation Notes**
Custom icon set shipped as an SVG sprite / icon font `@cowq/icons`, versioned separately from any third-party icon dependency.

**Acceptance Criteria**
- [ ] Zero generic "sparkle/magic wand" AI icons anywhere in the product — Bell Mark only.
- [ ] All six core pillar icons are bespoke, not sourced from a public icon library.

---

# 22. Illustration Style

**Purpose**
To define CowQ's illustration language for empty states, onboarding, and milestone moments.

**Rules**
1. Style: **flat, two-tone line-and-fill illustrations** using only `night-pasture`/`milk` neutrals plus a single `bell-gold` or `clover` accent fill per illustration — never full-color, cartoonish, or stock-photo-realistic illustration.
2. Subject matter is always literal and business-grounded: an empty Orders screen shows an illustrated open ledger, not an abstract blob character. An empty Catalog shows an illustrated shelf. CowQ does not use mascots, cute animals, or anthropomorphized characters — despite the brand name, there is no literal cartoon cow anywhere in the product UI (the name is a wordplay on "C.O.W. = Commerce Operating [for the] World / Q for Query/Intelligence," not a mascot brand).
3. Line weight in illustrations matches the icon stroke weight (1.75–2.5px) for family consistency.
4. Illustrations are used only for: empty states, onboarding milestones, and rare celebratory moments (first sale, first 100 orders) — never decoratively on data screens.

**Examples**
- First-sale celebration: a small illustrated gold coin/bell motif animates in once, softly, accompanying the text "Your first sale. CowQ handled the rest."

**Do**
- Keep every illustration explainable in one sentence tied to the literal business action it represents.

**Don't**
- Don't introduce a cow mascot character, ever — this is a deliberate, permanent brand guardrail (see Section 47).
- Don't use stock illustration packs (unDraw, Storyset, etc.) — all illustrations are bespoke to maintain the two-tone system.

**Implementation Notes**
Illustrations shipped as optimized SVGs, single accent color swappable via CSS variable for light/dark theme parity.

**Acceptance Criteria**
- [ ] Zero third-party stock illustrations in production.
- [ ] Zero mascot/character illustrations anywhere in the product.

---

# 23. Image Style

**Purpose**
To define how real photography (seller product photos, shopfronts, profile images) is treated within CowQ's otherwise illustration-light system.

**Rules**
1. Seller-uploaded photography is never stylistically altered by CowQ (no forced filters, no color grading) — the seller's real product must be shown accurately, which is a trust requirement (Principle 5, Section 4), not just an aesthetic one.
2. All product/shop imagery renders in a consistent **`radius-md` (10px)** frame with a **1px `night-pasture-700`/`milk-200` border** — giving even mismatched seller photos a unified, premium presentation.
3. CowQ's own marketing/onboarding photography (if used) follows a "documentary, not stock" direction: real small-business environments, natural light, unposed — never generic stock-photo business handshakes or laptop-in-a-coffee-shop imagery.
4. Low-quality seller uploads are never algorithmically "enhanced" without explicit opt-in — CowQ does not silently alter a seller's product representation (ties to Principle 7, seller owns everything).

**Examples**
- A product grid on a storefront: every image cropped to a consistent 1:1 or 4:5 ratio (per vertical default, Section 24 Product Components), framed identically, regardless of the seller's original photo quality.

**Do**
- Offer AI-assisted background cleanup as an explicit, opt-in, undoable action — never automatic.

**Don't**
- Don't apply a uniform Instagram-style filter across all seller photography — this would misrepresent products, violating trust.

**Implementation Notes**
Image processing pipeline supports opt-in background removal/cleanup (Higgsfield/AI-assisted) but always preserves and offers the original upload.

**Acceptance Criteria**
- [ ] No default filter/color-grade applied to seller-uploaded images.
- [ ] AI photo enhancement always shows a before/after with explicit accept step.

---

# 24. Component Library

**Purpose**
To define the core, reusable building blocks of CowQ, so every surface feels manufactured by the same hand.

## 24.1 Buttons

**Purpose:** Drive the one primary action per screen (Principle 1).
**Rules:**
- Three variants only: `primary` (Bell Gold fill, used once per screen), `secondary` (outlined, `night-pasture-700` border), `ghost` (no border, text-only, for tertiary/table-row actions).
- Three sizes: `sm` (32px height), `md` (40px height, default), `lg` (48px height, onboarding/marketing only).
- Radius: `radius-md`. Never `radius-full`.
- Destructive actions use `secondary` styling with `rust-500` text/border, never a filled red button — destructive actions should never visually compete with the `primary` Bell Gold action for attention.
**Examples:** "Publish Storefront" = `primary lg`. "Save Draft" beside it = `secondary md`. "Delete Product" inside a settings row = `ghost sm` with `rust-500` text.
**Do:** Limit each screen to exactly one `primary` button.
**Don't:** Don't use `primary` styling on more than one button per screen, ever.
**Implementation Notes:** Single `<Button variant size>` component; variant/size are the only two style props exposed.
**Acceptance Criteria:** [ ] Zero screens with two `primary` buttons visible simultaneously.

## 24.2 Cards

**Purpose:** The default container for emotionally-scannable content.
**Rules:** `radius-lg`, elevation `raised`, internal padding `space-6` (24px), optional header with `heading-md` title + optional `ghost` action button top-right.
**Examples:** KPI cards, AI suggestion cards, customer profile summary cards.
**Do:** Keep card headers to a single title — no subtitle clutter.
**Don't:** Don't nest a card inside a card at the same elevation level.
**Acceptance Criteria:** [ ] All cards use the shared `<Card>` primitive.

## 24.3 Inputs

**Purpose:** Consistent, trustworthy data entry.
**Rules:** Height 40px, `radius-sm`, 1px border (`night-pasture-700`/`milk-200`), focus state = 2px `bell-gold-500` ring (never a color change to the border itself, to preserve contrast). Label always above the field (`label` token), never inside as placeholder-only (accessibility + trust — a field that loses its label on focus is a common trust-breaking pattern CowQ avoids).
**Examples:** Product price input shows a fixed ₹ prefix, right-aligned mono value.
**Do:** Show inline validation on blur, not on every keystroke.
**Don't:** Don't use placeholder text as a substitute for a real label.
**Acceptance Criteria:** [ ] 100% of form fields have persistent visible labels.

## 24.4 Forms

**Purpose:** Multi-field data collection without overwhelming a non-technical owner.
**Rules:** Max one column on mobile, max two columns on desktop. Group related fields under a `heading-md` section label. Required fields are unmarked (the default assumption); optional fields are explicitly labeled "(optional)" — inverting the typical asterisk convention, because most CowQ forms are short enough that everything is required by default (ties to Principle 8).
**Do:** Auto-save every form as a draft every 5 seconds (Principle 2).
**Don't:** Don't use asterisks for required fields — label optional fields instead.
**Acceptance Criteria:** [ ] Every multi-field form has autosave.

## 24.5 Dialogs

**Purpose:** Focused, interruptive confirmation for consequential actions only.
**Rules:** `radius-lg`, `shadow-lg`, max-width 480px, centered, glass NOT applied (glass is AI-exclusive, Section 15). Always has a clear title stating the consequence ("Delete 'Handmade Rudraksha Mala'?") not a generic "Are you sure?".
**Do:** State the specific, named consequence in the dialog title.
**Don't:** Don't use dialogs for non-consequential confirmations — that's noise (Section 5).
**Acceptance Criteria:** [ ] Every dialog title names the specific item/action affected.

## 24.6 Tables

**Purpose:** Operational, dense data scanning.
**Rules:** Row height 48px, `label` token column headers (uppercase, muted), monetary/ID columns right-aligned in `mono-md`, row hover = subtle background tint (no border change), sticky header on scroll.
**Do:** Right-align all numeric columns.
**Don't:** Don't center-align monetary values — always right-align for scannability.
**Acceptance Criteria:** [ ] All monetary/numeric table columns are right-aligned mono.

## 24.7 Charts

**Purpose:** Make trends legible at a glance, in plain language.
**Rules:** Line and bar charts only by default (no pie charts — pie charts are banned; they're harder to compare at a glance than a simple bar, and CowQ prioritizes instant legibility, Principle 4). Bell Gold for the primary metric line, neutral grays for comparison/benchmark lines. Every chart has a one-line plain-language takeaway above it (e.g., "Revenue is up 12% from last week") — the chart supports the sentence, not the reverse.
**Do:** Lead every chart with its plain-language conclusion.
**Don't:** Don't ship a pie chart anywhere in the product.
**Acceptance Criteria:** [ ] Zero pie charts in the product. [ ] Every chart has a leading plain-language summary line.

## 24.8 Navigation (Sidebar)

**Purpose:** See Section 7. **Rules:** Width 240px, fixed, `night-pasture-900` background (dark) regardless of theme mode for the sidebar specifically — the sidebar stays dark even in light mode, acting as a stable "cockpit frame" around a lighter content canvas, a signature structural choice. **Do:** Keep sidebar dark in both themes. **Don't:** Don't let sidebar width vary by screen. **Acceptance Criteria:** [ ] Sidebar renders dark in both light and dark theme modes, product-wide.

## 24.9 Bottom Navigation (Mobile)

**Purpose:** See Section 29. **Rules:** 5 items max, 56px height, active item = filled icon + `bell-gold-500` tint + label. **Do:** Keep labels visible at all times (never icon-only). **Don't:** Don't exceed 5 items. **Acceptance Criteria:** [ ] Bottom nav never exceeds 5 items across any vertical.

## 24.10 Search / Command Palette

See Section 37 for full spec. **Rules:** Triggered by ⌘K or the persistent search affordance; glass surface (Section 15); results grouped by pillar.

## 24.11 AI Components

**Purpose:** The 5%-visible layer of AI (Section 30).
**Rules:** Every AI-originated element carries the Bell Mark glyph, glass surface (Section 15), and Bell Pulse motion (Section 18) as its only visual signature — no other AI element styling exists. AI suggestions always show two actions: `primary` accept, `ghost` dismiss — never more than two choices.
**Do:** Keep AI suggestion copy under 20 words, stating the action already considered, not a question.
**Don't:** Don't ask the user a question AI could infer the answer to (ties directly to Section 30).
**Acceptance Criteria:** [ ] Every AI card offers exactly two actions.

## 24.12 Analytics Components

**Purpose:** Insights pillar building blocks.
**Rules:** KPI card = `display`-scale mono number + `label` + small trend indicator (▲/▼ + Clover/Rust color + percentage, never color alone). Comparison always states the time window explicitly ("vs last 7 days"), never an unlabeled arrow.
**Acceptance Criteria:** [ ] Every trend indicator states its comparison window in text.

## 24.13 Shop Components

**Purpose:** Storefront-builder blocks (hero, product grid, about, hours, contact).
**Rules:** Every shop component has a strong, sensible default (Section 3) that looks complete with zero customization — a new seller's storefront must look premium on minute one.
**Acceptance Criteria:** [ ] A storefront with zero customization beyond required setup passes visual QA as "presentable."

## 24.14 Product Components

**Purpose:** Catalog item cards, detail editors, variant selectors.
**Rules:** Product card = image (`radius-md` framed, Section 23) + name (`body-lg`) + price (`mono-md`) + stock status dot (Clover/Amber/Rust). Variant selection uses pill-style chips (`radius-full` is the one approved rectangular-adjacent exception, since these are literally pill/tag elements per Section 17 Rule 1).

## 24.15 Service Components

**Purpose:** Booking/appointment-specific blocks for service providers and freelancers.
**Rules:** Calendar/slot picker uses the same grid system (Section 9); available slots = neutral card, selected slot = Bell Gold border only (not fill, to keep the calendar scannable), booked/unavailable = `ink-400`/`paper-600` reduced opacity, non-interactive.

## 24.16 Checkout Components

**Purpose:** The single highest-trust surface in the product — where a stranger pays a small business.
**Rules:** Checkout is visually the calmest, most stripped-down screen in CowQ: no navigation chrome, no AI surfaces, no illustrations — line items in mono, one visible primary action ("Pay ₹X"), and CowQ's Bell Gold used only on that one button. Trust signals (secure payment badge, seller name + verified status) are always visible above the fold.
**Do:** Strip all non-essential UI from checkout.
**Don't:** Don't show AI suggestions, upsells, or navigation during checkout — trust before delight (Principle 5) is at its most literal here.
**Acceptance Criteria:** [ ] Checkout screen contains zero navigation chrome and zero AI surfaces.

---

# 25. Accessibility Standards

**Purpose**
To ensure CowQ is usable by every business owner, regardless of ability — a non-negotiable requirement, not a nice-to-have, given the "any business" mission.

**Rules**
1. WCAG 2.1 AA minimum across the entire product; AAA targeted for all body text contrast where feasible.
2. Minimum contrast: 4.5:1 for body text, 3:1 for large text (≥24px) and meaningful icons/UI borders.
3. Every interactive element has a visible keyboard focus state: 2px `bell-gold-500` ring, offset 2px, on every focusable element without exception.
4. Color is never the sole carrier of meaning (status dots always pair with text label on hover/tap; trend arrows always pair with ▲/▼ glyphs).
5. All interactive elements have a minimum 44×44px touch target on mobile, regardless of visual size.
6. Full keyboard navigability: every action reachable via Tab/Enter/Escape, command palette (Section 37) reachable via ⌘K from anywhere.
7. All images/icons carry appropriate alt text or `aria-hidden` for decorative elements.

**Examples**
- A stock status dot: Clover dot + "In stock" text, not just a colored dot.

**Do**
- Test every new component against a screen reader (VoiceOver/NVDA) before shipping.

**Don't**
- Don't ship a component whose only state indicator is color.

**Implementation Notes**
Automated accessibility checks (axe-core) run in CI on every PR; contrast tokens are pre-validated at the token level (Section 12) so component-level violations are rare by construction.

**Acceptance Criteria**
- [ ] 100% AA compliance, verified via automated CI checks plus quarterly manual audit.
- [ ] Zero components with color-only state indication.

---

# 26. Responsive Rules

**Purpose**
To define how CowQ adapts across breakpoints without losing its identity.

**Rules**
1. Breakpoints: `mobile` (<768px), `tablet` (768–1279px), `desktop` (≥1280px), `wide` (≥1440px).
2. Content hierarchy (what's primary) never changes across breakpoints — only density and layout do. The primary action (Principle 1) stays primary at every size.
3. Tables collapse to card-per-row layouts below `tablet` — never horizontal-scroll tables on mobile.
4. Sidebar navigation (Section 24.8) converts to bottom navigation (24.9) below `desktop`.

**Examples**
- The Orders table on mobile becomes a stack of order cards, each showing customer, total (mono), and status — tapping opens the detail view.

**Do**
- Design mobile layouts as a genuine reflow, not a shrunk desktop screen.

**Don't**
- Don't ship horizontally-scrolling data tables on mobile.

**Acceptance Criteria**
- [ ] Zero horizontal-scroll tables below `tablet` breakpoint.

---

# 27. Desktop Rules

**Purpose**
To define desktop-specific behaviors (≥1280px).

**Rules**
1. Sidebar always visible, never collapsible (Section 7).
2. Command palette (⌘K) is the primary power-user acceleration path.
3. Hover states are meaningful on desktop only (cards lift `2px` with `shadow-sm`→`shadow-md` on hover, `duration-base`, `ease-settle`) — these are disabled on touch devices to avoid sticky-hover bugs.
4. Multi-column forms permitted (Section 24.4).

**Do:** Enable hover-lift on all card components on pointer:fine devices only.
**Don't:** Don't rely on hover to reveal any required information — hover is enhancement only.
**Acceptance Criteria:** [ ] No information is hover-only inaccessible on touch/keyboard.

---

# 28. Tablet Rules

**Purpose**
To define tablet-specific behaviors (768–1279px) — an important surface for shop owners standing at a counter.

**Rules**
1. Sidebar collapses to icon-only rail (64px) with labels appearing on tap/hover — the sole exception to Section 7 Rule 4's "icon+label always" desktop rule, justified by tablet's constrained width.
2. Touch targets increase to the mobile 44×44px minimum even though layout otherwise resembles desktop.
3. Two-column max for forms and grids.

**Do:** Treat tablet as "desktop density, touch-first interaction."
**Don't:** Don't simply scale the mobile layout up — tablet has its own layout rules.
**Acceptance Criteria:** [ ] All tablet touch targets ≥44×44px.

---

# 29. Mobile Rules

**Purpose**
To define mobile-specific behaviors (<768px) — likely the primary device for many local shop and service-provider owners.

**Rules**
1. Bottom navigation (Section 24.9), single-column layout throughout.
2. Primary action is a fixed bottom button (56px height, full-width minus 16px margins) or a floating action button for list screens — never a top-bar-only action, since thumbs live at the bottom.
3. Forms are single-column, single-field-per-row, with the next field auto-focused on submit where sensible.
4. Command palette (Section 37) is accessible via the persistent search icon in bottom nav, opening full-screen on mobile rather than as a floating overlay.

**Do:** Place the primary action within thumb reach at all times.
**Don't:** Don't place a screen's primary action only in a top navigation bar.
**Acceptance Criteria:** [ ] Every mobile screen's primary action is reachable within the bottom 30% of the viewport.

---

# 30. AI Experience Guidelines

**Purpose**
To operationalize the **95% Invisible AI / 5% Branded AI** philosophy — the single most important behavioral rule in CowQ.

**Rules**
1. **The 95/95 rule:** AI should be doing work in roughly 95% of the meaningful moments in the product, but visually announcing itself in no more than 5% of screen real estate at any time. Invisible AI = inferred defaults, auto-categorization, auto-pricing suggestions applied silently to drafts, fraud detection, auto-replies drafted and ready. Branded AI (Bell Mark, Section 21) = the rare moments AI needs explicit human sign-off (Principle 2 — never destroy or send without consent on consequential actions).
2. **Never ask what AI can infer.** Before adding any form field or question, the team must document why AI cannot infer the answer from existing data (photos, past orders, business category, location). If no good reason exists, the field is removed and AI infers it, with an editable, unobtrusive override always available.
3. **AI never interrupts a flow.** No modal AI popups during an active task (e.g., no "Want AI help?" dialog while a user is mid-checkout-setup). AI surfaces appear as passive, dismissible glass cards (Section 15) that the user can act on when ready.
4. **AI always shows its work when it takes a consequential action.** A drafted customer reply, an auto-priced product, an auto-generated product description — all are shown before finalization by default (Principle 2), with a "Trust CowQ, send automatically next time" opt-in that gradually raises the automation level per user, per action type, over time as trust is earned — never assumed on day one.
5. **AI speaks as CowQ, once, briefly — not as a chatbot persona.** No AI avatar, no name like "Cowbot," no chat-bubble UI as a primary interaction pattern. AI output appears inline within the relevant pillar (Section 6), authored in CowQ's plain, calm voice (Section 38).

**Examples**
- Instead of asking "What category is your business?" during onboarding, CowQ infers it from an uploaded shopfront photo or business name, silently populates the field, and shows it as an editable chip: "Jewellery & Accessories ✕" — one tap to correct if wrong, zero taps if right.

**Do**
- Default every AI-inferable field to inferred + editable, never to a blank required field.

**Don't**
- Don't build a chatbot as CowQ's primary AI interaction surface — AI lives inside workflows, not in a separate conversation window.

**Implementation Notes**
Every new feature spec includes an "AI Inference Audit": list every input field and mark each as Inferred / Asked (with justification required for every Asked field).

**Acceptance Criteria**
- [ ] Every form has a completed AI Inference Audit before release.
- [ ] Zero AI modal interruptions during active user tasks, audited per release.

---

# 31. Loading States

**Purpose**
To keep waiting calm and informative (Section 5, Rule 5).

**Rules**
1. No bare spinners. Every loading state uses a **skeleton** matching the final content's shape (card skeletons for cards, row skeletons for tables), using a slow (`duration-ambient`-adjacent, ~1.8s) shimmer at low contrast.
2. Loads under 400ms show nothing (avoid flicker). Loads 400ms–3s show skeletons. Loads over 3s add a one-line status label beneath the skeleton ("Fetching your last 90 days of orders…").
3. AI processing states use the Bell Pulse (Section 18) rather than a skeleton, since the "content" doesn't yet exist to skeleton-preview.

**Examples**
- Insights dashboard on first load: KPI card skeletons appear instantly, replaced by real numbers as they resolve, each card independently — no single blocking full-page spinner.

**Do**
- Load and reveal content progressively, card by card, rather than blocking the whole screen on the slowest query.

**Don't**
- Don't show a full-screen spinner for partial page loads.

**Acceptance Criteria**
- [ ] Zero full-screen blocking spinners for partial-content loads.

---

# 32. Empty States

**Purpose**
To treat emptiness as an invitation, never a dead end (per the frontend-design writing principle).

**Rules**
1. Every empty state has: one bespoke illustration (Section 22), one `display-md` Fraunces headline stating the opportunity (not the absence — "Your first product will appear here" not "No products found"), one sentence of supporting `body-md` copy, and exactly one `primary` button.
2. AI-assisted empty states offer to do the first step for the user where possible ("Let CowQ draft your first product listing from a photo" as the primary action, rather than a blank "Add Product" form).

**Examples**
- Empty Orders screen: illustration of an open ledger, headline "Your first order will land here," copy "Once your storefront is live, orders show up in real time — no refreshing needed," button "View my storefront."

**Do**
- Frame every empty state around the next concrete action, not the absence of data.

**Don't**
- Don't use generic "No data found" language anywhere.

**Acceptance Criteria**
- [ ] Zero instances of "No [X] found" language in shipped copy.

---

# 33. Success States

**Purpose**
To confirm completion calmly, reinforcing "CowQ handled it."

**Rules**
1. Routine success (saved a draft, updated a field) = a subtle inline confirmation (a brief Clover checkmark + `duration-fast` fade), never a toast — too small an event to interrupt with a notification.
2. Significant success (published storefront, received a payment, completed onboarding) = a toast (Section 36) or, for true milestones (first sale), a rare full-moment celebration using Illustration Style (Section 22) — used no more than a handful of times in the entire product lifecycle to preserve its impact.

**Examples**
- Saving a product edit: a small Clover check icon appears next to the "Save" button label momentarily, no toast.
- First sale ever: a brief, full-width celebratory banner with illustration, dismissible, appearing exactly once.

**Do**
- Reserve celebratory moments for genuine milestones only.

**Don't**
- Don't toast every minor save — this creates notification fatigue and violates the calm mandate (Section 5).

**Acceptance Criteria**
- [ ] Milestone celebrations are audited to appear at most once per milestone, ever.

---

# 34. Error States

**Purpose**
To keep the user never feeling wrong, always feeling informed (Section 5, Rule 6).

**Rules**
1. Every error states: what happened (plainly), why (if knowable), and the specific next step. No error ends without an action.
2. Field-level errors appear inline, below the field, in `rust-500` `body-sm`, with the field border switching to `rust-500` — never as a separate alert/dialog for simple validation.
3. System-level errors (payment gateway down, sync failed) appear as a persistent but dismissible banner at the Context Bar level (Section 8), not a blocking modal, unless the error blocks a consequential action in progress (e.g., mid-payment).
4. Error copy never uses blame language ("You entered an invalid email") — reframed as system guidance ("This email doesn't look complete — check for a typo").

**Examples**
- Failed payment sync: banner reads "We couldn't confirm this payment with your bank yet. We'll keep trying — no action needed," rather than a scary red full-screen error.

**Do**
- Always end error copy with either a fix-it action or an explicit reassurance that CowQ is handling it.

**Don't**
- Don't use "Error," "Failed," or "Invalid" as a standalone headline without context.

**Acceptance Criteria**
- [ ] Every error message includes a next step or reassurance.

---

# 35. Notifications

**Purpose**
To protect the owner's attention — notifications are the highest-risk surface for violating the calm/trust mandate.

**Rules**
1. Three tiers: **Needs you now** (a customer dispute, a failed payment) — push + in-app badge. **Worth knowing** (daily summary, a new review) — in-app only, digestible in the Insights pillar. **AI did this** (auto-categorized 12 products) — silent, logged in an AI Activity Log (Section 30), never pushed.
2. Push notifications are capped: a hard product-wide limit is enforced in code (max 3 push notifications per business per day, excluding real-time order alerts which the owner explicitly opts into per Principle 7 — seller controls their own alert intensity).
3. Every notification, of any tier, is actionable — tapping it goes directly to the relevant context, never to a generic inbox.

**Examples**
- "AI did this" tier: 12 products auto-tagged with seasonal categories — this never becomes a push notification; it's visible only if the owner opens the AI Activity Log.

**Do**
- Let the owner configure their own push threshold in Settings (Principle 7).

**Don't**
- Don't push-notify for anything in the "AI did this" tier.

**Acceptance Criteria**
- [ ] Hard cap of 3 non-critical push notifications/day enforced server-side.

---

# 36. Toast Messages

**Purpose**
To confirm significant, transient events without demanding action.

**Rules**
1. Position: bottom-center on mobile, bottom-right on desktop. Auto-dismiss after 4s (`duration-ambient`-independent, fixed UX timing, not a motion token). Max one toast visible at a time — new toasts queue, they don't stack.
2. Structure: icon (Clover check / Rust alert, never Bell Gold — gold is reserved for actions, not confirmations) + one line of text + optional single "Undo" action for reversible events (Principle 2).
3. Toasts never contain a "close" button for routine confirmations (they're transient by design); errors requiring dismissal use a banner (Section 34) instead, not a toast.

**Examples**
- "Product deleted. Undo" — 4s window, Clover check icon, single-line, bottom-right on desktop.

**Do**
- Provide "Undo" on every toast confirming a destructive or easily-mistaken action.

**Don't**
- Don't queue more than one toast visibly — stacking toasts creates visual noise.

**Acceptance Criteria**
- [ ] All destructive-action toasts include Undo.

---

# 37. Command Palette

**Purpose**
CowQ's power-user and accessibility backbone — reach anything in the five-pillar IA (Section 6) in under 3 keystrokes.

**Rules**
1. Trigger: `⌘K` / `Ctrl+K` (desktop), persistent search icon (mobile, opens full-screen).
2. Visual spec: glass surface (Section 15), `shadow-lg`, `radius-lg`, max-width 640px, centered, `duration-moderate` fade+scale entrance.
3. Results grouped by pillar with `label`-token group headers; fuzzy match on product names, customer names, order IDs (mono), and settings labels.
4. Includes AI-actionable commands directly (e.g., typing "reorder low stock" surfaces an AI action, not just a navigation result) — this is the one place invisible AI (Section 30) becomes an explicit, searchable capability.

**Examples**
- Typing "refund" surfaces: matching orders eligible for refund, the "Refund Policy" settings page, and (if applicable) an AI-suggested action "3 orders flagged for review — see them."

**Do**
- Keep the palette the single fastest path to any destination — faster than clicking through the sidebar.

**Don't**
- Don't limit the palette to navigation only — it must also execute actions.

**Acceptance Criteria**
- [ ] Every pillar's key destinations are reachable via palette search.

---

# 38. Brand Voice

**Purpose**
To define how CowQ "talks" — the personality behind every word in the product.

**Rules**
1. CowQ speaks like **a calm, capable operations manager who already did the work** — not a hype-y startup, not a cutesy assistant, not a corporate enterprise tool.
2. Voice attributes: **Plain. Certain. Warm, but not chatty. Never salesy inside the product** (marketing pages may have more energy; the product itself stays measured).
3. CowQ never uses exclamation points in system copy, never says "Oops!", never uses emoji in UI copy (emoji may appear in AI-drafted customer-facing content only if the seller's own brand voice uses them).
4. CowQ refers to itself in first person sparingly and only when taking direct action on the owner's behalf ("CowQ reordered your top 3 sellers") — otherwise, copy is voiceless/systemic ("Order confirmed").

**Examples**
- "Your storefront is live." — not "🎉 Congrats, you're live!!"
- "CowQ drafted 4 replies while you were away. Review them?" — not "Hey! I did some stuff for you, check it out!"

**Do**
- Read every piece of copy aloud as "a competent manager reporting status," not as marketing.

**Don't**
- Don't use exclamation points or emoji in core product UI copy.

**Acceptance Criteria**
- [ ] Zero exclamation points or emoji in shipped system UI copy, audited via automated string scan.

---

# 39. Microcopy Guidelines

**Purpose**
To operationalize Brand Voice into exact word choices.

**Rules**
1. Buttons: verb + object, active voice, matched consistently through the flow (Section, per frontend-design principle) — "Publish storefront" leads to a toast "Storefront published," never "Store is now live" (mismatched vocabulary breaks trust).
2. Labels name what the owner controls, not backend structure — "Who can see this" not "Visibility flag."
3. Sentence case throughout (not Title Case) for all UI text except the wordmark and page-level `heading-lg` titles, which are allowed Title Case for hierarchy clarity.
4. Numbers are never rounded without indication — show "₹48,204" not "₹48K" on any screen where precision matters (financial contexts); rounded forms ("₹48K") are permitted only in space-constrained summary contexts (KPI card subtext) and always with a tooltip/expansion to the exact figure.

**Examples**
- Field label: "Return window (days)" not "Return Policy Configuration."

**Do**
- Maintain a single shared microcopy glossary (a literal spreadsheet) that all writers and engineers pull strings from.

**Don't**
- Don't let engineers write user-facing strings without a UX writer pass before release.

**Acceptance Criteria**
- [ ] 100% of user-facing strings sourced from the shared glossary or reviewed by a writer.

---

# 40. Writing Style

**Purpose**
To extend Brand Voice into longer-form content: onboarding copy, help docs, AI-drafted customer messages.

**Rules**
1. Sentences average under 20 words. Paragraphs under 3 sentences in-product (longer form permitted only in help center articles).
2. Explanations lead with the outcome, then the mechanism, if any mechanism needs explaining at all ("Orders sync automatically — nothing to set up" rather than starting with how the sync works).
3. AI-drafted customer-facing content (replies, descriptions) adapts to the *seller's* voice over time (learned from their edits), while CowQ's own system copy never changes tone per seller — the product's own voice stays constant; only content it drafts *on behalf of* the seller can flex.

**Do**
- Write help content as tasks ("Set up your return policy") not topics ("Return Policies").

**Don't**
- Don't let CowQ's own system voice drift toward a seller's brand voice — that boundary (Section 38) stays fixed.

**Acceptance Criteria**
- [ ] Help center articles audited for task-based (not topic-based) titles.

---

# 41. Interaction Principles

**Purpose**
To define the physical feel of using CowQ — how it responds to touch, click, and keyboard.

**Rules**
1. Every interactive element responds within 100ms (`duration-instant`) to any input — no interaction ever feels unacknowledged, even if the underlying action takes longer (see Loading States, Section 31).
2. Destructive actions require an explicit secondary confirmation (Principle 2) — but routine, reversible actions (archiving, drafting) never require confirmation, to avoid confirmation fatigue that would erode trust in the *meaningful* confirmations.
3. Drag-and-drop is used only where spatial reordering is the actual mental model (product photo ordering, storefront section ordering) — never as a novelty interaction.
4. Every list supports keyboard arrow navigation + Enter to open, for power users and accessibility alike.

**Examples**
- Reordering storefront sections: drag handles appear on hover/focus, drop targets highlight with a `bell-gold-500` insertion line.

**Do**
- Confirm only truly destructive/consequential actions — trust confirmation fatigue is a real cost.

**Don't**
- Don't add confirmation dialogs to reversible actions.

**Acceptance Criteria**
- [ ] Every interactive element acknowledges input within 100ms, measured in QA.

---

# 42. Premium Experience Checklist

**Purpose**
A final gate before anything ships — the difference between "functional" and "feels like it costs something."

**Rules — the Checklist**
- [ ] Does this screen have exactly one primary action?
- [ ] Could a first-time user understand this screen without instructions?
- [ ] Does every number that represents money render in JetBrains Mono?
- [ ] Is Bell Gold used exactly once, for the one thing that matters most on this screen?
- [ ] Does the screen feel calm — no more than one moment of color, motion, or emphasis competing for attention?
- [ ] Would this screen still look complete with zero user customization (Section 24.13)?
- [ ] Does every loading, empty, and error state exist and follow Sections 31–34?
- [ ] Is there anything on this screen that could be inferred by AI instead of asked (Section 30)?
- [ ] Does this screen work, unaltered in hierarchy, at mobile width?
- [ ] Would Stripe or Apple's design team recognize this as considered, even if they wouldn't have made the same choices?

**Implementation Notes**
This checklist is a mandatory field in every design review and every PR touching UI.

**Acceptance Criteria**
- [ ] No UI PR merges without a completed Premium Experience Checklist.

---

# 43. Performance Rules

**Purpose**
Speed is a feature (Principle 4) — this section makes it measurable.

**Rules**
1. Time-to-Interactive target: **under 2.0s on 4G** for the core dashboard; under 1.2s for repeat visits (cached).
2. Every screen shows meaningful content within **400ms** or shows a skeleton (Section 31) — never a blank white/black frame.
3. Images are served responsively (srcset), lazy-loaded below the fold, and product photos are capped at reasonable dimensions server-side regardless of original upload size.
4. Fonts self-hosted, subset, and preloaded for the two most-used weights per family (Section 13) to avoid flash-of-unstyled-text.
5. AI-inference-driven fields (Section 30) never block initial page render — they populate progressively once resolved.

**Do**
- Budget every new feature against the TTI target before building — performance is a design spec input, not a post-launch fix.

**Don't**
- Don't ship an unoptimized third-party script (analytics, chat widgets) that measurably degrades TTI.

**Acceptance Criteria**
- [ ] Core dashboard TTI verified under 2.0s on throttled 4G in CI performance testing.

---

# 44. Design QA Checklist

**Purpose**
The mechanical, section-by-section audit every release runs before shipping.

**Rules — Audit against:**
- [ ] Color tokens only (Section 12), zero raw hex.
- [ ] Type scale only (Section 13), zero off-scale sizes.
- [ ] Spacing scale only (Section 10), zero arbitrary pixel values.
- [ ] Grid alignment (Section 9), verified via ledger overlay.
- [ ] Radius tokens only (Section 17).
- [ ] Motion presets only (Sections 19–20).
- [ ] Accessibility pass (Section 25) — automated + manual spot check.
- [ ] Empty/loading/error/success states present and compliant (Sections 31–34).
- [ ] Premium Experience Checklist (Section 42) completed.
- [ ] No mascot, gradient-as-default, pie chart, or pill-button violations (Sections 22, 11, 24.7, 17).

**Implementation Notes**
This checklist runs both as an automated lint/CI pass (tokens, spacing, contrast) and a manual design review (voice, hierarchy, calm).

**Acceptance Criteria**
- [ ] Every release has a signed-off Design QA Checklist attached to the release notes.

---

# 45. Tailwind Token Mapping

**Purpose**
To make every token in this document directly usable by engineers building in Lovable/React with Tailwind, with zero ambiguity.

**Rules — `tailwind.config` extension (representative excerpt):**

```js
theme: {
  extend: {
    colors: {
      'night-pasture': { 950:'#0B0F0D', 900:'#141A16', 800:'#1A211D', 700:'#242B26' },
      'milk': { 50:'#FAF7F0', 100:'#F2EEE3', 200:'#E4DFD0' },
      'bell-gold': { 400:'#DDB65E', 500:'#C79A3D', 600:'#A67D2A' },
      'clover': { 100:'#E4EFE6', 500:'#4C8B5C' },
      'rust': { 100:'#F3E2DC', 500:'#B4543B' },
      'amber': { 100:'#F5E9D3', 500:'#C98A2E' },
      'ink': { 900:'#1B1B18', 600:'#5C5B54', 400:'#96958C' },
      'paper': { 50:'#F5F2EA', 600:'#A8A599' },
    },
    fontFamily: {
      display: ['Fraunces', 'serif'],
      sans: ['Inter', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    borderRadius: { sm:'6px', md:'10px', lg:'16px', full:'9999px' },
    spacing: { 1:'4px',2:'8px',3:'12px',4:'16px',5:'24px',6:'32px',7:'48px',8:'64px',9:'96px',10:'128px' },
    boxShadow: {
      sm: '0 1px 2px rgba(11,15,13,0.06)',
      md: '0 4px 12px rgba(11,15,13,0.10)',
      lg: '0 16px 40px rgba(11,15,13,0.18)',
    },
    transitionDuration: { instant:'100ms', fast:'180ms', base:'240ms', moderate:'320ms', slow:'480ms' },
  }
}
```

**Do**
- Extend, never override, Tailwind's base scale — CowQ's tokens are additive, named distinctly (`bell-gold-500`, not a redefined `yellow-500`) to avoid accidental use of unbranded defaults.

**Don't**
- Don't use Tailwind's default color palette (`blue-500`, `gray-200`, etc.) anywhere in CowQ — only the tokens above are permitted, enforced via a custom ESLint/Tailwind plugin rejecting default color classes.

**Acceptance Criteria**
- [ ] Zero default Tailwind color classes in the codebase, enforced by lint.

---

# 46. Lovable Implementation Rules

**Purpose**
Since CowQ is being built in Lovable, this section governs how prompts and generated code must stay DNA-compliant.

**Rules**
1. Every Lovable prompt for a new screen or component must open with a fixed system-style preamble referencing this document (e.g., "Build using CowQ Design DNA: Night Pasture / Milk palette, Fraunces+Inter+JetBrains Mono, one primary action, radius-md buttons, no gradients, no pill buttons, no mascots").
2. Design tokens (Section 45) are set up once, project-wide, in Lovable/Tailwind config — never redefined per-prompt or per-component.
3. Every AI-generated component is checked against the Design QA Checklist (Section 44) before merging, same as human-authored code.
4. When Lovable's default generation drifts toward generic patterns (rounded-full buttons, gradient backgrounds, generic blue accents, sparkle icons for AI) the prompt must explicitly override with CowQ-specific direction — these are the most common default-drift failure modes to watch for.
5. Supabase schema and API naming should mirror the five-pillar IA (Section 6) — tables/routes named `storefronts`, `orders`, `catalog_items`, `customers`, `insights_*` — so the codebase itself reinforces the mental model.

**Examples**
- A correct Lovable prompt: "Add a KPI card row to the Insights home screen: 4 cards, Fraunces-adjacent mono-lg revenue figures, Clover/Rust trend indicators with explicit comparison window text, radius-lg cards, space-6 padding, space-7 gaps, no gradients, one AI suggestion glass card beneath using the Bell Mark."

**Do**
- Maintain a saved "CowQ DNA preamble" snippet reused verbatim across all Lovable sessions.

**Don't**
- Don't accept a Lovable-generated screen with default Tailwind blues, pill buttons, or a sparkle-icon AI treatment without correcting it before merge.

**Acceptance Criteria**
- [ ] Every Lovable-generated PR is checked against Section 44 before merge, no exceptions for "AI-generated" code.

---

# 47. Future Expansion Rules

**Purpose**
To govern how this document itself may grow — CowQ will add verticals, surfaces, and markets; the DNA must flex without fracturing.

**Rules**
1. New verticals (e.g., a future logistics or B2B wholesale product) inherit this entire document by default. A new vertical may *propose* an amendment (e.g., a new Service Component) but may never introduce a new color, typeface, or navigation paradigm.
2. Permanent, non-negotiable guardrails (cannot be amended, ever, without a full re-founding of the brand): no mascot (Section 22), no gradient-default (Section 11), no pill-shaped rectangular buttons (Section 17), no chatbot-persona AI (Section 30), the Bell Gold accent stays singular (Section 11).
3. Amendable-with-review guardrails: exact hex values (Section 12), type scale steps (Section 13), spacing scale granularity (Section 10) — these may evolve with a documented rationale and version bump (Section 50).
4. Any proposed amendment must state: what problem it solves, why existing rules can't solve it, and what it changes.

**Examples**
- Expanding into B2B wholesale ordering: reuses Orders, Catalog, Customers pillars entirely; may propose a new "Bulk Order" table variant under Section 24.6 rather than a new pillar.

**Do**
- Default to reuse before invention when expanding into new verticals.

**Don't**
- Don't let a new market's local competitor aesthetics ("but competitors in this market use bright colors") override the permanent guardrails.

**Acceptance Criteria**
- [ ] Every new-vertical launch plan includes a "DNA Reuse Audit" showing what's inherited vs. proposed-new.

---

# 48. Examples

**Purpose**
To anchor the abstract rules in concrete, described product moments.

**Example A — Home/Insights Dashboard**
Night Pasture background. Context Bar: "Good evening, [Shop Name]" in `heading-lg`. Four KPI cards in a 12-column grid (3 columns each): Revenue Today, Orders Today, AI Actions Taken, Customers Reached — each with a `mono-lg` figure, `label` caption, Clover/Rust trend arrow with explicit window text. Below: one glass AI suggestion card with Bell Mark, gently pulsing, offering to send 3 drafted replies. Below that: a Recent Orders table, mono-aligned totals, right-aligned. Exactly one `primary` button in the Context Bar: "View storefront."

**Example B — Onboarding Screen 2 of 5**
Milk background (light mode default for onboarding, warmer/more approachable than the operational dark mode). Fraunces `display-md` headline: "What do you sell?" A single upload dropzone: "Add a photo of your shop or products — CowQ will fill in the rest." No dropdown category picker shown by default; it appears only if AI inference confidence is low. One `primary lg` button: "Continue," disabled until a photo or manual category is provided.

**Example C — Product Detail Editor**
Two-column desktop layout: left column product photos (drag-reorder, Section 41), right column form (Section 24.4) with price in a mono-prefixed input, stock count, and an AI-drafted description shown pre-filled in an editable textarea with a small Bell Mark badge reading "Drafted by CowQ — edit anytime."

**Example D — Checkout**
Milk background, no sidebar, no navigation. Centered 480px column. Order summary in mono. One `primary lg` gold button: "Pay ₹1,240." Seller name + "Verified seller" badge above the fold. Nothing else on screen.

**Acceptance Criteria**
- [ ] These four examples are kept as living Figma reference frames, updated whenever a referenced section changes.

---

# 49. Acceptance Criteria (Global)

**Purpose**
The master checklist — the sum of every section's individual acceptance criteria, used as the final release gate.

**Rules — Global Acceptance Gate**
- [ ] Zero raw hex/spacing/shadow/radius values outside tokens (Sections 9, 10, 12, 16, 17).
- [ ] Zero fourth typeface, zero pie charts, zero pill buttons, zero mascots, zero gradients-as-default (Sections 13, 17, 22, 24.7, 11).
- [ ] One primary action per screen, verified on every release (Principle 1, Section 42).
- [ ] Every destructive action has confirmation or undo (Principle 2).
- [ ] Every form has a completed AI Inference Audit (Section 30).
- [ ] WCAG AA compliance verified in CI (Section 25).
- [ ] TTI under 2.0s for core dashboard (Section 43).
- [ ] Design QA Checklist signed off (Section 44).
- [ ] Every Lovable-generated screen passes Section 46 review.
- [ ] Brand voice audit passes: zero exclamation points/emoji in system copy (Section 38).

**Implementation Notes**
This global checklist is the literal release-blocking gate in the CI/CD pipeline's design-review stage.

**Acceptance Criteria**
- [ ] This document's global checklist passes before every production release, no exceptions, no "just this once."

---

# Part II — Extension System (formerly the v1.1 Addendum)

The sections below extend Part I into the marketplace, commerce, trust, deeper AI behavior, and native mobile — surfaces Part I didn't yet cover in depth. Nothing here repeats Part I; where a rule builds on a Part I section, it's cited directly (e.g. `§v1.0-30` = Section 30 above). Section numbering continues from 51 (Section 50 is reserved — see the combined Version History at Section 64).

---

# 51. Marketplace Design DNA

**Purpose**
v1.0 designed CowQ from the seller's chair. This section designs CowQ from the *customer's* chair — the stranger discovering a seller's shop for the first time, on a phone, often on a slow connection, often not knowing the seller personally. The marketplace is where CowQ's promise ("get any business online, fast, trustworthy") is judged by someone who owes CowQ nothing.

**Principles**
1. **A stranger's first five seconds decide everything.** The public shop must communicate legitimacy before it communicates anything else.
2. **Browsing is not the seller's dashboard, softened.** It is a distinct visual mode: warmer, more visual, less operational. Night Pasture's ledger-precision gives way to a lighter, more photographic register — but never abandons the token system (§v1.0-12).
3. **The customer never needs an account to look.** Only to buy. Every barrier before "look" is a lost customer; every barrier before "buy" is a trust checkpoint, handled per §53.

## 51.1 Public Seller Shops

**Rules**
1. Every shop has a permanent, guaranteed-populated hero: seller name, one hero image (shopfront/product/portrait — seller's choice, AI-suggested default per §v1.0-30), a one-line description (AI-drafted, editable), and a **Trust Strip** (§53.6) showing verified status, response time, and rating once available.
2. Shop pages render fully server-rendered/pre-rendered for first paint — a customer must see the seller's name and hero image before any JavaScript executes (Performance, §58).
3. Shop layout is templated, not freeform — sellers choose from a small number of curated Section blocks (Hero, Featured, Full Catalog Grid, About, Hours/Location, Reviews) in a fixed visual grammar (§v1.0-9), never a blank canvas. This guarantees every shop looks premium regardless of seller design skill (ties to §v1.0-3 Mission).
4. A persistent, non-intrusive "Powered by CowQ" mark appears in the shop footer only — never in a position competing with the seller's own brand.

**Do**
- Pre-render the hero and Trust Strip; lazy-load everything below the fold.
- Let a shop with zero customization still look complete (§v1.0-24.13).

**Don't**
- Don't allow freeform CSS/layout editing — this is the one place "seller owns everything" (§v1.0 Principle 7) is deliberately bounded, because unbounded customization breaks the premium-by-default guarantee and the loading performance guarantee.
- Don't put CowQ branding above seller branding anywhere on the shop page.

**Examples**
A jewellery seller's shop: hero image full-bleed at 16:9 on desktop / 4:5 on mobile, name in `display-md` Fraunces overlaid with a Night Pasture gradient scrim (the one sanctioned gradient use in the entire system — a functional legibility scrim, not a decorative gradient, see §51.9 for the exact spec), Trust Strip beneath, then the Featured Collection block.

**Implementation Notes**
Shop pages are statically generated / ISR'd per seller, revalidated on catalog change, so cold loads never wait on a database round-trip.

**Lovable Notes**
Prompt Lovable with: "Generate the public shop template as a fixed-section system (Hero / Featured / Grid / About / Trust Strip), not a page builder — sections are selected and reordered, never freely designed." Reject any Lovable output that introduces a WYSIWYG freeform canvas.

**Acceptance Criteria**
- [ ] Every shop page's hero + name + Trust Strip render within the first paint, verified via Lighthouse LCP element check.
- [ ] Zero shops with a broken/incomplete layout at default settings.

## 51.2 Customer Browsing

**Rules**
1. Browsing is optimized for **scanning, not reading** — customers compare, they don't study. Grid density defaults to 2-up on mobile, 4-up on desktop, adjustable by the customer (2/3/4-up toggle, desktop only).
2. Infinite scroll is used for catalog browsing (not pagination) — but with a persistent, lightweight "Back to top" affordance and preserved scroll position on back-navigation (inherits §v1.0-7 Rule 5).
3. A sticky mini category bar appears once the customer scrolls past the hero, keeping navigation available without returning to the top.
4. No login wall on browsing. A cart badge accumulates without an account, using a session-persisted, device-local cart (converted to an account-linked cart only at checkout, §52.1).

**Do**
- Preserve exact scroll + filter state when a customer taps into a product and back.

**Don't**
- Don't paginate the main catalog browse — infinite scroll is the correct pattern for a scanning-oriented, mobile-first browsing task.
- Don't require signup to add to cart or browse.

**Examples**
Scrolling a shop's catalog: grid loads 12 products, then progressively fetches 12 more at 80% scroll depth, skeleton-carded (§v1.0-31) during fetch, no layout shift.

**Implementation Notes**
Virtualize long catalog grids (>60 items) to protect scroll performance on low-end Android devices — a real constraint for CowQ's target market (§62).

**Lovable Notes**
Specify virtualization explicitly in prompts for any catalog grid exceeding 50 items; Lovable's default React list rendering will not virtualize automatically.

**Acceptance Criteria**
- [ ] Catalog browsing has zero login requirement before cart add.
- [ ] Infinite scroll shows zero cumulative layout shift (CLS) on new batch load.

## 51.3 Product Cards

**Rules**
1. Structure, fixed order: image (1:1 default, `radius-md` frame per §v1.0-23) → name (`body-lg`, 1 line, truncate) → price (`mono-md`, strike-through original + Bell Gold-adjacent sale price shown only when a real discount exists, never decorative) → one micro-signal row (rating stars OR "12 sold this week" OR stock urgency — never more than one signal to avoid noise, chosen by relevance priority: urgency > social proof > rating).
2. Tap target is the entire card, not just the image or the name — 100% of the card surface is interactive.
3. Add-to-cart is a small persistent icon-button bottom-right of the image on hover (desktop) / always-visible on mobile — a secondary action, never competing with the card-tap "view product" primary interaction (§v1.0 Principle 1 applied at component scale).

**Do**
- Show real, current stock urgency ("Only 2 left") only when genuinely true and algorithmically verified — never simulated scarcity.

**Don't**
- Don't fabricate urgency or social proof signals. This is a hard trust rule (§53), not a style preference.
- Don't show more than one micro-signal per card — competing signals reduce scannability.

**Examples**
A card showing "★4.8 (32)" never also shows "Only 3 left" simultaneously — the system picks the single highest-priority true signal.

**Implementation Notes**
Micro-signal priority logic lives server-side as a single `getCardSignal(product)` function, keeping the rule enforced at the data layer, not per-component developer discretion.

**Lovable Notes**
Do not let Lovable generate ad hoc "badge" combinations per product card variant — reference the single shared `<ProductCard>` component and its signal priority function.

**Acceptance Criteria**
- [ ] Zero product cards render more than one micro-signal simultaneously.
- [ ] Zero fabricated scarcity/social-proof copy in the codebase.

## 51.4 Service Cards

**Rules**
1. Service cards replace price-first hierarchy with **availability-first**: name → next available slot (mono, e.g., "Next: Today, 4:00 PM") → starting price (`mono-md`, "from ₹500") → provider micro-signal (rating or response time).
2. Booking-ready services show a `secondary` "Check availability" button directly on the card (skips one step for the highest-intent customers); non-schedulable services (e.g., custom-quote work) show `ghost` "Get a quote" instead — card CTA text is data-driven, never hardcoded per template.

**Do**
- Lead with time-to-availability for services — it's the single highest-intent piece of information for a service buyer.

**Don't**
- Don't apply the identical product-card template to services — availability, not stock, is the scarcity signal that matters here.

**Examples**
A tailoring service card: "Alterations & Fitting" / "Next: Tomorrow, 11:00 AM" / "from ₹300" / "★4.9 · replies in ~2 hrs."

**Implementation Notes**
Availability is computed server-side from the seller's live calendar (§v1.0-24.15), cached at short TTL (60s) to stay accurate without hammering the calendar service on every card render.

**Lovable Notes**
Prompt distinctly: "Service cards are not product cards with a different label — build a separate `<ServiceCard>` component with availability-first hierarchy."

**Acceptance Criteria**
- [ ] Service card next-availability figure is never stale by more than 60 seconds.

## 51.5 Search

**Rules**
1. Global marketplace search (across all CowQ sellers, distinct from the in-shop search that reuses §v1.0-37's palette pattern) uses a full-screen takeover on mobile, an expanding bar on desktop — never a separate search results page navigation on first keystroke (results stream in beneath the same bar).
2. Search results are grouped: Shops, Products, Services, Categories — in that order, reflecting that a named-seller search intent is common in a market where customers already know a seller from Instagram/WhatsApp (a CowQ-specific insight, §62).
3. Typo-tolerant, transliteration-aware matching (§62) is mandatory — a search for "mehendi" must match "mehndi," "henna," and their Devanagari-script equivalents where seller content includes them.
4. Zero-result states never show a dead end: they show adjacent categories and a "Notify me" option if the term looks like a product type CowQ doesn't have inventory for yet.

**Do**
- Stream results progressively as the customer types, after a 200ms debounce — never wait for a full query to render nothing.

**Don't**
- Don't return a hard "0 results" screen with no path forward.

**Examples**
Typing "chola" returns shop name matches (a shop called "Chola Silks"), product matches ("Chola-style saree"), and a category suggestion ("Sarees") — grouped and labeled.

**Implementation Notes**
Search index built on a dedicated search service (e.g., Meilisearch/Typesense-class) supporting typo tolerance and multi-script tokenization — not a naive SQL `LIKE` query.

**Lovable Notes**
Search backend is out of Lovable's default scope — specify the search service integration explicitly and do not let Lovable scaffold a basic SQL search as a placeholder that quietly becomes production.

**Acceptance Criteria**
- [ ] Search returns grouped results within 300ms p95.
- [ ] Zero true dead-end zero-result screens.

## 51.6 Filters

**Rules**
1. Filters live in a bottom sheet on mobile (§55.7), a persistent left rail on desktop (within the marketplace/category context — distinct from the seller dashboard sidebar, §v1.0-24.8, which this must never be confused with visually).
2. Applied filters always render as removable chips (`radius-full`, per the pill exception in §v1.0-17) directly above the results grid — never hidden inside a reopened filter panel to check what's active.
3. Filter counts are shown live ("Under ₹500 (24)") — never a filter option that would return zero results after combination; options gray out and disable dynamically as combinations narrow.

**Do**
- Show a single "Clear all" action once ≥1 filter is active.

**Don't**
- Don't show filter options that yield zero results as clickable — disable and gray them, or hide them.

**Examples**
Filtering "Handmade" + "Under ₹1000" on a jewellery shop's catalog: 24 → 9 results, chip row shows "Handmade ✕ · Under ₹1000 ✕ · Clear all."

**Implementation Notes**
Filter facet counts computed via the same search service as §51.5, returned alongside results in one query to avoid a second round-trip.

**Lovable Notes**
Specify facet-aware filtering explicitly; a naive client-side filter implementation will not have live, accurate counts.

**Acceptance Criteria**
- [ ] Zero filter combinations presented as available that yield zero results.

## 51.7 Categories

**Rules**
1. Categories are a **fixed, curated, India-market-informed taxonomy** (not seller-invented free-text tags) to keep cross-seller browsing coherent — sellers select from CowQ's taxonomy at listing time, with AI pre-selecting the most likely category from the product photo (§v1.0-30).
2. Category browse pages follow the same template as shop pages structurally (hero-light header, grid below) for IA consistency (§v1.0-6).
3. Maximum 2 levels of category depth (Category → Subcategory) — never a third level, preserving the "3 taps to anywhere" spirit of §v1.0-6 Rule 4 for customers too.

**Do**
- Let AI suggest new taxonomy entries for review when a meaningful cluster of "Other"-tagged products emerges — taxonomy evolves centrally, not per-seller.

**Don't**
- Don't let sellers create their own top-level categories — this fragments cross-shop discovery.

**Examples**
"Fashion & Apparel → Sarees" is valid. "Fashion & Apparel → Sarees → Silk → Kanjeevaram" (3 levels) is not permitted in navigation, though "Kanjeevaram" may exist as a filter facet within Sarees.

**Implementation Notes**
Taxonomy stored as a versioned, centrally-managed config, not a per-seller database table — changes are a content-ops process, not a code deploy, but still require review (§47-style governance).

**Lovable Notes**
Do not let Lovable auto-generate category options from seller free-text input — categories are selected from a fixed enum.

**Acceptance Criteria**
- [ ] Zero seller-created top-level categories in production data.
- [ ] Category depth never exceeds 2 levels in navigation.

## 51.8 Collections

**Rules**
1. Collections are seller-curated (or AI-suggested) groupings that cut across categories — "Diwali Gifting," "Under ₹500," "New This Week" — rendered as horizontally-scrollable shelves on the shop home and category pages.
2. A collection requires a minimum of 4 products to render publicly (avoids a visibly sparse, low-trust shelf) — AI flags under-populated collections to the seller privately rather than publishing them thin.
3. "New This Week" and "Best Sellers" are **system-generated collections**, present by default on every shop with sufficient data, requiring zero seller setup (inherits §v1.0-30's inference-first mandate).

**Do**
- Auto-populate at least one system collection on every shop from day one where data allows.

**Don't**
- Don't publish a collection with fewer than 4 items.

**Examples**
A shop home page: Featured (seller-curated) → New This Week (system) → Best Sellers (system) → Full Catalog Grid.

**Implementation Notes**
Collection membership computed via a scheduled job for system collections; seller-curated collections stored as an ordered product-ID array.

**Lovable Notes**
Build system collections as a background job output, not a real-time query, to protect page-load performance (§58).

**Acceptance Criteria**
- [ ] Every eligible shop has ≥1 populated system collection within 24 hours of catalog reaching minimum size.

## 51.9 Marketplace-Specific Visual Extensions

**Purpose:** Two narrow, sanctioned extensions to the v1.0 visual system, needed only in customer-facing marketplace contexts.

**Rules**
1. **Legibility scrim (the one sanctioned gradient):** `linear-gradient(180deg, transparent 0%, night-pasture-950 88% 100%)` at 70% max opacity, used only beneath text overlaid on a photographic hero image, never decoratively. This does not repeal §v1.0-11 Rule 6 — it is a functional exception, documented here permanently.
2. **Photographic density:** marketplace surfaces permit a higher ratio of imagery-to-whitespace than the seller dashboard (roughly 60/40 image-to-neutral vs. the dashboard's more spacious ledger feel) — because browsing is visually driven, while the dashboard is operationally driven. Grid gutters (§v1.0-9) stay identical; only image prominence changes.

**Do**
- Apply the scrim only where text-over-image legibility genuinely requires it (verified via contrast check, §v1.0-25).

**Don't**
- Don't introduce any other gradient anywhere in the marketplace beyond this single documented scrim.

**Implementation Notes**
Scrim shipped as a single shared `<HeroScrim>` component/CSS class — never hand-recreated per screen.

**Lovable Notes**
When Lovable proposes a gradient anywhere else in the marketplace, reject and redirect to this section as the sole exception.

**Acceptance Criteria**
- [ ] The legibility scrim is the only gradient present in the shipped marketplace codebase, verified via CSS audit.

---

# 52. Commerce Design DNA

**Purpose**
v1.0 sketched Checkout Components (§v1.0-24.16) at a high level. This section builds the full, precise commerce flow — cart through refund — as the highest-trust, highest-stakes surface family in CowQ. Money changing hands between strangers is where design failure is most costly.

**Principles**
1. **Every commerce screen must be independently, instantly auditable** — a customer or seller should be able to reconstruct exactly what happened and why from the UI alone, without contacting support.
2. **No commerce action is ever ambiguous about its finality.** The system always distinguishes "this is done" from "this is pending" from "this is reversible."
3. **Commerce UI never sells.** Upsells, cross-sells, and promotional content are strictly forbidden inside cart, checkout, and order-status flows (extends §v1.0-24.16 Don't).

## 52.1 Cart

**Rules**
1. Cart is **per-shop**, not a cross-marketplace cart — a customer buying from two different CowQ sellers checks out twice. This is a deliberate trust and settlement-clarity decision: each seller is a distinct business, and blending their orders would obscure who is responsible for what (extends §v1.0 Principle 7 to the customer side — the seller's order integrity is protected).
2. Cart persists across sessions via device-local storage pre-login, merged into the account cart on login/signup at checkout — never lost.
3. Every cart line item shows: image thumbnail, name, unit price (mono), quantity stepper, line total (mono), and a `ghost` remove action — no hidden fees appear later; if a fee applies (delivery, platform fee if any), it is itemized in the cart, not revealed only at the final payment step.
4. Cart quantity changes and removals show optimistic UI updates (immediate visual response) with silent server reconciliation — never a spinner-blocked quantity stepper.

**Do**
- Itemize every fee in the cart before the customer reaches payment entry.

**Don't**
- Don't surprise the customer with a new fee at the final payment screen that wasn't itemized in cart.
- Don't merge multiple sellers into a single cart/checkout.

**Examples**
Cart summary: Subtotal ₹1,240 · Delivery ₹40 · Total ₹1,280 (mono, right-aligned, `heading-md` for Total only, everything above it `body-md`/`mono-md`).

**Implementation Notes**
Cart state stored client-side (localStorage/IndexedDB) pre-auth, synced to a `carts` table keyed to session or account post-auth.

**Lovable Notes**
Explicitly prompt for per-shop cart isolation — Lovable's default e-commerce scaffolds often assume a single-vendor cart model.

**Acceptance Criteria**
- [ ] Zero cross-seller carts possible in the data model.
- [ ] Zero fees appear at payment that weren't itemized in cart.

## 52.2 Checkout (Extending §v1.0-24.16)

**Rules**
1. Checkout is a **single-page, progressive-disclosure flow** (not a multi-step wizard with page reloads): Delivery details → Payment → Review, each section expanding in place as the prior completes, all on one URL — minimizing perceived steps (ties to §v1.0-3 Mission, TTFV-equivalent for purchase).
2. Guest checkout is always available; account creation is offered *after* a successful first purchase ("Save these details for next time?"), never required before.
3. The Review section restates the full order (line items, fees, delivery address, payment method) in mono/mono-adjacent formatting identical to the cart, so nothing changes visual representation between cart and final review — consistency prevents last-second confusion.
4. Address entry uses autocomplete (PIN code-first lookup, common in Indian address entry patterns, §62) rather than free-text-only, reducing failed deliveries.

**Do**
- Keep checkout on a single scrolling page/URL with progressive section reveal.

**Don't**
- Don't force account creation before purchase.
- Don't use a multi-page wizard with full navigation/back-button page loads for checkout.

**Examples**
A customer completes checkout in 3 taps on a returning-customer flow: saved address auto-selected, saved payment method auto-selected (never auto-charged without explicit final tap), one "Pay ₹1,280" tap.

**Implementation Notes**
Checkout section state is local component state, not route-based, to avoid any full-page navigation during the flow.

**Lovable Notes**
Prompt explicitly: "single-page progressive checkout, no wizard routing" — Lovable's default scaffolding tends toward multi-route checkout wizards.

**Acceptance Criteria**
- [ ] Checkout occurs on a single URL/route from start to payment confirmation.
- [ ] Returning customers complete checkout in ≤3 taps.

## 52.3 Payments

**Rules**
1. Supported payment methods are shown as recognizable, real logos (UPI apps, cards, netbanking) — never generic icon substitutes — because payment-method recognition is a trust signal in itself in the Indian market (§62).
2. UPI is the default, first-listed payment option (reflecting real Indian small-commerce usage patterns), with a one-tap "Pay via UPI app" flow where possible (deep-link/intent-based), not just a manual VPA entry field.
3. Payment processing state shows a determinate, honest progress indication where the gateway supports it; where it doesn't, an indeterminate state is paired with explicit reassurance copy ("Confirming with your bank — this can take up to 30 seconds") rather than a bare spinner, extending §v1.0-31.
4. Payment failure always distinguishes cause when known: insufficient funds, bank declined, network timeout, customer cancelled — each with tailored, non-blaming next-step copy (extends §v1.0-34).

**Do**
- List UPI first, prominently, with app-intent deep-linking where the platform supports it.

**Don't**
- Don't use generic "credit card" iconography where a specific, recognized local payment method icon is available and truthful.

**Examples**
Payment failure due to bank timeout: "Your bank didn't respond in time. No amount was deducted — try again or use a different payment method," with a `primary` "Try again" button.

**Implementation Notes**
Payment gateway integration (Razorpay/similar) webhook-driven status updates reflected in near-real-time via a lightweight polling or websocket connection during the payment-pending window.

**Lovable Notes**
Payment gateway logic should not be fully generated by Lovable from scratch — use the gateway's official SDK/components wrapped in CowQ-styled containers, and explicitly instruct Lovable not to hand-roll payment state handling.

**Acceptance Criteria**
- [ ] Zero bare, unlabeled spinners during payment processing.
- [ ] Every payment failure state names a specific, honest cause where the gateway provides one.

## 52.4 Orders

**Rules**
1. Order status uses a **fixed, universal five-state model** across the entire product (customer view, seller view, and any future admin view): `Placed → Confirmed → Preparing/Fulfilling → Out for Delivery/Ready → Completed`, plus the exception states `Cancelled` and `Refunded` which can branch from any point before Completed.
2. Every status change is timestamped and shown in a vertical timeline (mono timestamps) on the order detail screen — never just a single current-status label with history hidden.
3. Status labels are identical, verbatim, between seller dashboard and customer-facing order tracking — this is a strict vocabulary-consistency rule (extends the Brand Voice consistency principle, §v1.0-39 Rule 1, across both audiences of the same data).

**Do**
- Show full order status history as a timeline, always.

**Don't**
- Don't invent vertical-specific status labels (e.g., a service provider calling a status "Job Started" while the customer sees "Preparing" for the identical underlying state) — one shared vocabulary, mapped consistently.

**Examples**
Order timeline: "Placed — Jul 28, 2:04 PM" / "Confirmed — Jul 28, 2:06 PM" / "Preparing — Jul 28, 2:40 PM" / "Out for Delivery — Jul 29, 9:12 AM" — each in `mono-sm` beside a `body-md` status label, connected by a vertical line with filled Clover dots for completed steps, hollow for pending.

**Implementation Notes**
Order status stored as a single enum with a strictly append-only status-history log table — never mutate history, only append new entries.

**Lovable Notes**
Enforce the five-state enum at the schema level; do not let Lovable introduce vertical-specific status variants during scaffolding.

**Acceptance Criteria**
- [ ] Identical status vocabulary verified across seller and customer surfaces, audited via string comparison.
- [ ] 100% of orders have a complete, append-only status history.

## 52.5 Refunds

**Rules**
1. Refund eligibility and amount are always shown to the customer *before* they confirm a refund request — no black-box refund requests where the outcome is unknown until after submission.
2. Refund status is a sub-timeline attached to the parent order (§52.4), not a separate disconnected flow — a refunded order still shows its full original timeline plus the refund branch.
3. Partial refunds display itemized line-level detail (which items, what amount, why) in mono, identical formatting to cart/checkout — consistency of financial representation across the entire commerce surface (ties to §v1.0 Principle 5, Trust before delight).
4. Refund processing time is stated explicitly and honestly per payment method ("UPI refunds typically arrive within 3–5 business days") — never a vague "soon."

**Do**
- Show exact refund amount and expected timing before the customer confirms the request.

**Don't**
- Don't process a refund silently without a corresponding, visible timeline entry.

**Examples**
Partial refund detail: "Refunded: 1 × Silver Anklet — ₹450 · Reason: Damaged in transit · Expected in your account by Aug 2."

**Implementation Notes**
Refund records reference specific order line items via foreign key, never a freeform amount disconnected from itemized cause.

**Lovable Notes**
Model refunds as a child entity of orders, not a standalone table disconnected from order line items.

**Acceptance Criteria**
- [ ] 100% of refunds show itemized cause and amount before confirmation.

## 52.6 Inventory

**Rules**
1. Stock states render as exactly three tiers, consistently: **In Stock** (Clover dot, no number shown — precision here creates false urgency without benefit), **Low Stock** (Amber dot + exact count shown, "Only 4 left" — precision here is genuinely useful, driving honest urgency), **Out of Stock** (Rust dot, product remains visible but not purchasable, with an optional "Notify me when back" action — never hidden, since hiding sold-out items removes useful seller-visibility signal §v1.0 Principle 7).
2. Inventory updates from AI-assisted counting/photo-based stock estimates (a CowQ-specific capability) are always shown to the seller as a suggested count requiring one-tap confirmation before affecting live storefront stock — never silently overwriting seller-entered numbers (extends §v1.0-30 Rule 4's "show its work" mandate to inventory specifically, since silent stock errors directly cause failed orders).
3. Low-stock threshold is seller-configurable per product but defaults to a sensible AI-suggested value based on that product's sales velocity — not a single global hardcoded number across all products.

**Do**
- Keep out-of-stock products visible with a clear, non-purchasable state rather than removing them.

**Don't**
- Don't silently overwrite a seller's manually-entered stock count with an AI estimate.

**Examples**
An AI photo-based recount flags: "CowQ counted 7 units of 'Blue Cotton Kurta' from your latest photo — update stock from 4 to 7?" with `primary` Confirm / `ghost` Dismiss.

**Implementation Notes**
Stock count is a single source of truth per product-variant; AI estimates write to a separate `suggested_stock` field until confirmed, never directly to `stock_count`.

**Lovable Notes**
Do not let AI-driven inventory features write directly to the live stock field — always route through a suggestion-and-confirm pattern.

**Acceptance Criteria**
- [ ] Zero silent AI overwrites of seller-entered stock counts.
- [ ] Out-of-stock products remain visible (not hidden) in 100% of cases, with a "Notify me" fallback available.

## 52.7 Pricing

**Rules**
1. All customer-facing prices are tax/fee-inclusive by default (matching standard Indian retail expectation) — "what you see is what you pay," with any breakdown available on tap/hover but never required reading to know the final cost.
2. AI-suggested pricing (an explicit CowQ differentiator per seller memory context) is always presented to the seller with its reasoning summarized in one line ("Priced at ₹450 — similar handmade items in your area sell for ₹400–₹500") — extending AI Reasoning transparency (§54.7) into commerce specifically.
3. Discounts/sales always show both the original and discounted price (strikethrough + new price, both mono) — a price shown as discounted without a visible original is not permitted, a hard anti-dark-pattern rule.

**Do**
- Always show the "why" behind an AI price suggestion in one line, inline, not buried in a tooltip.

**Don't**
- Don't display a "sale" price without the original price visible alongside it.
- Don't hide taxes/fees until the final checkout step (§52.1 Rule 3 already establishes this at the cart level — this reaffirms it at the pricing-display level product-wide).

**Examples**
Product price shown as: ~~₹600~~ **₹450** (mono, strikethrough grey / mono bold Bell-Gold-adjacent... note: price emphasis uses `ink-900`/`paper-50` bold, not Bell Gold, since Bell Gold is reserved for actions per §v1.0-11 Rule 5 — sale price uses `clover-500` to tie "savings" to the existing success-semantic color instead).

**Implementation Notes**
Price display component (`<PriceDisplay>`) is a single shared primitive enforcing the strikethrough+new-price pairing at the component level, not per-screen developer discretion.

**Lovable Notes**
Specify the shared `<PriceDisplay>` primitive explicitly so no screen hand-builds a standalone discount price render.

**Acceptance Criteria**
- [ ] Zero discounted prices shown without a visible original price.
- [ ] 100% of customer prices are tax/fee-inclusive at first display.

---

# 53. Trust Design DNA

**Purpose**
CowQ asks strangers to pay small, often first-time, sellers. Trust is not a feature category — it is the substrate every other section stands on. This section makes trust legible, consistent, and honest, rather than performative.

**Principles**
1. **Trust signals must be true or absent — never simulated.** (Direct extension of §51.3's anti-fabrication rule to the entire product.)
2. **Verification is a spectrum, shown honestly** — CowQ never implies a higher trust tier than a seller has actually earned.
3. **Privacy and security are shown, not just practiced** — a customer should be able to see, in plain language, what CowQ does and doesn't do with their data, without reading a legal document.

## 53.1 Verification

**Rules**
1. Three seller verification tiers, visually and textually distinct: **Unverified** (no badge shown — absence of a badge is itself the honest signal, never a negative badge), **Identity Verified** (single neutral checkmark badge, Ink/Paper-toned, not Bell Gold — verification is baseline trust, not a premium/promotional signal), **CowQ Established** (a slightly elevated badge shown only after a sustained track record — sales volume + time + low dispute rate — algorithmically earned, never purchasable).
2. Verification badges always link to a plain-language explanation on tap ("What does Identity Verified mean?") — never an opaque icon with no explanation available.
3. Verification status is never used as a paid upsell ("pay to get verified faster") — this is a permanent guardrail tied to §v1.0 Principle 5 (Trust before delight) and Principle 7.

**Do**
- Make every badge tappable/hoverable with a one-line plain-language explanation.

**Don't**
- Don't sell verification tiers — they are earned through identity checks and track record only.
- Don't use Bell Gold for verification badges — reserve gold strictly for actions per §v1.0-11.

**Examples**
Badge tap reveals: "Identity Verified means CowQ has confirmed this seller's government ID and phone number. It doesn't guarantee product quality — check reviews for that."

**Implementation Notes**
Verification tier computed server-side from a defined rubric (identity check pass + account age + dispute rate thresholds), stored as an enum, never manually overridden without an audit log entry.

**Lovable Notes**
Do not let Lovable generate a generic "verified" checkmark styled in the primary brand accent — verification badges use neutral Ink/Paper tones specifically, per Rule 2 above.

**Acceptance Criteria**
- [ ] Every verification badge is tappable with a plain-language explanation.
- [ ] Zero paid paths to verification status exist in the product.

## 53.2 Privacy

**Rules**
1. A **Privacy Snapshot** (not a link to a legal document) is available from the checkout screen and the seller's data settings: 3–5 plain sentences stating exactly what data is collected, what it's used for, and what it's never used for ("We never sell your phone number or order history to advertisers").
2. Customer data visible to a seller is limited to what's operationally necessary to fulfil the order (name, delivery address, order contents, contact for delivery) — full account/browsing history across other sellers is never exposed to any individual seller.
3. Any data-sharing action (e.g., a seller exporting a customer list) requires the customer's data to be handled per a visible, logged consent trail — extending §53.1's "earned, not assumed" trust logic to data specifically.

**Do**
- Write the Privacy Snapshot in the same Brand Voice (§v1.0-38) as the rest of the product — plain, certain, warm.

**Don't**
- Don't expose a customer's cross-seller order history to any individual seller.

**Examples**
Privacy Snapshot at checkout: "CowQ shares your name, address, and order details with [Seller Name] to fulfil this order. We don't share your data with other sellers or advertisers. Read the full policy →"

**Implementation Notes**
Data access is scoped at the API/database level per seller-customer relationship — not just hidden in the UI, genuinely inaccessible cross-seller.

**Lovable Notes**
Enforce data scoping at the Supabase RLS (row-level security) layer explicitly — this must not be a UI-only restriction.

**Acceptance Criteria**
- [ ] RLS policies verified to prevent any cross-seller customer data access at the database level.
- [ ] Privacy Snapshot present and accurate at every data-collection touchpoint.

## 53.3 Security

**Rules**
1. Security status is communicated through **absence of alarm**, not presence of badges — a standard padlock/HTTPS indicator via the browser is sufficient; CowQ does not clutter checkout with an excess of "100% Secure!" badge iconography, which paradoxically reduces perceived trust in sophisticated users and is explicitly avoided as a dark-pattern-adjacent convention.
2. Sensitive actions (changing payout bank details, changing account email/phone) always require re-authentication (password or OTP re-entry), regardless of an active session — a permanent security guardrail.
3. Session timeout for sensitive seller financial screens (payouts, bank details) is shorter (15 min idle) than the general app session (30 days) — differentiated by data sensitivity.

**Do**
- Require re-authentication for payout/bank-detail changes, always, without exception.

**Don't**
- Don't stack multiple redundant "secure checkout" badge graphics — one honest signal is stronger than five decorative ones.

**Examples**
Changing payout bank details: "For your security, confirm your password to continue" — a single, calm, non-alarming re-auth prompt.

**Implementation Notes**
Re-authentication implemented as a dedicated middleware check on sensitive-action API routes, not a client-side-only gate.

**Lovable Notes**
Explicitly specify server-side re-auth enforcement — a client-only re-auth modal is insufficient and must be flagged as a security gap if Lovable generates only that.

**Acceptance Criteria**
- [ ] 100% of sensitive financial-detail changes require server-verified re-authentication.

## 53.4 Fraud Prevention

**Rules**
1. Fraud detection runs **invisibly by default** (§v1.0-30's 95% invisible layer) — flagged orders are held for a brief automated review without the customer ever seeing a "you might be a fraudster" message; only genuinely necessary friction (e.g., an additional verification step) surfaces, always framed neutrally ("We need to double-check this order — won't take long").
2. Sellers see fraud-risk signals on flagged orders (as a `amber-500` badge + one-line reason, e.g., "New customer, high order value, unusual delivery distance"), never a hard block — the seller retains final judgment (extends §v1.0 Principle 7).
3. False-positive recovery is fast and dignified: a legitimate customer wrongly flagged has one clear path to resolution (an OTP re-verification, typically) with no accusatory language anywhere in the flow.

**Do**
- Frame every fraud-related friction point neutrally, procedurally — never accusatory.

**Don't**
- Don't hard-block a seller from fulfilling an order based on a fraud score alone — surface the signal, let the seller decide.

**Examples**
Seller-facing flag: "⚠ This order has an unusual pattern (new account, large first order). Most of these are genuine — review the details before shipping."

**Implementation Notes**
Fraud scoring is a background service producing a risk score + reason codes, consumed by both the customer-facing friction logic and the seller-facing badge — one scoring system, two presentations.

**Lovable Notes**
Fraud scoring model/service is out of Lovable's scaffolding scope — integrate as an external service call, styled through CowQ's standard badge/banner components only.

**Acceptance Criteria**
- [ ] Zero hard order blocks triggered by fraud score alone without seller override capability.
- [ ] Zero accusatory language in any fraud-related customer or seller copy.

## 53.5 Permission Patterns

**Rules**
1. Every permission request (camera, location, notifications) is preceded by a **contextual priming screen** in CowQ's own UI, explaining the specific value, before the native OS permission dialog ever appears — the native dialog is only triggered after the customer/seller opts in to the priming screen, maximizing genuine grant rates and avoiding "permission denied forever" dead ends.
2. Declined permissions always have a graceful, functional fallback — the product degrades, never breaks (e.g., camera-denied product upload falls back to file picker, §55.3).
3. Permission requests are timed to the moment of need, never bundled at onboarding ("we might need these later") — a direct extension of §v1.0-30's "never ask what isn't needed yet."

**Do**
- Always prime with CowQ's own explanation before triggering the native OS permission prompt.

**Don't**
- Don't request permissions in a bundle at app launch/onboarding "just in case."

**Examples**
Before requesting camera access for product photo capture: "CowQ uses your camera to snap product photos instantly. We'll ask your phone's permission next." → native prompt.

**Implementation Notes**
Permission-priming screens are a shared, reusable pattern (`<PermissionPrimer type="camera|location|notifications">`) so the copy and visual treatment stay consistent product-wide.

**Lovable Notes**
Enforce the primer-before-native-prompt sequence explicitly; native permission APIs called directly without a primer screen violate this section.

**Acceptance Criteria**
- [ ] 100% of permission requests are preceded by a contextual primer.
- [ ] Every permission-denied path has a documented, functional fallback.

## 53.6 Trust Indicators

**Rules**
1. A single, consistent **Trust Strip** component (introduced in §51.1) is the only place trust signals cluster — verification badge (§53.1), rating, response time, and years/months active — never scattered as separate elements across a shop page.
2. Reviews are the primary trust signal and are never gated, hidden, or filterable-to-only-positive by the seller — sellers may respond publicly to a review but cannot remove or suppress it (a permanent, non-amendable guardrail given its centrality to marketplace trust).
3. Response time ("replies within ~2 hours") is computed from real message data, rolling 30-day window, never a static seller-entered claim.

**Do**
- Compute every trust metric from real, live data — never allow a seller-entered, unverified trust claim to display as if verified.

**Don't**
- Don't allow sellers to hide or filter negative reviews.

**Examples**
Trust Strip: `✓ Identity Verified · ★4.7 (128 reviews) · Replies in ~2 hrs · Selling since Mar 2025` — one row, `body-sm`, icons at 16px, separated by middle-dots.

**Implementation Notes**
All Trust Strip metrics are server-computed and cached at short TTL, never client-side estimated or seller-editable.

**Lovable Notes**
Build the Trust Strip as one shared component consuming a single `getTrustMetrics(sellerId)` API — do not let individual pages assemble trust signals ad hoc.

**Acceptance Criteria**
- [ ] Zero seller ability to hide, remove, or filter reviews.
- [ ] 100% of Trust Strip metrics are system-computed, not seller-entered.

---

# 54. AI Experience DNA

**Purpose**
v1.0 §30 established the 95/5 philosophy at a high level. This section makes it mechanically precise — the exact behaviors of confidence, memory, loading, streaming, suggestions, credits, and reasoning that a non-technical business owner interacts with daily, and that AI engineers need to implement consistently.

**Principles**
1. **AI's confidence is always legible, never asserted as certainty it doesn't have.**
2. **AI remembers so the owner doesn't have to repeat themselves — memory is a trust-building mechanism, not a surveillance one.**
3. **AI is never a black box mid-action** — the owner can always tell what's happening and, on request, why.

## 54.1 AI Confidence Levels

**Rules**
1. Every AI output that isn't 100% deterministic carries an internal confidence score, mapped to exactly three presentation tiers: **High confidence** → applied silently as a default, editable (no visual confidence indicator needed — this is the 95% invisible layer). **Medium confidence** → applied as a suggestion requiring one-tap confirm (Bell Mark glass card, §v1.0-15/24.11). **Low confidence** → not surfaced as an AI suggestion at all; the field is simply left blank/unset for manual entry, since a low-confidence AI guess creates more cleanup work than it saves (directly enforcing §v1.0 Principle 3, "AI works, people work less" — a wrong guess is negative work).
2. Confidence thresholds per action type are configured centrally (not per-feature ad hoc) and reviewed quarterly against real acceptance/correction rates — if owners are correcting a "high confidence" category more than 10% of the time, its threshold is recalibrated.

**Do**
- Suppress low-confidence AI output entirely rather than showing a low-quality guess.

**Don't**
- Don't display a numeric confidence percentage to the end user ("87% confident") — this is an engineering concept, not owner-facing language; the three-tier behavior is the correct translation into product terms.

**Examples**
AI category inference at 96% confidence: silently applied, shown as an editable chip. AI price suggestion at 65% confidence: shown as a Bell Mark suggestion card requiring confirm. A garbled product name AI can't parse with any confidence: left blank for manual entry, no guess shown.

**Implementation Notes**
Confidence thresholds stored as a versioned config per action type, logged against real-world correction rates in an internal analytics dashboard (§59).

**Lovable Notes**
When integrating a Gemini/AI call, always design for the three-tier output branching explicitly — do not let Lovable wire an AI response directly to a form field without confidence-tier logic in between.

**Acceptance Criteria**
- [ ] Zero raw confidence percentages shown in end-user UI.
- [ ] Quarterly correction-rate review process is documented and running.

## 54.2 AI Memory

**Rules**
1. CowQ's AI maintains a **per-seller Brand Memory** (already referenced in seller context as a queued feature) — tone of voice, product photography style, pricing philosophy, and commonly-corrected AI outputs are remembered and auto-applied to all future generations without re-prompting, per §v1.0-30 Rule 2.
2. Memory is visible and editable by the seller in one place (a "What CowQ knows about your brand" screen) — never an invisible, unaccountable model of the seller the owner can't inspect or correct (extends Principle 7, seller owns everything, to AI memory specifically).
3. Memory updates incrementally from corrections (if a seller repeatedly edits AI-drafted captions to remove exclamation points, CowQ's memory for that seller updates to stop suggesting them) — never requires an explicit "train me" step.

**Do**
- Let the seller view and edit every piece of stored Brand Memory in plain language.

**Don't**
- Don't build an opaque, uninspectable AI personalization model — every memory item must be legible and editable.

**Examples**
"What CowQ knows about your brand" screen: "Your tone: warm, minimal exclamation marks · Your photo style: bright, white backgrounds · Common correction: you prefer 'handcrafted' over 'handmade.'" Each with an edit/remove control.

**Implementation Notes**
Brand Memory stored as a structured, versioned key-value profile per seller, consumed as system-prompt context on every generative AI call for that seller.

**Lovable Notes**
Every AI generation call must inject the seller's Brand Memory profile into context — specify this explicitly in any Lovable prompt building a new AI-generation feature, so memory isn't accidentally scoped per-feature instead of per-seller globally.

**Acceptance Criteria**
- [ ] Brand Memory is visible and editable by every seller.
- [ ] New AI-generation features automatically inherit existing Brand Memory without additional seller setup.

## 54.3 AI Loading

**Rules**
1. AI processing states never use a generic spinner — they use the **Bell Pulse** (§v1.0-18/19/20) paired with a specific, honest, plain-language status line that updates if the process has multiple stages ("Reading your photo…" → "Writing your listing…" → "Almost done…") rather than one static "Loading AI…" for the entire duration.
2. Any AI process expected to exceed 5 seconds shows an estimated time or a cancelable state — the owner is never trapped waiting on AI with no information and no exit.
3. AI loading never blocks the rest of the interface — the owner can navigate away and be notified (via the "AI did this" notification tier, §v1.0-35) when it completes, rather than being forced to watch.

**Do**
- Update the status line as the AI process moves through real stages, not a single unchanging message.

**Don't**
- Don't block navigation while AI processes in the background.

**Examples**
Generating a full product listing from a photo: "Reading your photo…" (1.5s) → "Writing your title and description…" (2s) → "Suggesting a price…" (1s) → done, Bell Mark settles.

**Implementation Notes**
Multi-stage AI status is streamed from the backend as discrete stage events (§54.4 streaming infrastructure), not estimated client-side.

**Lovable Notes**
Specify multi-stage status streaming explicitly in any AI-generation feature prompt — a single opaque "AI is thinking" loading state is a Lovable default to override.

**Acceptance Criteria**
- [ ] Zero AI loading states exceeding 5 seconds without a status update or cancel option.
- [ ] Zero AI processes block navigation.

## 54.4 AI Streaming

**Rules**
1. Text-generative AI output (descriptions, captions, replies) **streams token-by-token** into its destination field, visually, rather than appearing all-at-once after a wait — this makes latency feel like productivity happening, not delay, and lets the owner start reading/editing before generation fully completes.
2. Streamed content is immediately editable mid-stream — the owner can start typing corrections before the AI finishes, and the stream gracefully stops at the point of manual edit rather than overwriting it.
3. Streaming cursor uses a simple blinking bar in `bell-gold-500`, distinguishing "AI is actively writing here" from a normal text-input caret (`ink-900`/`paper-50`) at a glance.

**Do**
- Allow the owner to interrupt and edit a stream at any point without losing what's already generated.

**Don't**
- Don't stream into a read-only preview that requires a separate "accept" step before editing becomes possible — editability must be immediate.

**Examples**
An AI-drafted product description streams word-by-word into the description textarea; the owner starts editing the first sentence while the AI is still writing the third — the stream stops cleanly at the edit point.

**Implementation Notes**
Streaming implemented via server-sent events or a streaming-compatible API response, rendered incrementally client-side; edit-interrupt handled by diffing stream position against cursor position.

**Lovable Notes**
Specify token streaming explicitly for any generative text feature — a non-streaming, wait-then-display implementation is a common simpler default Lovable will reach for and must be corrected.

**Acceptance Criteria**
- [ ] 100% of generative text AI features stream visibly rather than block-then-display.
- [ ] Mid-stream manual edits never get overwritten by continuing generation.

## 54.5 AI Suggestions

**Rules**
1. Every AI suggestion card (§v1.0-24.11) states, in one sentence, what CowQ already did or is proposing — never a question the AI could have answered itself by acting (extends §v1.0-30 Rule 2 into exact copy form: suggestions are statements with an undo/edit path, not questions requiring the owner to decide from scratch).
2. Suggestions are dismissible individually and, if dismissed 3+ times in a row for the same suggestion type, that suggestion type auto-downgrades to fully invisible/silent for that seller (§54.1's confidence-recalibration logic applied per-seller) — CowQ learns not to keep asking about something the owner has shown they don't want surfaced.
3. Suggestions never queue up and stack — only one AI suggestion card visible per pillar screen at a time (extends §v1.0-35 Rule 1's calm mandate); additional suggestions queue silently and surface one at a time as prior ones are resolved.

**Do**
- Phrase every suggestion as "CowQ did/found/suggests X" with a clear accept/dismiss, never an open-ended question.

**Don't**
- Don't stack multiple simultaneous AI suggestion cards on one screen.

**Examples**
"CowQ noticed 3 products haven't been updated in 60 days — refresh their photos with your latest style?" (`primary` Refresh / `ghost` Not now) — one card, one screen, one decision.

**Implementation Notes**
Suggestion dismissal counts tracked per seller, per suggestion-type, driving the auto-downgrade logic in §54.1's threshold system.

**Lovable Notes**
Build a single shared `<AISuggestionCard>` component with built-in one-at-a-time queuing logic — do not let individual features render their own independent suggestion UI.

**Acceptance Criteria**
- [ ] Never more than one AI suggestion card visible simultaneously per screen, verified in QA.
- [ ] Suggestion types auto-downgrade after 3 consecutive dismissals, verified in suggestion analytics.

## 54.6 AI Credits

**Rules**
1. Credit balance is shown persistently but quietly — a small `mono-sm` figure in the account/settings area, never a nagging omnipresent counter competing with the primary dashboard content (calm mandate, §v1.0-5).
2. Every AI action that consumes credits shows its cost *before* the action is taken, inline, not as a surprise after generation — "Generate 4 product photos (4 credits)" stated on the trigger button itself where space allows, or in a one-line confirm if not.
3. Low-credit states are handled the same as any other informational state (§v1.0-34/35): a calm, non-blocking banner appears once balance drops below a seller-relevant threshold, with a clear, single `primary` "Add credits" path — never a blocking paywall interrupting an in-progress task; the current task always completes if credits were sufficient when it started.
4. Credit costs are never hidden behind vague "usage-based" language — every action's exact credit cost is documented and shown consistently, in the same place, every time that action type appears anywhere in the product.

**Do**
- Show exact credit cost on or immediately beside every credit-consuming action trigger.

**Don't**
- Don't interrupt an in-progress AI task because credits ran out mid-process if they were sufficient at the start — complete what was started.

**Examples**
Brand model portrait generation button: "Generate portrait — 2 credits" directly on the `primary` button's subtext, `body-sm`, `ink-600`/`paper-600`.

**Implementation Notes**
Credit costs are a centrally versioned config (per action type), consumed consistently by both the pre-action cost display and the actual deduction logic — extends the known critical bug context (mismatched `spendOrThrow` vs `spend_credits`) by mandating a single, shared, correctly-wired deduction path product-wide going forward.

**Lovable Notes**
Every new AI feature must call the shared `spend_credits` RPC exclusively — explicitly instruct Lovable never to introduce a parallel or ad hoc credit-spending function, directly preventing recurrence of the known credit-deduction bug class.

**Acceptance Criteria**
- [ ] 100% of credit-consuming actions display exact cost before execution.
- [ ] 100% of AI features use the single shared credit-deduction RPC — verified via codebase audit, closing the known `generateBrandModelPortrait` bug class permanently.

## 54.7 AI Reasoning

**Rules**
1. Any AI suggestion involving a judgment call (pricing, categorization edge cases, fraud flags) includes a one-line, plain-language reasoning summary available inline, not hidden behind a separate "why" click-through — extending §52.7 Rule 2 product-wide.
2. Reasoning is written in outcome-first plain language, never exposing model internals, prompt fragments, or technical terms ("similar items nearby sell for ₹400–500," never "based on embedding similarity to comparable listings").
3. For genuinely complex reasoning (e.g., a fraud risk flag combining several factors), CowQ shows the top 2–3 contributing factors as a short plain-language list — never a full technical trace, and never more than 3 factors even if more were considered (keeps it scannable, per §v1.0 Principle 8).

**Do**
- Write every reasoning summary as a plain sentence a business owner would say to a friend, not a system log line.

**Don't**
- Don't expose model names, prompt text, embedding scores, or any ML-internal vocabulary in end-user-facing reasoning text.

**Examples**
Fraud flag reasoning: "New customer account · Order value is unusually high for this shop · Delivery address is far from previous orders" — 3 factors, plain language, no scores shown.

**Implementation Notes**
Reasoning summaries are generated as a structured, constrained output (not freeform model text) to guarantee plain-language, length-capped, jargon-free output every time.

**Lovable Notes**
Constrain AI reasoning-summary generation with an explicit output schema/prompt template — do not let raw model output render directly as reasoning text without this constraint layer.

**Acceptance Criteria**
- [ ] Zero technical/ML-internal vocabulary appears in any user-facing reasoning text, audited via string scan.
- [ ] Every judgment-call AI suggestion includes inline reasoning without requiring a click-through.

## 54.8 Invisible AI Rules (Extending §v1.0-30)

**Rules**
1. **The Invisible AI Ledger:** every feature team maintains a running internal list of every point where AI acts invisibly (auto-categorization, auto-tagging, fraud pre-screening, inventory estimation, etc.) — reviewed quarterly to ensure the *sum* of invisible AI actions is still legible to the owner in aggregate, even though no single action interrupts them (an "AI Activity Log," referenced in §v1.0-35, is the customer-facing surface for this ledger).
2. Invisible AI actions are always reversible from the AI Activity Log, even after the fact, at the individual-action level — "undo this specific auto-tag" remains available indefinitely, not just in a transient toast window (extending §v1.0 Principle 2 to invisible, not just visible, AI actions).
3. No invisible AI action is permitted to touch money movement, refunds, or communication sent externally (to a customer) without at minimum a passive, reviewable log entry — full invisibility is reserved for internal, reversible, non-external-facing actions only (auto-tagging, categorization) — anything customer-facing or financial graduates at minimum to "shown, logged, reversible" even if not requiring active confirmation.

**Do**
- Log every invisible AI action to the AI Activity Log, permanently reversible.

**Don't**
- Don't let any invisible AI action send external customer communication or move money without at least a passive log entry the seller can review and reverse.

**Examples**
AI Activity Log entry: "Aug 3, 10:14 AM — Auto-tagged 'Blue Cotton Kurta' as Festive Wear · Undo" — present indefinitely, not just in a 4-second toast.

**Implementation Notes**
AI Activity Log is an append-only audit table, queryable and filterable by the seller, distinct from the ephemeral toast/notification layer (§v1.0-35/36).

**Lovable Notes**
Every new invisible-AI feature must write to the shared AI Activity Log table as part of its implementation — specify this as a hard requirement in every relevant Lovable prompt.

**Acceptance Criteria**
- [ ] 100% of invisible AI actions produce a permanent, reversible AI Activity Log entry.
- [ ] Zero invisible AI actions touch money movement or external customer communication without a log entry at minimum.

---

# 55. Mobile Experience DNA

**Purpose**
v1.0 §29 set baseline mobile layout rules. Given CowQ's target users (shop owners standing at a counter, freelancers on the move, customers browsing on mid-range Android phones over patchy mobile data) mobile is not a secondary surface — for a large share of users it is the *only* surface. This section treats mobile as a first-class, physically-grounded design discipline.

**Principles**
1. **Design for the phone in one hand, the product in the other.** A shop owner is often physically holding merchandise while using CowQ.
2. **Assume the network is bad and the battery is low**, not the exception but the baseline case for CowQ's actual market.
3. **Native feel beats web-app feel.** Gestures, haptics, and camera integration should feel like a phone-native app, not a website in a wrapper.

## 55.1 Thumb Zones

**Rules**
1. Every primary action on mobile falls within the **natural thumb arc** — the bottom 40% of a standard phone viewport when held one-handed — extending §v1.0-29 Rule 2 with the precise zone definition.
2. Destructive or rarely-used actions are deliberately placed in the harder-to-reach top zone (top app bar overflow menu), while frequent actions live in the bottom thumb zone — placement itself is a soft safeguard against accidental destructive taps.
3. Any screen requiring two-handed operation (e.g., detailed photo editing) is explicitly exempted and marked as such in design specs, rather than silently violating the thumb-zone rule — exceptions are named, not accidental.

**Do**
- Audit every new mobile screen's primary action placement against the thumb-zone map before merge.

**Don't**
- Don't place a frequent, low-stakes action (like "Add to cart") in the top-bar zone.

**Examples**
Product detail mobile screen: photo carousel (upper, view-only), description (scrollable middle), fixed bottom bar with quantity stepper + "Add to cart" — both within the thumb zone.

**Implementation Notes**
Thumb-zone compliance is a literal checklist item in the mobile-specific Design QA pass (extending §v1.0-44).

**Lovable Notes**
Explicitly specify "primary action fixed to bottom thumb zone" in every mobile screen prompt — Lovable's default web-first layouts often place primary CTAs at the top.

**Acceptance Criteria**
- [ ] 100% of mobile primary actions verified within the bottom-40% thumb zone, except documented two-handed exceptions.

## 55.2 One-Handed Use

**Rules**
1. No required interaction spans the full screen height in a single gesture (e.g., a slider or drag interaction from top to bottom) — all gestures are designed for a thumb's natural reach radius from a fixed grip point.
2. Text input fields that would trigger the keyboard are positioned so the field remains visible above the keyboard, never requiring the user to scroll blind while typing.
3. A "reachability" affordance (content shifting down toward the thumb, mirroring iOS Reachability) is supported where the OS provides it natively — CowQ does not fight or override native reachability gestures.

**Do**
- Keep active input fields visible above the software keyboard at all times.

**Don't**
- Don't design any required full-height drag gesture.

**Examples**
A checkout address field: as the keyboard opens, the form scrolls so the active field sits just above the keyboard line, never obscured.

**Implementation Notes**
Use `scrollIntoView`/keyboard-avoiding-view patterns consistently across all form contexts, not on an ad hoc per-form basis.

**Lovable Notes**
Specify keyboard-avoiding behavior explicitly for every form screen prompt — this is a common gap in web-first scaffolding.

**Acceptance Criteria**
- [ ] Zero form fields obscured by the keyboard in mobile QA pass.

## 55.3 Camera-First UX

**Rules**
1. Product photo capture defaults to opening the **native camera directly**, not a file picker, as the first-offered option — file picker/gallery is the secondary, clearly-labeled alternative ("or choose from gallery") — reflecting that most sellers photograph products fresh rather than pulling from an existing library.
2. The in-app camera view includes a lightweight framing guide (a subtle corner-bracket overlay, Bell Gold at low opacity) suggesting good product-photo composition, without forcing a hard crop — guidance, not restriction.
3. Immediately after capture, the photo feeds directly into the AI processing pipeline (§54.3) with zero intermediate "confirm this photo" screen unless the shot is detected as clearly unusable (blurry, too dark) — extending §v1.0-30's "never ask what can be inferred" to "never add a confirmation step AI can handle instead."

**Do**
- Default to native camera launch over gallery picker for product photo capture.

**Don't**
- Don't insert an unnecessary "Use this photo?" confirmation screen for a clearly usable capture.

**Examples**
Tapping "Add product photo": native camera opens directly with framing guide overlay; on capture, if sharp/well-lit, it proceeds straight into AI listing generation (§54.3's streaming status begins immediately).

**Implementation Notes**
Blur/exposure detection runs client-side (lightweight, fast) immediately post-capture to decide whether to insert the rare "retake?" prompt.

**Lovable Notes**
Specify direct native-camera-first launch explicitly; a generic `<input type="file">` fallback-only implementation must be treated as a gap, not the primary path.

**Acceptance Criteria**
- [ ] Camera launches directly (not gallery-first) for all photo-capture entry points, verified per-platform.

## 55.4 Offline Mode

**Rules**
1. Core read actions (viewing existing orders, catalog, past-generated content) remain available offline via local caching — a seller checking their last-known order status in a low-signal area still sees data, clearly timestamped as "Last updated 6 minutes ago" rather than a blank error.
2. Write actions attempted offline (adding a product, editing a price) queue locally and sync automatically on reconnect, with a visible, honest "Will sync when you're back online" state — never silently failing or silently discarding input (a direct extension of §v1.0 Principle 2, never destroy user work, into the offline context specifically).
3. The app-wide connectivity state is shown via a single, small, non-alarming persistent indicator (not a disruptive banner) — calm handling of a common, expected condition rather than treating it as an error state.

**Do**
- Queue and visibly track offline writes for automatic sync, never discard them.

**Don't**
- Don't show a blocking error screen for lack of connectivity when cached read data is available.

**Examples**
Editing a product price with no signal: the edit saves locally, the price field shows a small "Pending sync" mono label beside it, and syncs silently once connectivity returns, replaced by a brief Clover confirmation.

**Implementation Notes**
Implemented via a local-first data layer (e.g., IndexedDB-backed cache + background sync queue) rather than a purely network-dependent state model.

**Lovable Notes**
Offline-first architecture must be specified explicitly at the outset of any feature build — retrofitting offline support onto a network-only implementation is costly; instruct Lovable to build the sync-queue pattern from the start for core write actions.

**Acceptance Criteria**
- [ ] Zero silent data loss on offline write attempts, verified via QA airplane-mode testing.
- [ ] Cached read data available offline for orders, catalog, and recent AI-generated content.

## 55.5 Slow Network Behavior

**Rules**
1. Every network request has a defined timeout and a defined degraded-experience fallback — no request is allowed to hang indefinitely with only a spinner (extends §v1.0-31 with explicit timeout handling).
2. Images are served at network-aware resolutions (lower-resolution variants on detected slow connections via the Network Information API where available, or adaptive loading based on measured request timing as a fallback) — extending §v1.0-43 Rule 3's responsive image rule with explicit slow-network adaptation.
3. Text content and core interactivity (navigation, forms) load and become usable *before* images finish loading — CowQ never blocks core functionality on image payload, critical given the target market's real-world network conditions (§62).

**Do**
- Serve lower-resolution image variants automatically on detected slow connections.

**Don't**
- Don't let image loading block text content or interactivity from becoming usable.

**Examples**
On a detected slow 3G-equivalent connection, product grid images load as compressed, smaller variants first, with a one-tap "Load full quality" option per image if the customer wants to inspect closely.

**Implementation Notes**
Use responsive `srcset` combined with connection-aware serving logic at the CDN/image-service layer.

**Lovable Notes**
Specify network-aware image serving explicitly — default `<img>` tags without adaptive sourcing are insufficient for CowQ's target network conditions.

**Acceptance Criteria**
- [ ] Core text/interactivity usable before image payload fully loads, verified via network-throttled testing.
- [ ] Zero requests without a defined timeout and fallback behavior.

## 55.6 Native Gestures

**Rules**
1. CowQ respects and never overrides platform-native gestures: iOS edge-swipe-back, Android system back gesture, pull-to-refresh on scrollable lists — these behave exactly as the OS user expects, everywhere in the product, without exception.
2. Custom gestures (beyond OS-native ones) are used sparingly and only where they map to a genuinely intuitive physical metaphor — e.g., swipe-to-archive on a notification list (left swipe reveals archive action, consistent direction/meaning everywhere it appears) — never a novel gesture invented without a clear precedent.
3. Every custom gesture has a visible, discoverable non-gesture alternative (a button) — gestures are an acceleration layer for repeat users, never the only path to an action.

**Do**
- Preserve native back-navigation and pull-to-refresh behavior on every applicable screen.

**Don't**
- Don't introduce a custom gesture without an equally accessible button-based alternative.

**Examples**
Order list: swipe-left reveals an "Archive" action (consistent with common list-management gesture conventions), but every order row also has a `ghost` overflow menu with "Archive" available by tap, for discoverability and accessibility.

**Implementation Notes**
Use platform-native gesture APIs/libraries rather than fully custom touch-event handling, to inherit correct velocity/easing feel automatically.

**Lovable Notes**
Explicitly verify that Lovable-generated mobile web views don't fight native browser back-gesture behavior (a common web-app pitfall) — test edge-swipe-back on every new screen.

**Acceptance Criteria**
- [ ] Native back gesture and pull-to-refresh function correctly on 100% of applicable screens.
- [ ] Every custom gesture has a documented, accessible button alternative.

## 55.7 Bottom Sheets

**Rules**
1. Bottom sheets (not modals, §v1.0-24.5) are the default mobile pattern for: filters (§51.6), quick actions (order actions, product quick-edit), and any secondary content that doesn't warrant a full screen navigation — chosen over centered dialogs on mobile because they're reachable within the thumb zone (§55.1) and feel native to the platform.
2. Sheets support drag-to-dismiss (downward swipe) in addition to a tap-outside-to-dismiss and an explicit close affordance — three consistent dismiss paths, always.
3. Sheet height is content-driven with three snap points where relevant (peek / half / full) for longer content (e.g., a full filter panel), using the same `radius-lg` top-corner treatment and `shadow-lg` as modals (§v1.0-17/16) for token consistency, adapted to the bottom-anchored form factor.

**Do**
- Use bottom sheets, not centered modals, for mobile-native secondary content and actions.

**Don't**
- Don't use a centered desktop-style modal dialog for mobile filter/quick-action patterns — that's the wrong native metaphor for touch.

**Examples**
Tapping "Filters" on mobile catalog browsing opens a bottom sheet at the "half" snap point, draggable to "full" for more filter categories, dismissible by drag-down, tap-outside, or an explicit "Apply" button.

**Implementation Notes**
Bottom sheet component (`<BottomSheet snapPoints>`) is a single shared primitive across filters, quick actions, and any future secondary-content need.

**Lovable Notes**
Specify the shared `<BottomSheet>` component explicitly for any mobile secondary-content pattern — do not let Lovable default to a centered modal on mobile viewports.

**Acceptance Criteria**
- [ ] All mobile filter/quick-action patterns use the shared bottom sheet component, not centered modals.

## 55.8 Haptics

**Rules**
1. Haptic feedback is used sparingly, for exactly three categories of moment: **confirmation of a significant action** (light impact on order placed, product published), **destructive-action warning** (medium impact paired with the confirmation dialog opening, §v1.0-24.5), and **AI completion** (a distinct, soft, custom-feeling pattern paired with the Bell Pulse settling, §v1.0-18 Rule 3) — never for routine taps, toggles, or navigation, which stay silent to keep haptics meaningful.
2. Haptics always respect system-level accessibility/haptic-disable settings without any in-app override.
3. No haptic pattern is used for marketing/engagement purposes (no "delightful" haptic on every scroll or hover) — extending the calm mandate (§v1.0-5) into the tactile channel.

**Do**
- Reserve haptics for the three defined categories only.

**Don't**
- Don't add haptic feedback to routine navigation, scrolling, or toggle interactions.

**Examples**
Publishing a storefront for the first time: a single light haptic impact accompanies the success state (§v1.0-33), synchronized with the visual confirmation, not before or after it.

**Implementation Notes**
Haptic triggers are centralized through a single `triggerHaptic(type)` utility with exactly three defined types, preventing ad hoc haptic calls scattered through feature code.

**Lovable Notes**
Specify the three-category haptic restriction explicitly in native app prompts — unconstrained haptic usage is a common over-application pattern to guard against.

**Acceptance Criteria**
- [ ] Haptic usage audited to exactly three defined trigger categories, product-wide.

---

# 56. Premium Motion Library

**Purpose**
v1.0 §18–20 set motion philosophy and base tokens. This section catalogs the exact, named motion **sequences** — reusable, signature choreography for CowQ's most common and most important moments — so motion never gets reinvented ad hoc per feature.

**Principles**
1. Every named sequence in this library is used verbatim, everywhere its trigger condition occurs — a sequence is not a suggestion, it's a component, exactly like a Button.
2. Sequences compose from the base tokens in §v1.0-19/20 only — no sequence introduces a new duration or easing curve outside the existing token set.

**Rules — The Named Sequences**

| Sequence | Composition | Trigger |
|---|---|---|
| `settle-in` | `duration-base` + `ease-settle`, opacity 0→1, translateY 8px→0 | Any card/element entering the viewport on scroll or load |
| `bell-pulse` | `duration-ambient` loop + `ease-ambient`, radial scale 1→1.08→1 at 30% opacity ring | AI actively processing (§54.3) |
| `bell-settle` | `duration-base` + `ease-settle`, single scale 1→1.15→1, opacity ring fade | AI action completes |
| `card-lift` | `duration-base` + `ease-settle`, translateY 0→-2px, `shadow-sm`→`shadow-md` | Desktop hover on interactive cards (§v1.0-27) |
| `sheet-rise` | `duration-moderate` + `ease-enter`, translateY 100%→0 | Bottom sheet opening (§55.7) |
| `sheet-fall` | `duration-fast` + `ease-exit`, translateY 0→100% | Bottom sheet closing |
| `stream-reveal` | Per-token character reveal, no easing curve (near-instant per token) with a `bell-gold-500` blinking cursor | AI text streaming (§54.4) |
| `status-flash` | `duration-fast` + `ease-settle`, background tint pulse (Clover/Rust at 15% opacity → 0) | A data value updates live (order status change, stock count) |
| `confetti-quiet` | A restrained, single-burst micro-particle animation using only Bell Gold + Clover, `duration-slow`, non-repeating | Genuine milestones only (§v1.0-33), e.g., first sale |

**Do**
- Reference sequences by name in design specs and code (`motion.bellPulse`, not a hand-described animation).

**Don't**
- Don't create a new, unnamed one-off animation for a new feature — propose an addition to this table instead (§47-style amendment process).

**Examples**
A new "Order confirmed" screen uses `settle-in` for the confirmation card, `status-flash` on the order status badge as it updates from Placed to Confirmed in real time, and (only if this is the seller's very first order ever) `confetti-quiet` once.

**Implementation Notes**
All sequences implemented as named exports from a single `motion-sequences.ts`, built on the base tokens from `motion.ts` (§v1.0-19/20) — never redefining duration/easing values locally.

**Lovable Notes**
Reference this table by sequence name directly in Lovable prompts ("use the `settle-in` sequence") rather than describing the desired animation in prose each time — this keeps generated motion consistent with the existing library rather than reinvented per prompt.

**Acceptance Criteria**
- [ ] Zero one-off, unnamed animations in the codebase — 100% of motion traces to a named sequence in this table.

---

# 57. CowQ Signature Moments

**Purpose**
To name and protect the small number of moments where CowQ is allowed — deliberately, sparingly — to feel a little more special than its usual calm baseline. Per the frontend-design principle of spending boldness in one place, these are that place, enumerated explicitly so they never multiply into general-purpose delight-inflation.

**Principles**
1. A Signature Moment occurs rarely enough per seller/customer lifecycle that it retains its impact — if it happened weekly, it wouldn't be a moment, it would be UI.
2. Every Signature Moment still obeys the full token system (§v1.0-12/13/17 etc.) — "special" means more intentional choreography, never new colors or off-brand styling.

**Rules — The Enumerated Moments**
1. **First Storefront Publish.** The single most important owner moment. Full-screen `settle-in` sequence, Fraunces `display-lg` headline ("You're live."), a static (non-mascot) illustration (§v1.0-22), and a direct "View your live storefront" primary action.
2. **First Sale Ever.** `confetti-quiet` sequence (§56), a one-time banner, and — uniquely permitted here only — a short, warm first-person system line breaking the usual voiceless pattern (§v1.0-38 Rule 4): "Your first sale. CowQ handled the checkout, the confirmation, and the receipt — so you could just enjoy this one."
3. **100th Order Milestone.** A quieter version of Moment 2 — no confetti (reserving that specifically for the first sale's uniqueness), a mono `display-md` "100" figure and one supportive line in the Insights pillar.
4. **AI Completes a Meaningful Batch Task Unattended.** (e.g., AI drafts responses to 20 customer inquiries received overnight) — surfaced once, next morning, as a single satisfying summary card, not 20 individual notifications (directly protects the calm/notification discipline of §v1.0-35 while still marking the moment as significant).
5. **Successful Recovery from a Failure.** (e.g., a payment that failed and was successfully retried, an order that was flagged for fraud and cleared) — a small, deliberately reassuring `bell-settle` + one-line confirmation, treating recovery itself as worth marking, not just treating it as returning to neutral silently.

**Do**
- Keep this list closed and deliberate — new entries require a documented proposal (§v1.0-47 amendment process), not ad hoc addition by individual feature teams.

**Don't**
- Don't apply Signature Moment treatment (confetti, first-person voice breaks, full-screen sequences) to any event not on this list.

**Examples**
A seller's 50th order does *not* get special treatment (not on the list) — it renders as a completely standard order notification, preserving the 100th's significance.

**Implementation Notes**
Each Signature Moment is implemented as a distinct, named, testable flow (`<FirstPublishMoment>`, `<FirstSaleMoment>`, etc.) — not generic celebratory logic reused loosely across trigger conditions.

**Lovable Notes**
Explicitly name the specific Signature Moment when prompting Lovable to build one ("build the First Sale Ever moment exactly per §57.2") — do not let a generic "celebration" prompt produce ad hoc, off-spec confetti logic elsewhere.

**Acceptance Criteria**
- [ ] Exactly five Signature Moments exist in the shipped product, matching this table precisely.
- [ ] Zero confetti/full-screen celebration treatments exist outside this enumerated list.

---

# 58. Performance Design Standards

**Purpose**
To extend v1.0 §43's performance rules into precise, testable, design-owned budgets — performance is treated here as a design deliverable with acceptance criteria, not solely an engineering concern.

**Principles**
1. **Every design decision has a performance cost, and every designer is responsible for knowing it before shipping** — an image-heavy hero, a large icon set, or an animated illustration is a budget line item, not a free aesthetic choice.
2. CowQ's real target network/device conditions (mid-range Android, variable mobile data, §62) are the *default* test condition, not an edge case checked last.

**Rules**
1. **Design-level performance budgets:** hero imagery ≤150KB (compressed, served responsively), any single screen's total first-load JS/CSS payload contribution from new components ≤50KB gzipped, custom fonts ≤2 weights per family loaded per screen.
2. **Core Web Vitals targets, product-wide:** LCP < 2.0s, INP < 200ms, CLS < 0.05 — measured on a throttled "Slow 4G, mid-range Android CPU" profile as the primary benchmark, not a high-end device/fast-wifi baseline.
3. Every new component proposal includes a stated performance impact estimate as part of design review (extending §v1.0-42's Premium Experience Checklist with a performance line item).
4. AI-generated images/content are optimized (compressed, appropriately sized) at generation time, server-side, before ever reaching the client — never shipped at raw generation resolution.

**Do**
- Test every new screen on a throttled, mid-range-device profile before sign-off, not just on a development machine.

**Don't**
- Don't approve a design with unbounded/unbudgeted image or animation weight "to be optimized later" — the budget is part of the design spec from the start.

**Examples**
A proposed hero illustration at 400KB is rejected at design review and re-exported as an optimized SVG or compressed WebP under the 150KB budget before approval, not after a later engineering complaint.

**Implementation Notes**
Performance budgets enforced via CI (bundle-size checks, Lighthouse CI on throttled profiles) blocking merge on regression beyond threshold.

**Lovable Notes**
Explicitly instruct Lovable to serve optimized image formats (WebP/AVIF with fallback) and to avoid importing full icon/animation libraries when only a handful of icons are used — a common source of unbudgeted payload in AI-scaffolded code.

**Acceptance Criteria**
- [ ] Core Web Vitals targets met on throttled mid-range-device profile, verified per release.
- [ ] Zero merged components exceeding their stated performance budget without a documented, reviewed exception.

---

# 59. Design Metrics & KPIs

**Purpose**
To define how CowQ measures whether the design system is actually working — closing the loop between design principles (§v1.0-4) and measurable outcomes, rather than treating "good design" as purely subjective.

**Principles**
1. Every Immutable Principle (§v1.0-4) and every major section of this Addendum has at least one corresponding measurable metric.
2. Metrics are reviewed on a fixed cadence (monthly for product-health metrics, quarterly for deeper design-system health metrics) and feed back into amendments (§v1.0-47).

**Rules — The Core Metric Set**

| Metric | Measures | Target | Section Reference |
|---|---|---|---|
| Time-to-First-Value (TTFV) | Mission alignment | < 10 min, < 8 inputs | §v1.0-3 |
| AI Suggestion Acceptance Rate | AI usefulness/calibration | > 70% accept on Medium-confidence suggestions | §54.1, §54.5 |
| AI Correction Rate (High confidence) | Confidence threshold accuracy | < 10% correction rate | §54.1 |
| Checkout Completion Rate | Commerce trust & friction | Tracked per release, regression-blocking if it drops | §52.2 |
| Time-to-Interactive (Core Dashboard) | Performance | < 2.0s on throttled 4G | §v1.0-43, §58 |
| Push Notification Opt-out Rate | Notification discipline | Tracked; a rising rate signals over-notification (§v1.0-35) | §v1.0-35 |
| Support Contacts per 100 Orders (Order Status Confusion) | IA/status clarity | Downward trend target | §52.4 |
| Verification Badge Tap-through Rate | Trust indicator legibility | Tracked as an engagement/comprehension proxy | §53.1, §53.6 |
| Design QA Checklist Pass Rate | Systemic compliance | 100% at release gate | §v1.0-44, §v1.0-49 |
| Accessibility Automated Check Pass Rate | Accessibility | 100% AA, CI-enforced | §v1.0-25 |

**Do**
- Treat a metric regression as equally release-blocking as a visual QA failure.

**Don't**
- Don't ship a new AI feature without an accompanying acceptance/correction-rate tracking mechanism — every AI feature needs its §54.1-style feedback loop instrumented from day one.

**Examples**
If AI Suggestion Acceptance Rate for a new suggestion type launches at 40% (below the 70% target), the confidence threshold for that suggestion type is recalibrated (§54.1 Rule 2) rather than the suggestion being left underperforming indefinitely.

**Implementation Notes**
Metrics dashboard is an internal-only tool, separate from the seller-facing Insights pillar (§v1.0-6), reviewed by design + product + AI engineering jointly.

**Lovable Notes**
Every new AI-generation or suggestion feature built in Lovable must include instrumentation (event logging for shown/accepted/dismissed/corrected) as part of the initial build, not retrofitted later.

**Acceptance Criteria**
- [ ] Every metric in this table has a live, queryable dashboard.
- [ ] No AI feature ships without acceptance/correction tracking instrumented.

---

# 60. Expanded Component Standards

**Purpose**
To extend v1.0 §24's component library with the components this Addendum's new surfaces require, which v1.0 didn't yet define.

**Principles**
Every new component here follows the exact token, elevation, radius, and motion rules already established (§v1.0-9–20) — this section adds new component *types*, never new token values.

**Rules — New Components**

**60.1 Trust Strip** — see §53.6 for full behavioral spec. Visual: single-row, `body-sm`, icons 16px, `ink-600`/`paper-600` text, middle-dot separators, no card/border container of its own (sits directly on the shop hero/page background).

**60.2 Bottom Sheet** — see §55.7. Visual: `radius-lg` top corners only, `shadow-lg`, drag handle (4px × 32px, `radius-full`, `ink-400`/`paper-600`, centered, 8px from top edge).

**60.3 Product Card / Service Card** — see §51.3/§51.4 for full behavioral spec.

**60.4 AI Suggestion Card** — see §54.5, built on the existing `<AISurface>` glass primitive (§v1.0-15).

**60.5 Order Timeline** — vertical, `mono-sm` timestamps, filled/hollow Clover dots (§52.4), connecting line at `night-pasture-700`/`milk-200`.

**60.6 Filter Chip** — `radius-full` pill (the sanctioned rectangular exception per §v1.0-17 Rule 1), `body-sm`, removable via inline ✕, `bell-gold-500` border when active/applied.

**60.7 Verification Badge** — see §53.1. Visual: 16px icon + label, `ink-900`/`paper-50` neutral tone (never Bell Gold), tappable.

**60.8 Credit Cost Label** — `body-sm`, `ink-600`/`paper-600`, always paired directly with its triggering action per §54.6.

**60.9 Camera Capture View** — full-screen native camera wrapper with corner-bracket framing guide (`bell-gold-500` at 24% opacity, 2px stroke, matching icon stroke weight per §v1.0-21).

**60.10 Streaming Text Field** — standard `<Input>`/`<Textarea>` (§v1.0-24.3) extended with the `stream-reveal` sequence (§56) and Bell Gold blinking cursor during active generation.

**Do**
- Build every new component here as a shared primitive from first implementation — never a one-off inline pattern that gets "componentized later."

**Don't**
- Don't introduce a visual treatment for any of these components that deviates from the token system to achieve a "special" look — novelty here comes from behavior (§54, §55), not new visual tokens.

**Examples**
See cross-referenced sections for full behavioral examples of each component.

**Implementation Notes**
All ten components ship in the shared `@cowq/ui` component package alongside the v1.0 component set, versioned together.

**Lovable Notes**
Reference these components by name in every relevant Lovable prompt (e.g., "use the shared `<TrustStrip>` component per §60.1") rather than describing their visual spec fresh each time.

**Acceptance Criteria**
- [ ] All ten components exist as shared, reusable primitives in the component package before any feature using them ships.

---

# 61. Native iOS & Android Guidelines

**Purpose**
To govern CowQ's behavior on native mobile shells (or native-equivalent wrappers), where platform conventions must be respected even as CowQ's own visual identity stays constant.

**Principles**
1. **CowQ's brand (color, type, tokens) never changes between iOS and Android** — visual identity is platform-agnostic.
2. **CowQ's interaction conventions do adapt** where a platform has a strong, well-known native pattern that users already expect — fighting platform convention creates friction v1.0 Principle 4 (speed is a feature) explicitly warns against.

**Rules**
1. Navigation back behavior: iOS uses edge-swipe-back + optional top-left back chevron; Android uses the system back gesture/button exclusively, with no redundant in-app back chevron cluttering the top bar (respecting each platform's real convention, per §55.6).
2. System UI elements (status bar style, safe areas, keyboard behavior) always respect native OS conventions — light/dark status bar content adapts automatically to CowQ's current theme (§v1.0 dark/light mode) rather than being hardcoded.
3. Platform-native share sheets, native date/time pickers, and native file pickers are used instead of custom-built equivalents wherever the OS provides one — reduces both engineering surface and cognitive friction (users already know their OS's native picker).
4. App icon and splash screen follow platform-specific technical requirements (adaptive icon layers for Android, various size exports for iOS) while both resolve to the identical CowQ mark and Night Pasture/Bell Gold treatment (§v1.0-12).
5. Push notification permission priming (§53.5) accounts for each OS's distinct system dialog behavior and copy conventions.

**Do**
- Use native pickers, share sheets, and back conventions per platform rather than custom-building cross-platform equivalents.

**Don't**
- Don't add a redundant custom back button on Android screens where the system back gesture already exists.
- Don't hardcode status bar style — it must respond to active theme.

**Examples**
Sharing a product listing: iOS triggers the native iOS share sheet (Messages, WhatsApp, etc. as the OS presents them); Android triggers the native Android share sheet — CowQ builds neither from scratch.

**Implementation Notes**
If CowQ ships as a native-wrapped web app (e.g., Capacitor-class technology) rather than fully native, platform bridge plugins are used specifically to access native pickers/share sheets/back-gesture handling rather than reimplementing them in the web layer.

**Lovable Notes**
Lovable's default output is web-first; explicitly flag every native-platform-convention requirement in this section when scaffolding any mobile-wrapped build, since these are easy to silently omit in a web-generated codebase.

**Acceptance Criteria**
- [ ] Native share sheets, pickers, and back conventions verified functioning correctly per platform in QA.
- [ ] Status bar style verified to adapt correctly to active theme on both platforms.

---

# 62. India-first & Multi-language UX

**Purpose**
CowQ's entire target market is Indian small businesses. This is not a localization afterthought — it is a foundational design constraint that shapes network assumptions, payment defaults, address entry, language, and trust conventions throughout this document. This section consolidates and extends those India-specific rules into one authoritative reference.

**Principles**
1. **Design for real Indian network and device conditions as the default case**, not fast-wifi/high-end-device as default with "emerging market" as a secondary consideration (directly underpins §55.4/55.5/58).
2. **Regional language is a first-class output, not a translated afterthought** — copy, AI-generated content, and UI must support genuine regional-language fluency, not machine-translated English UI strings bolted onto a still-English mental model.
3. **Indian commerce and trust conventions are the baseline**, not US/Western SaaS conventions — UPI-first payments (§52.3), PIN-code-first address entry (§52.2), and family/community-based trust signals where relevant, inform default design choices throughout.

**Rules**
1. **Language support tiers:** Hindi, Tamil, Telugu, and other major regional languages (per the seller's queued roadmap) are supported both for the *interface* (all UI strings professionally localized, not machine-translated, sentence-case conventions per §v1.0-39 adapted per script) and for *AI-generated content* (product descriptions, customer replies genuinely generated in the target language, not generated in English and translated).
2. **Script rendering:** typography (§v1.0-13) extends with appropriate regional-script-compatible font fallbacks paired to Inter/Fraunces (e.g., Noto Sans variants for Devanagari, Tamil, Telugu scripts) maintaining equivalent weight/size relationships to the Latin-script scale — never a jarring visual mismatch between English and regional-script text on the same screen.
3. **Numerals and currency:** currency always renders as ₹ with Indian numbering convention (lakhs/crores grouping — "₹1,00,000" not "₹100,000") in mono figures throughout commerce surfaces (§52), regardless of interface language.
4. **Address entry:** PIN-code-first lookup (§52.2 Rule 4) auto-populates city/state, reducing manual entry — critical given variable Indian address formatting conventions across regions.
5. **Network/device baseline:** design and performance targets (§58) are set against real mid-range Android + variable mobile data conditions as the primary target, not an edge case.
6. **Trust conventions:** verification and trust signals (§53) are calibrated to what actually builds confidence in Indian small-commerce contexts — UPI recognition, local language availability, and genuine (not fabricated) review/rating signals carry more real trust weight than Western SaaS trust badges, and design should prioritize these accordingly.

**Do**
- Generate AI content natively in the target regional language, never via literal translation of English-generated output.
- Use lakhs/crores grouping for all Indian Rupee figures.

**Don't**
- Don't ship machine-translated UI strings as a substitute for proper localization.
- Don't default design/performance testing to high-end devices/fast networks as the primary benchmark.

**Examples**
A Tamil-language storefront shows product prices as "₹1,00,000" (lakhs grouping) in Tamil-script product names rendered in a Tamil-compatible font paired to match Inter's weight, with an AI-generated Tamil product description genuinely composed in Tamil, not translated from an English draft.

**Implementation Notes**
Localization managed through a proper i18n framework with per-locale content review (human-reviewed, not solely machine-translated) before any new language ships; AI content generation prompts are localized per-language, not run in English with post-hoc translation.

**Lovable Notes**
Specify genuine per-language AI generation prompts and locale-aware number/currency formatting explicitly — default i18n scaffolding often only translates static UI strings and misses number formatting and native-language AI generation, both of which must be built deliberately.

**Acceptance Criteria**
- [ ] Zero machine-translated-only UI strings in any shipped language.
- [ ] AI-generated content verified as natively composed (not translated) per supported language.
- [ ] All currency figures verified to use correct Indian numbering convention.

---

# 63. Future-proof Design Rules

**Purpose**
To extend v1.0 §47's amendment framework with specific guardrails for the new surfaces this Addendum introduces, ensuring the marketplace, commerce, trust, AI, and mobile systems scale into new verticals, geographies, and AI capabilities without fracturing.

**Principles**
1. Every new capability (a new payment method, a new AI model, a new device form factor) is evaluated against this document's existing rules before any new rule is written — reuse before invention, extending §v1.0-47 Rule 1's vertical-expansion logic to feature-expansion generally.
2. AI capability will grow faster than this document can be rewritten — so its rules are written at the level of *behavior and philosophy* (confidence tiers, reasoning transparency, invisible-by-default) rather than tied to any specific current AI model or provider, ensuring longevity as the underlying Gemini/Kling/future models change.

**Rules**
1. **New payment methods** (beyond UPI/cards/netbanking) inherit §52.3's rules wholesale — recognizable branding, honest processing states, no dark patterns — with no new payment-specific exception permitted without amendment.
2. **New AI capabilities** (future model upgrades, new generation types like video/voice) inherit the full §54 framework by default: confidence-tiered surfacing, memory-integrated, streaming where applicable, reasoning-transparent, credit-cost-labeled, activity-logged. A new AI feature that cannot satisfy these is not ready to ship invisibly and must default to the Medium-confidence (confirm-required) tier until it can.
3. **New device form factors** (tablets-as-primary-POS, wearables, voice-first interfaces) require a proposed extension to §26–29/55/61 following the same amendment process (§v1.0-47) — never an ungoverned one-off build.
4. **New markets/geographies** beyond India inherit this entire Addendum by default; §62's India-specific rules become the *template* for a market-adaptation process (network/device baseline assessment, payment convention research, language support tiering) rather than being hardcoded assumptions that silently fail elsewhere.
5. **Permanent guardrails established in this Addendum** (non-amendable without full brand re-founding, joining the list in §v1.0-47 Rule 2): no fabricated trust/urgency signals (§51.3, §53.6), no paid verification tiers (§53.1), no hiding/removing negative reviews (§53.6), no invisible AI action touching money or external communication without a log entry (§54.8).

**Do**
- Treat every new AI model integration as inheriting the full behavioral framework (§54) by default, evaluated for compliance before launch, not after.

**Don't**
- Don't let a new market launch skip the market-adaptation assessment process modeled on §62.
- Don't add a permanent guardrail exception for a single high-visibility feature or partnership.

**Examples**
If CowQ integrates a future video-generation AI capability beyond the currently-flagged Kling pipeline, it inherits: confidence-tiered surfacing (is a generated video shown as ready or as a suggestion needing review?), credit cost labeling before generation, streaming-appropriate loading states (§54.3/54.4 adapted for video's longer generation time, with honest time estimates), and full AI Activity Log entries.

**Implementation Notes**
This section's rules are procedural/governance rules, not visual specifications — they're enforced through the design review and amendment process (§v1.0-47), not through code linting.

**Lovable Notes**
When prompting Lovable for any genuinely new capability type not explicitly covered elsewhere in v1.0 or this Addendum, explicitly instruct it to default to the most conservative, most confirmation-heavy behavior available in the existing framework (Medium-confidence AI tier, explicit permission patterns per §53.5) rather than inventing new, unreviewed UX patterns.

**Acceptance Criteria**
- [ ] Every new AI capability launch includes a documented compliance check against §54's full framework before shipping.
- [ ] Every new market launch includes a documented market-adaptation assessment modeled on §62.

---
# 64. Version History

**Purpose**
To track how this document — and its predecessor documents — have evolved. This section merges the version histories of the original CowQ Design DNA v1.0 (formerly its own §50) and the v1.1 Addendum (formerly its own §64) into one combined record, per the Addendum's own §64 Rule 2, which required this merge to happen as an explicit, reviewed step rather than an informal copy-paste.

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-07-28 | Initial complete Design DNA — Sections 1–49 established: Night Pasture/Milk/Bell Gold/Clover palette, Fraunces/Inter/JetBrains Mono type system, five-pillar IA, 95/5 Invisible AI philosophy, full component library, accessibility, performance, and Lovable implementation rules. | CowQ Design Office |
| 1.1 (Addendum) | 2026-07-28 | Addendum published as a separate document — added Marketplace, Commerce, Trust, AI Experience, Mobile Experience, Premium Motion Library, Signature Moments, Performance Standards, Design Metrics, Expanded Components, Native Platform Guidelines, India-first/Multi-language UX, and Future-proof Rules (Sections 51–63). Established 4 new permanent guardrails (§63 Rule 5). | CowQ Design Office |
| 1.1 (Merged) | 2026-07-28 | Merged v1.0 and the v1.1 Addendum into this single canonical document. No rules changed in substance; Section 50 (Version History) was relocated from its original position to become this section, Section 64, so that Sections 51–63 could retain their existing numbers without renumbering. All `§v1.0-XX` citations throughout Part II now resolve to Part I of this same file. | CowQ Design Office |

**Rules**
1. Every future change to this document requires a new row: version bump (semantic: major = guardrail change, minor = new section/component, patch = clarification/typo), date, one-line change description, author.
2. Permanent guardrails (Section 47 Rule 2, and Section 63 Rule 5) can never be changed under a minor or patch version — only a major version bump, requiring founder sign-off.
3. This document is now the single source of truth. Any future addendum, if created, must itself be merged following this same disclosed process — no permanent parallel documents.

**Do**
- Bump version and log every change, however small.

**Don't**
- Don't silently edit this document without a version history entry.
- Don't create a new standalone addendum document without a documented plan for merging it back in.

**Acceptance Criteria**
- [ ] Every merged change to this file includes a corresponding Version History row.
- [ ] Exactly one canonical CowQ Design DNA document exists in the repository at any time.

---

*End of CowQ Design DNA v1.1 (Merged Edition). This document is the law of the product. When in doubt, open it. When it's silent, propose an amendment — never guess.*
