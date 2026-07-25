import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { useMemo, useState } from "react";
import { Check, X, Plus, Download } from "lucide-react";
import { useQueueStore, queueCounts, MAX_QUEUE, type QueueItem } from "@/lib/queue-store";
import { ProgressSteps, type StepState } from "@/components/ProgressSteps";
import { getGeneration } from "@/lib/cowq.functions";
import { downloadBulkZip, type BulkProduct } from "@/lib/bulk-download";
import { getBrowserId } from "@/lib/browser-id";

export const Route = createFileRoute("/generating")({
  head: () => ({
    meta: [
      { title: "Your product queue — CowQ" },
      {
        name: "description",
        content:
          "CowQ works through your products one at a time. Add up to three at once, then get back to what you were doing.",
      },
      { property: "og:title", content: "Your product queue — CowQ" },
      {
        property: "og:description",
        content: "Studio photos and listings, made in the background while you get on with your day.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/generating` },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/generating` }],
  }),
  component: QueueScreen,
});

function QueueScreen() {
  const navigate = useNavigate();
  const items = useQueueStore((s) => s.items);
  const remove = useQueueStore((s) => s.remove);
  const clearFinished = useQueueStore((s) => s.clearFinished);
  const [downloading, setDownloading] = useState(false);

  const counts = useMemo(() => queueCounts(items), [items]);
  const active = items.find((i) => i.status === "running");
  const waiting = items.filter((i) => i.status === "waiting");
  const finished = items.filter((i) => i.status === "ready" || i.status === "error");
  const readyItems = items.filter((i) => i.status === "ready");
  const allDone = items.length > 0 && counts.running === 0 && counts.waiting === 0;
  const queueFull = counts.active >= MAX_QUEUE;

  async function handleDownloadAll() {
    if (downloading) return;
    setDownloading(true);
    try {
      const details = await Promise.all(
        readyItems.map(async (i) => {
          if (!i.resultId) return null;
          const row = (await getGeneration({ data: { id: i.resultId, browserId: getBrowserId() } })) as {
            product_name: string;
            price: number | null;
            category: string;
            generated_images: BulkProduct["images"];
            copy: BulkProduct["copy"];
          } | null;
          if (!row) return null;
          return {
            productName: row.product_name || i.productName,
            price: row.price != null ? String(row.price) : i.price,
            category: row.category || i.identified.category,
            images: row.generated_images ?? [],
            copy: row.copy,
          } satisfies BulkProduct;
        }),
      );
      const products = details.filter((p): p is BulkProduct => Boolean(p));
      if (products.length === 0) return;
      await downloadBulkZip(products);
    } finally {
      setDownloading(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center px-5 pb-28 pt-12">
        <div className="w-full max-w-sm text-center">
          <h1 className="font-display text-[40px] leading-[1.02] text-ink">
            No products in the queue.
          </h1>
          <p className="mt-3 text-[15px] text-muted">
            Add a product and CowQ starts on it right away.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-[12px] bg-primary px-6 text-[15px] font-medium text-primary-foreground"
          >
            Add a product
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col px-5 pb-28 pt-8 lg:pt-12">
      <div className="mx-auto w-full max-w-[520px]">
        {allDone ? (
          <>
            <h1 className="font-display text-[40px] leading-[1.02] text-ink">
              {counts.ready} product{counts.ready === 1 ? "" : "s"} ready.
            </h1>
            <p className="mt-2 text-[15px] text-muted">
              Tap any to see the results, or download everything as one file.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-[40px] leading-[1.02] text-ink">
              Making your listing.
            </h1>
            <p className="mt-2 text-[15px] text-muted">
              You can leave this screen — we'll keep going in the background.
            </p>
          </>
        )}

        {/* Currently generating */}
        {active && <ActiveCard item={active} />}

        {/* Waiting */}
        {waiting.length > 0 && (
          <div className="mt-8">
            <p className="eyebrow mb-3">Waiting</p>
            <ul className="flex flex-col gap-2">
              {waiting.map((i) => (
                <QueueRow key={i.id} item={i} onRemove={() => remove(i.id)} />
              ))}
            </ul>
          </div>
        )}

        {/* Finished */}
        {finished.length > 0 && (
          <div className="mt-8">
            <p className="eyebrow mb-3">{allDone ? "Ready" : "Done"}</p>
            <ul className="flex flex-col gap-2">
              {finished.map((i) => (
                <QueueRow key={i.id} item={i} />
              ))}
            </ul>
          </div>
        )}

        {/* Add another / queue full */}
        <div className="mt-8 rounded-[14px] bg-raised p-5">
          {queueFull ? (
            <>
              <p className="text-[15px] font-medium text-ink">Queue is full.</p>
              <p className="mt-1 text-[14px] text-muted">
                3 is the most we'll do at once. One more slot opens as each finishes.
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate({ to: "/" })}
                className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-primary py-3.5 text-[15px] font-medium text-primary-foreground transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                Add another product
              </button>
              <p className="mt-3 text-center text-[13px] text-muted">
                This takes about a minute. Add your next one instead of waiting.
              </p>
            </>
          )}
        </div>

        {/* All done actions */}
        {allDone && readyItems.length > 0 && (
          <div className="mt-6 flex flex-col gap-3">
            <button
              onClick={handleDownloadAll}
              disabled={downloading}
              className="flex items-center justify-center gap-2 rounded-[12px] bg-raised py-3.5 text-[15px] font-medium text-ink transition hover:brightness-110 disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Zipping…" : "Download everything"}
            </button>
            <button
              onClick={clearFinished}
              className="text-[13px] text-muted underline"
            >
              Clear this list
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function ActiveCard({ item }: { item: QueueItem }) {
  const step = item.activeStep ?? 0;
  const states: StepState[] = [
    step > 0 ? "done" : "active",
    step === 1 ? "active" : step > 1 ? "done" : "pending",
    step === 2 ? "active" : step > 2 ? "done" : "pending",
  ];
  const hero = item.imageUrls[0];
  return (
    <div className="mt-8 rounded-[14px] bg-surface p-5">
      <p className="eyebrow mb-3">Generating now</p>
      <div className="flex items-start gap-4">
        {hero && (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[12px] bg-raised">
            <img
              src={hero}
              alt={item.productName}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ opacity: 0.75 }}
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-medium text-ink">{item.productName}</p>
          <p className="mt-0.5 text-[13px] text-muted">₹{item.price}</p>
        </div>
      </div>
      <div className="mt-5">
        <ProgressSteps
          steps={[
            { label: "Studying your product", state: states[0] },
            {
              label: "Shooting the photos",
              state: states[1],
              detail:
                states[1] === "active" && item.photoProgress
                  ? `${item.photoProgress.done} of ${item.photoProgress.total} photos done`
                  : null,
            },
            { label: "Writing your listing", state: states[2] },
          ]}
        />
      </div>
    </div>
  );
}

function QueueRow({ item, onRemove }: { item: QueueItem; onRemove?: () => void }) {
  const thumb = item.imageUrls[0];
  const isReady = item.status === "ready";
  const isError = item.status === "error";
  const body = (
    <div className="flex items-center gap-3">
      {thumb ? (
        <img
          src={thumb}
          alt=""
          className="h-11 w-11 shrink-0 rounded-[10px] bg-raised object-cover"
        />
      ) : (
        <div className="h-11 w-11 shrink-0 rounded-[10px] bg-raised" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] text-ink">{item.productName}</p>
        {isError && item.error && (
          <p className="mt-0.5 truncate text-[12px] text-primary">{item.error}</p>
        )}
      </div>
      {isReady ? (
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-primary">
          <Check className="h-4 w-4" /> Ready
        </span>
      ) : isError ? (
        <span className="text-[13px] font-medium text-primary">Failed</span>
      ) : (
        <span className="text-[13px] font-medium text-muted">Waiting</span>
      )}
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink"
          aria-label={`Remove ${item.productName} from queue`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
  const rowClass =
    "block rounded-[12px] bg-surface p-3 transition " +
    (isReady ? "hover:brightness-110" : "");
  if (isReady && item.resultId) {
    return (
      <li>
        <Link to="/results/$id" params={{ id: item.resultId }} className={rowClass}>
          {body}
        </Link>
      </li>
    );
  }
  return <li className={rowClass}>{body}</li>;
}
