# CowQ — M0 Implementation Tracker
Tracks execution of Roadmap Milestone M0 (Foundation & Trust Repair) task by task. One task per commit. Nothing here is marked complete until it has landed in a commit and the build has been verified.

Legend: [ ] not started · [~] in progress · [x] done (commit hash noted)

## Investigation (read-only, commit a6bb45b6)
- [x] Full-codebase search of every credit-mutation code path (spend_credits, spendOrThrow, refund_credits, and any direct writes to user_credits) — commit a6bb45b6 (no file changes, search only)

## Findings that change the original bug assumption
The roadmap's documented bug ("generateBrandModelPortrait uses spendOrThrow instead of spend_credits") is **not present in the current code** — `spendOrThrow` (src/lib/credits.server.ts) internally calls the sanctioned `spend_credits` RPC correctly, and `generateBrandModelPortrait` already uses `spendOrThrow`. Verified, not rebuilt.

A more serious, previously undocumented issue was found instead: `public.user_credits` has an RLS policy + GRANT that lets any signed-in user directly `UPDATE` their own `subscription_credits`/`pack_credits` from the browser client, completely bypassing the `spend_credits` RPC. This is the actual highest-priority M0 bug — a live credit-tampering hole, not a naming mismatch.

## Tasks
- [ ] **T1 — Close the direct client-side `user_credits` UPDATE hole.** Revoke the `UPDATE` grant and drop the self-update RLS policy on `public.user_credits` for the `authenticated` role, leaving `SELECT` intact. Balance changes must only happen via the `spend_credits`/`refund_credits` RPCs (service_role, SECURITY DEFINER) or the Razorpay webhook (service_role).
- [ ] **T2 — Fix unrefunded failure paths in `generateBrandModelPortrait`.** The `createSignedUrl` failure and the `brand_kits` update failure (src/lib/brand-kit.functions.ts) both `throw` after credits were spent, without calling `refundSpend`.
- [ ] **T3 — Fix the non-atomic credit grant race in the Razorpay webhook.** `src/routes/api/public/razorpay-webhook.ts` does a read-then-upsert on `pack_credits` with no row lock, which can race with a concurrent `spend_credits` call and clobber a deduction.
- [ ] **T4 — Add the permanent CI guardrail script** (`scripts/audit-credit-deduction-paths.js`) that fails the build if any file outside the sanctioned RPC call sites mutates `user_credits`.
- [ ] **T5 — Three-part credit test suite** for every credit-consuming feature (success deducts correctly, failure deducts nothing, insufficient balance blocks pre-generation).
- [ ] **T6 — RLS allow/deny automated tests** for `user_credits` and other core tables (`catalog_items`/equivalent, customer data).
- [ ] **T7 — `credit_costs` versioned config table** + `get_credit_cost(action_type)` so displayed cost can never drift from charged cost.

Tasks are executed one at a time, in order, each in its own commit, only on explicit "Continue" from the founder.
