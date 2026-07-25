# Profile & Settings

A new `/profile` area for CowQ, built to the premium dark spec: glass cards, soft gradients, 16–20px corners, large spacing, smooth motion. It reuses the palette and card utilities already in `src/styles.css` (Void Black, Cobalt, Magenta, Amber, Titanium Fog) rather than introducing a second design system.

Language stays in CowQ's current product terms — photos, brand kit, model, credits, shops — with the structure and polish from the brief.

## Shape

```text
┌──────────┬───────────────────────────────┬──────────────┐
│ App      │ Header: Profile · search ·    │ Insights     │
│ sidebar  │ notifications · help · avatar │ widgets      │
│ (exists) ├───────────────────────────────┤              │
│          │ Profile header card           │ Usage        │
│          │ Completion ring               │ Photos made  │
│          │ ─ tab bar ─                   │ Credits      │
│          │ [active tab content]          │ Time saved   │
└──────────┴───────────────────────────────┴──────────────┘
```

Desktop three-column; tablet drops the insights panel to the bottom; mobile stacks everything and the tab bar becomes a horizontal scroller.

Always visible above the tabs: profile header card (avatar with online dot, name, role, business, location, contact, member since, plan badge, Edit / Upload photo / Share buttons) and the completion ring with its checklist.

## Tabs

Nine sub-routes under `/profile`, each a route file rendering its own component:

| Tab | Content | Data |
|---|---|---|
| Overview | About & business, social links, activity timeline | Real (brand kit + generations) |
| Account | Name, email, phone, language, timezone, date format, currency, country, password | Real (new profile table) |
| AI preferences | Personality, brand voice, reply style, emoji usage, creativity & temperature sliders, memory, context | Real — maps onto `brand_kits` tone/voice plus a few new columns |
| Your model | Active brand model: avatar, name, source, photos count, last saved; Edit / Replace | Real (`brand_models`) |
| Connected apps | Instagram/Facebook live; Google, WhatsApp, Shopify, Stripe, Zapier and others shown as "Coming soon" cards | Mixed |
| Security | Password change, sign out everywhere, security score, recent sign-ins | Partly real; 2FA / API keys / devices marked coming soon |
| Subscription | Plan, credit usage bars, upgrade CTA, payment history | Real (`user_credits`, `payments`, `plans`) |
| Notifications | Email, WhatsApp, push, reports, alerts toggles | Real (new prefs columns) |
| Data & privacy | Export data, download AI memory, privacy settings, delete account | Export/download real; delete account with confirmation |

Team is included as a locked "Coming soon" panel inside Account rather than a fake tab — CowQ has no team model and no seats in the plans.

## Honest labelling

Anything without a backend renders in a dimmed card with a small "Coming soon" pill and disabled controls. Nothing fake claims to save. This keeps the page impressive without over-promising, matching the roadmap section already on the landing page.

## UX

- Inline editing on every editable field: click the value, it becomes an input, blur or Enter saves.
- Autosave with a subtle "Saved" flash; failed saves toast and revert.
- Undo toast for the last change (10s window).
- Confirmation dialogs via the existing `Dialogs.tsx` for destructive actions.
- Keyboard: `/` focuses search, `⌘K` command palette for jumping tabs, `Esc` cancels an inline edit, arrow keys move through tabs.
- Loading skeletons per section, fade-and-rise entry (400ms) consistent with the rest of the app.
- Full keyboard focus rings, ARIA labels on toggles/sliders, live regions for save confirmations.

## Empty states

Line-SVG illustrations, matching the existing `EmptyState` component style, for: no connected shops, no saved model, no team, no activity yet, no invoices.

## Technical

**Database (one migration)**
- `profiles` — display name, role/title, phone, location, website, timezone, language, date format, currency, country, bio, mission, years in business, team size, social handles, avatar URL. Owner-only RLS, grants for `authenticated` and `service_role`.
- `notification_prefs` — per-channel booleans, owner-only.
- `brand_kits` gains AI-preference columns: reply style, emoji usage, conversation length, creativity, temperature.
- Avatars go in the existing `praan` storage bucket under a `profiles/` prefix.

**Server functions** — `src/lib/profile.functions.ts` with `getMyProfile`, `saveMyProfile` (zod-validated, length caps), `uploadAvatar`, `getNotificationPrefs`, `saveNotificationPrefs`, `getSecurityOverview`, `exportMyData`, `deleteMyAccount`. All behind `requireSupabaseAuth`.

**Routes** — `src/routes/_authenticated/profile/route.tsx` (shell: header, profile card, completion ring, tab bar, insights panel, `<Outlet />`) plus `index.tsx` and eight sibling leaves. Auth-gated, so loaders can use protected server functions.

**Components** — `src/components/profile/` holding roughly twenty small components: `ProfileHeaderCard`, `CompletionRing`, `InlineField`, `SettingCard`, `ToggleRow`, `SliderRow`, `ConnectedAppCard`, `SecurityScore`, `UsageBars`, `ActivityTimeline`, `InsightsPanel`, `ComingSoonCard`, `EmptyIllustration`, plus one per tab.

**Styling** — new `@utility` classes for the glass card, gradient rim and hover glow, added alongside the existing card utilities. No hardcoded colour classes; existing tokens only.

**Navigation** — a Profile entry (avatar) added to `AppSidebar` and the mobile nav sheet, plus head metadata with a `noindex` robots tag since it is private.

## Not in scope

- Real 2FA, biometric login, API keys, device/session management, team seats, or the non-Meta integrations. All shown as clearly-marked previews.
- No changes to Billing, Pricing, Connect or Brand kit pages; Profile links out to them.
