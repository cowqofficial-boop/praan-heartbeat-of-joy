
# Product queue

Today: seller uploads one product, waits on `/generating`, then can start the next. This plan replaces that with a background queue of up to 3, a redesigned queue screen, a persistent indicator, and a combined download when the batch finishes.

## Behaviour

**Queue rules**
- Max 3 products at once (currently generating + waiting).
- Strictly sequential — one runs at a time to respect Gemini rate limits.
- Next item auto-starts the moment the previous finishes.
- Generation continues in the background; seller can be anywhere in the app.

**Credits**
- Check balance at *queue time* using cost × (already-queued items + 1). Refuse with the exact copy from the brief.
- Deduct credits at *start time* (inside the existing `generateCopyAndSave` / job flow). Removing a waiting item before it starts costs nothing.

**Removing**
- Waiting rows have a small × to remove. The active one cannot be cancelled.

## Screens & UI

**Queue screen (replaces `/generating`, kept at same URL)**
- Top: active product — hero photo, three `ProgressSteps`, live "N of 4 photos done" line (as today).
- Middle: waiting rows — thumbnail, product name, quiet "Waiting" pill; finished rows become "Ready" with Sindoor tick, tappable to `/results/$id`.
- Below: **Add another product** button on `--raised` with supporting line. Greys out when queue is full with the exact copy.
- When everything is done: summary "N products ready" listing each, plus **Download everything** (zip of all photos + one combined Shopify CSV).

**Persistent indicator (`QueueIndicator`)**
- Fixed pill: bottom-right on desktop, above bottom bar on mobile.
- Hidden on `/generating` itself.
- Shows "⚡ N generating · M ready" with a subtle pulse while running.
- On completion: "N products ready", stays 10s then fades.
- Tap → `/generating`.

**Add-another flow**
- "Add another product" navigates back to `/` (Upload) with a query flag so it knows to enqueue instead of replacing the current job. After Confirm, it pushes onto the queue and returns to `/generating`.

## Technical

**Queue store (`src/lib/queue-store.ts`, zustand + `persist` to localStorage)**
```ts
type QueueItem = {
  id: string;                    // local uuid
  status: 'waiting' | 'running' | 'ready' | 'error';
  productName: string;
  price: string;
  detail: string;
  photos: CowqPhoto[];           // dataUrls persisted (base64) — needed for background start after nav
  identified: Identified;
  cost: number;                  // credits, computed at enqueue
  jobId?: string;
  resultId?: string;             // generation id when ready
  photoProgress?: { done: number; total: number };
  error?: string;
};
```
Actions: `enqueue`, `remove`, `markRunning`, `updateProgress`, `markReady`, `markError`, `clearFinished`.

**Runner (`src/lib/queue-runner.tsx`)**
- Mounted once inside `__root.tsx` (client-only).
- `useEffect` watches the queue: if nothing running and there's a `waiting` item, start it — run the same three-phase pipeline currently in `generating.tsx` (`startGenerationJob` → parallel `generateImageForJob` × 4 → `generateCopyAndSave`) with the same 3-minute watchdog and refund logic.
- Updates the store as it progresses.
- Because `.persist` keeps items across navigation, generation survives route changes; a hard refresh resumes any `waiting` items (any `running` item at refresh is marked error + refunded via existing `refundGenerationJob`).

**Enqueue path**
- Confirm screen's "Make my photos" → compute cost via existing pricing helper → check `useAuth`'s credit balance + queued costs → if OK, `enqueue()` and `navigate('/generating')`. Old direct-hand-off through `useCowqStore` is removed for the queue path; `useCowqStore` stays only as the transient buffer between Upload and Confirm.

**Generating route rewrite**
- Reads from `useQueueStore`. Renders active card + waiting list + finished list + Add-another CTA + all-done summary.
- No longer starts jobs itself — the runner does. This lets the seller leave and come back.

**Persistent indicator**
- Small component in `__root.tsx` shell. Reads counts from `useQueueStore`. Hidden when `location.pathname === '/generating'`.

**Combined download**
- New `src/lib/bulk-download.ts`: fetches each ready generation's images + copy (already in DB), builds one `buildShopifyCsv`-style multi-product CSV, zips with `jszip` (add dep), triggers Blob download.

**Copy strings** — use the exact wording from the brief.

## Non-goals
- No parallel execution.
- No Pro bulk-upload (noted for later).
- No server-side queue persistence — queue lives in the browser (matches "per browser" model already used for free tier).

## Files

New:
- `src/lib/queue-store.ts`
- `src/lib/queue-runner.tsx`
- `src/lib/bulk-download.ts`
- `src/components/QueueIndicator.tsx`

Changed:
- `src/routes/generating.tsx` — full rewrite as queue screen.
- `src/routes/confirm.tsx` — enqueue instead of direct navigate; pre-flight credit check with new copy.
- `src/routes/__root.tsx` — mount `QueueRunner` + `QueueIndicator`.
- `src/routes/index.tsx` — "Add another product" entry recognises `?add=1` (minor: just wording of a small banner if a queue item is running).
- `package.json` — add `jszip`.
