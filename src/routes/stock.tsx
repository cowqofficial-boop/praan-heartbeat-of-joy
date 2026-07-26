import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Boxes,
  Minus,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader, HelpButton } from "@/components/PageHeader";
import { EmptyState, IllustrationBoxes } from "@/components/EmptyState";
import { showConfirm } from "@/components/Dialogs";

import { supabase } from "@/integrations/supabase/client";
import {
  changeQuantity,
  deleteStockItem,
  listMovements,
  listStock,
  upsertStockItem,
  type StockItem,
  type StockStatus,
} from "@/lib/stock.functions";
import { listMyProducts } from "@/lib/library.functions";
import { COSTS, formatInr } from "@/lib/plans";
import { TypeToggle, TypeFilter, TypeBadge } from "@/components/TypeToggle";
import { serviceCost, type ContentKind } from "@/lib/service";

export const Route = createFileRoute("/stock")({
  head: () => ({
    meta: [
      { title: "Stock — CowQ" },
      { name: "description", content: "Track what's in stock, low, or sold out. Log every movement and see your inventory value." },
      { property: "og:title", content: "Stock — CowQ" },
      { property: "og:description", content: "Stock management for Indian sellers — free on every plan." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: StockPage,
});

type Filter = "all" | "low" | "out";

const REASON_LABEL = {
  sold: "Sold",
  restocked: "Restocked",
  damaged: "Damaged",
  returned: "Returned",
  adjustment: "Adjusted",
} as const;

function statusChip(s: StockStatus) {
  switch (s) {
    case "out":
      return { label: "Out of stock", cls: "bg-primary/15 text-primary/90" };
    case "low":
      return { label: "Low", cls: "bg-amber/20 text-amber" };
    default:
      return { label: "In stock", cls: "bg-green/15 text-green" };
  }
}


function StockPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [authReady, setAuthReady] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | ContentKind>("all");
  const [editing, setEditing] = useState<StockItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [undo, setUndo] = useState<{ id: string; name: string; expiresAt: number } | null>(null);


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", search: { mode: "signin", next: "/stock" }, replace: true });
      } else {
        setAuthReady(true);
      }
    });
  }, [navigate]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["stock"],
    queryFn: () => listStock(),
    enabled: authReady,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: () => listMovements({ data: { limit: 100 } }),
    enabled: authReady && showLog,
  });

  const sorted = useMemo(() => {
    const rank = (s: StockStatus) => (s === "out" ? 0 : s === "low" ? 1 : 2);
    const q2 = q.trim().toLowerCase();
    return items
      .filter((i) => (typeFilter === "all" ? true : (i.kind ?? "product") === typeFilter))
      .filter((i) => (i.kind === "service" ? true : filter === "all" ? true : i.status === filter))
      .filter((i) => (q2 ? i.name.toLowerCase().includes(q2) || (i.sku ?? "").toLowerCase().includes(q2) : true))
      .slice()
      .sort((a, b) => rank(a.status) - rank(b.status));
  }, [items, filter, typeFilter, q]);

  const totals = useMemo(() => {
    let costPaise = 0;
    let sellPaise = 0;
    let lowCount = 0;
    let outCount = 0;
    for (const i of items) {
      costPaise += i.cost_price_paise * i.quantity;
      sellPaise += i.selling_price_paise * i.quantity;
      if (i.status === "low") lowCount++;
      if (i.status === "out") outCount++;
    }
    return {
      costInr: Math.round(costPaise / 100),
      sellInr: Math.round(sellPaise / 100),
      lowCount,
      outCount,
    };
  }, [items]);

  const changeQty = useMutation({
    mutationFn: changeQuantity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
    },
  });

  const del = useMutation({
    mutationFn: deleteStockItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stock"] }),
  });

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[15px] text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col px-6 pb-24 pt-8 lg:px-0 lg:pt-12">
      <Link
        to="/library"
        className="grid h-10 w-10 -ml-2 place-items-center text-muted hover:text-ink lg:hidden"
        aria-label="Back"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <PageHeader
        icon={Boxes}
        title="Stock"
        subtitle="Track what you have, what's running low, and what your inventory is worth."
        help={
          <>
            <p className="font-semibold text-ink">How stock helps</p>
            <p className="mt-1 text-muted">Add the quantity you hold of each product. CowQ warns you when something runs low, and leaves out-of-stock products out of your posting calendar so you never advertise something you can't sell.</p>
          </>
        }
        action={{ label: "Add an item", onClick: () => setCreating(true), icon: Plus }}
      />




      {/* Totals */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="card-cobalt p-3">
          <div className="flex items-center gap-1">
            <p className="text-[11px] uppercase tracking-wide text-[color:var(--card-accent)]">Value at cost</p>
            <HelpButton label="What this means" content={<p className="text-muted">What your stock cost you to buy or make — quantity × cost price, added up.</p>} />
          </div>
          <p className="mt-1 font-mono text-[20px] font-semibold text-ink tabular-nums">
            {formatInr(totals.costInr)}
          </p>
        </div>
        <div className="card-magenta p-3">

          <div className="flex items-center gap-1">
            <p className="text-[11px] uppercase tracking-wide text-[color:var(--card-accent)]">Value at retail</p>
            <HelpButton label="What this means" content={<p className="text-muted">What your stock is worth if you sell it all at your listed prices.</p>} />
          </div>
          <p className="mt-1 font-mono text-[20px] font-semibold text-ink tabular-nums">
            {formatInr(totals.sellInr)}
          </p>
        </div>
      </div>
      {(totals.lowCount > 0 || totals.outCount > 0) && (
        <p className="mt-2 text-[13px] text-muted">
          {totals.outCount > 0 && (
            <>
              <span className="font-semibold text-primary">{totals.outCount} out of stock</span>
              {totals.lowCount > 0 ? " · " : ""}
            </>
          )}
          {totals.lowCount > 0 && (
            <span className="font-semibold text-ink">{totals.lowCount} running low</span>
          )}
        </p>
      )}

      {/* Search + filter */}
      <label className="mt-4 flex h-11 items-center gap-2 rounded-[14px] bg-raised px-3 ring-1 ring-inset ring-[color:var(--color-border)]">
        <Search className="h-4 w-4 text-muted" />
        <input
          className="flex-1 bg-transparent text-[15px] text-ink outline-none"
          placeholder="Search by name or SKU"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      <div className="mt-3">
        <TypeFilter
          value={typeFilter}
          onChange={setTypeFilter}
          counts={{
            all: items.length,
            product: items.filter((i) => (i.kind ?? "product") === "product").length,
            service: items.filter((i) => i.kind === "service").length,
          }}
        />
      </div>
      <div className="mt-3 inline-flex rounded-full bg-surface p-1 text-[13px] font-medium">
        {(["all", "low", "out"] as Filter[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`h-8 rounded-full px-3 ${
              filter === k ? "bg-raised text-ink shadow-sm" : "text-muted"
            }`}
          >
            {k === "all" ? "All" : k === "low" ? "Low" : "Out"}
          </button>
        ))}
      </div>

      {/* Add / log */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-primary text-[15px] font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Add item
        </button>
        <button
          type="button"
          onClick={() => setShowLog(true)}
          className="h-12 rounded-[14px] bg-surface px-4 text-[14px] font-semibold text-ink"
        >
          Movement log
        </button>
      </div>

      {/* List */}
      <div className="mt-4">
        {isLoading ? (
          <p className="text-[15px] text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState
            illustration={<IllustrationBoxes />}
            title="Nothing tracked yet"
            body="Add your first item and CowQ will keep count as you sell. Free on every plan."
            action={{ label: "Add your first item", onClick: () => setCreating(true) }}
            help={
              <>
                <p className="font-semibold text-ink">How stock helps</p>
                <p className="mt-1 text-muted">Each item shows a live status: in stock, low, or out. Log sales in one tap; the number goes down. Your content calendar uses this to skip out-of-stock products automatically.</p>
              </>
            }
          />


        ) : sorted.length === 0 ? (
          <p className="text-[15px] text-muted">Nothing matches.</p>
        ) : (
          <>
            {/* Mobile / tablet: card list */}
            <ul className="grid grid-cols-1 gap-2 stagger lg:hidden">
              {sorted.map((it) => {
                const chip = statusChip(it.status);
                const profit = it.selling_price_paise - it.cost_price_paise;
                return (
                  <li key={it.id} className="stagger-item card-list p-3">

                    <div className="flex items-start gap-3">
                      {it.thumb_url ? (
                        <img src={it.thumb_url} alt="" className="h-14 w-14 shrink-0 rounded-[10px] object-cover" loading="lazy" />
                      ) : (
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[10px] bg-surface">
                          <Package className="h-5 w-5 text-muted" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => setEditing(it)} className="block w-full text-left">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-[15px] font-semibold text-ink">{it.name}</p>
                            <TypeBadge kind={it.kind ?? "product"} />
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-muted">
                            {it.sku ? `SKU ${it.sku} · ` : ""}
                            Cost {formatInr(Math.round(it.cost_price_paise / 100))} · Sell {formatInr(Math.round(it.selling_price_paise / 100))}
                            {profit > 0 && (<><span> · </span><span className="text-ink">+{formatInr(Math.round(profit / 100))}</span></>)}
                          </p>
                        </button>
                        {!it.has_photos && (
                          <Link
                            to="/create"
                            className="mt-1 inline-block text-[12px] font-semibold text-[color:var(--page-accent)]"
                          >
                            {it.kind === "service"
                              ? `Make a service poster — ${serviceCost(false)} credits`
                              : `Generate photos — ${COSTS.product} credits`}
                          </Link>
                        )}
                      </div>

                      {it.kind !== "service" && (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${chip.cls}`}>{chip.label}</span>
                      )}
                    </div>
                    {it.kind === "service" ? (
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-[13px] text-muted">Services aren't counted in stock.</p>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditing(it)} className="h-9 rounded-full bg-surface px-3 text-[13px] font-semibold text-ink">
                            Edit
                          </button>
                          <button type="button" aria-label="Delete item"
                            onClick={async () => { if (await showConfirm({ title: `Delete "${it.name}"?`, body: "This can't be undone.", destructive: true, confirmLabel: "Delete" })) del.mutate({ data: { id: it.id } }); }}
                            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-primary">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label="Decrease" disabled={it.quantity === 0 || changeQty.isPending}
                          onClick={() => changeQty.mutate({ data: { stock_item_id: it.id, delta: -1, reason: "adjustment" } })}
                          className="grid h-9 w-9 place-items-center rounded-full bg-surface text-ink disabled:opacity-40">
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-[3.5rem] text-center font-mono text-[18px] font-semibold text-ink tabular-nums">{it.quantity}</span>
                        <button type="button" aria-label="Increase" disabled={changeQty.isPending}
                          onClick={() => changeQty.mutate({ data: { stock_item_id: it.id, delta: 1, reason: "restocked" } })}
                          className="grid h-9 w-9 place-items-center rounded-full bg-surface text-ink">
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" disabled={it.quantity === 0 || changeQty.isPending}
                          onClick={() => {
                            setPulseId(it.id);
                            setTimeout(() => setPulseId((cur) => (cur === it.id ? null : cur)), 300);
                            changeQty.mutate({ data: { stock_item_id: it.id, delta: -1, reason: "sold" } });
                            setUndo({ id: it.id, name: it.name, expiresAt: Date.now() + 5000 });
                          }}
                          className={`h-9 rounded-full bg-primary px-3 text-[13px] font-semibold text-primary-foreground disabled:opacity-40 ${pulseId === it.id ? "pulse-once" : ""}`}>
                          Sold 1
                        </button>
                        <button type="button" aria-label="Delete item"
                          onClick={async () => { if (await showConfirm({ title: `Delete "${it.name}" from stock?`, body: "This can't be undone.", destructive: true, confirmLabel: "Delete" })) del.mutate({ data: { id: it.id } }); }}

                          className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-primary">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Desktop: table */}
            <div className="hidden lg:block overflow-hidden card-list">
              <table className="w-full text-left text-[14px] text-ink">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted">
                    <th className="px-4 py-3 font-semibold">Photo</th>
                    <th className="px-2 py-3 font-semibold">Product</th>
                    <th className="px-2 py-3 font-semibold">SKU</th>
                    <th className="px-2 py-3 text-right font-semibold">Qty</th>
                    <th className="px-2 py-3 font-semibold">Status</th>
                    <th className="px-2 py-3 text-right font-semibold">Cost</th>
                    <th className="px-2 py-3 text-right font-semibold">Price</th>
                    <th className="px-2 py-3 text-right font-semibold">Profit</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((it) => {
                    const chip = statusChip(it.status);
                    const profit = it.selling_price_paise - it.cost_price_paise;
                    return (
                      <tr key={it.id} className="transition-colors hover:bg-raised/60" style={{ borderTop: "1px solid var(--line)" }}>
                        <td className="px-4 py-3">
                          {it.thumb_url ? (
                            <img src={it.thumb_url} alt="" className="h-10 w-10 rounded-[8px] object-cover" loading="lazy" />
                          ) : (
                            <div className="grid h-10 w-10 place-items-center rounded-[8px] bg-raised"><Package className="h-4 w-4 text-muted" /></div>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <button type="button" onClick={() => setEditing(it)} className="text-left font-medium text-ink hover:text-primary">{it.name}</button>
                          {!it.has_photos && (
                            <Link to="/create" className="mt-0.5 block text-[12px] font-semibold text-[color:var(--page-accent)]">
                              Generate photos — {COSTS.product} credits
                            </Link>
                          )}
                        </td>

                        <td className="px-2 py-3 font-mono text-[13px] tabular-nums text-muted">{it.sku ?? "—"}</td>
                        <td className="px-2 py-3 text-right font-mono text-[15px] font-semibold tabular-nums">{it.quantity}</td>
                        <td className="px-2 py-3"><span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${chip.cls}`}>{chip.label}</span></td>
                        <td className="px-2 py-3 text-right font-mono tabular-nums text-muted">{formatInr(Math.round(it.cost_price_paise / 100))}</td>
                        <td className="px-2 py-3 text-right font-mono tabular-nums">{formatInr(Math.round(it.selling_price_paise / 100))}</td>
                        <td className="px-2 py-3 text-right font-mono tabular-nums text-green">{profit > 0 ? `+${formatInr(Math.round(profit / 100))}` : "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" aria-label="Decrease" disabled={it.quantity === 0 || changeQty.isPending}
                              onClick={() => changeQty.mutate({ data: { stock_item_id: it.id, delta: -1, reason: "adjustment" } })}
                              className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink disabled:opacity-40">
                              <Minus className="h-4 w-4" />
                            </button>
                            <button type="button" aria-label="Increase" disabled={changeQty.isPending}
                              onClick={() => changeQty.mutate({ data: { stock_item_id: it.id, delta: 1, reason: "restocked" } })}
                              className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink">
                              <Plus className="h-4 w-4" />
                            </button>
                            <button type="button" disabled={it.quantity === 0 || changeQty.isPending}
                              onClick={() => {
                                setPulseId(it.id);
                                setTimeout(() => setPulseId((cur) => (cur === it.id ? null : cur)), 300);
                                changeQty.mutate({ data: { stock_item_id: it.id, delta: -1, reason: "sold" } });
                                setUndo({ id: it.id, name: it.name, expiresAt: Date.now() + 5000 });
                              }}
                              className={`ml-1 h-8 rounded-full bg-primary px-3 text-[12px] font-semibold text-primary-foreground disabled:opacity-40 ${pulseId === it.id ? "pulse-once" : ""}`}>
                              Sold 1
                            </button>
                            <button type="button" aria-label="Delete item"
                              onClick={async () => { if (await showConfirm({ title: `Delete "${it.name}" from stock?`, body: "This can't be undone.", destructive: true, confirmLabel: "Delete" })) del.mutate({ data: { id: it.id } }); }}
                              className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-primary">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>


      {undo && (
        <UndoToast
          key={undo.expiresAt}
          name={undo.name}
          onUndo={() => {
            changeQty.mutate({ data: { stock_item_id: undo.id, delta: 1, reason: "returned" } });
            setUndo(null);
          }}
          onClose={() => setUndo(null)}
        />
      )}


      {(creating || editing) && (
        <StockSheet
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["stock"] });
          }}
        />
      )}

      {showLog && (
        <MovementLog
          onClose={() => setShowLog(false)}
          movements={movements}
        />
      )}
    </main>
  );
}

function ReqMark() {
  return <span className="ml-0.5 text-[color:var(--magenta,#FF2FA3)]" aria-hidden>*</span>;
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3">
      <label className="text-[12px] font-semibold uppercase tracking-wide text-muted">
        {label}
        {required && <ReqMark />}
      </label>
      <div className="mt-1">{children}</div>
      {error && (
        <p className="mt-1 text-[12px] font-medium" style={{ color: "var(--magenta, #FF2FA3)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 first:mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--page-accent)]">{title}</p>
      {children}
    </section>
  );
}

function StockSheet({
  initial,
  onClose,
  onSaved,
}: {
  initial: StockItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [qty, setQty] = useState(initial?.quantity.toString() ?? "0");
  const [low, setLow] = useState(initial?.low_stock_alert.toString() ?? "3");
  const [cost, setCost] = useState((initial ? initial.cost_price_paise / 100 : 0).toString());
  const [sell, setSell] = useState((initial ? initial.selling_price_paise / 100 : 0).toString());
  const [productId, setProductId] = useState<string | null>(initial?.product_id ?? null);
  const [category, setCategory] = useState(initial?.category ?? "");
  const [brand, setBrand] = useState(initial?.brand ?? "");
  const [variant, setVariant] = useState(initial?.variant ?? "");
  const [weight, setWeight] = useState(initial?.weight ?? "");
  const [hsn, setHsn] = useState(initial?.hsn_code ?? "");
  const [barcode, setBarcode] = useState(initial?.barcode ?? "");
  const [supplier, setSupplier] = useState(initial?.supplier ?? "");
  const [reorder, setReorder] = useState(initial?.reorder_level?.toString() ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const { data: products = [] } = useQuery({
    queryKey: ["library-lite"],
    queryFn: () => listMyProducts(),
    enabled: !initial, // only when creating a new one
  });

  const save = useMutation({
    mutationFn: upsertStockItem,
    onSuccess: onSaved,
    onError: (e) => setErr(e instanceof Error ? e.message : String(e)),
  });

  function submit() {
    setErr(null);
    const fe: Record<string, string> = {};
    const q = parseInt(qty || "", 10);
    const s = parseFloat(sell || "");
    if (!name.trim()) fe.name = "Name is required.";
    if (qty.trim() === "" || Number.isNaN(q) || q < 0) fe.qty = "Quantity is required.";
    if (sell.trim() === "" || Number.isNaN(s) || s <= 0) fe.sell = "Selling price is required.";
    const l = parseInt(low || "0", 10);
    if (Number.isNaN(l) || l < 0) fe.low = "Must be a positive number.";
    const r = reorder.trim() === "" ? null : parseInt(reorder, 10);
    if (r !== null && (Number.isNaN(r) || r < 0)) fe.reorder = "Must be a positive number.";
    setFieldErr(fe);
    if (Object.keys(fe).length > 0) return;

    const c = Math.round(parseFloat(cost || "0") * 100);
    save.mutate({
      data: {
        id: initial?.id,
        product_id: productId,
        name: name.trim(),
        sku: sku.trim() || null,
        quantity: q,
        low_stock_alert: l,
        cost_price_paise: Number.isNaN(c) ? 0 : c,
        selling_price_paise: Math.round(s * 100),
        category: category.trim() || null,
        brand: brand.trim() || null,
        variant: variant.trim() || null,
        weight: weight.trim() || null,
        hsn_code: hsn.trim() || null,
        barcode: barcode.trim() || null,
        supplier: supplier.trim() || null,
        reorder_level: r,
        notes: notes.trim() || null,
      },
    });
  }

  const linkedProduct = productId ? products.find((p) => p.id === productId) : null;
  const linkedHasPhotos = initial
    ? initial.has_photos
    : !!(linkedProduct?.generated_images as Array<{ url?: string }> | undefined)?.some((i) => i?.url);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-t-[20px] bg-raised p-5 sm:rounded-[20px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky -top-5 -mx-5 -mt-5 flex items-center justify-between bg-raised px-5 pb-3 pt-5">
          <h2 className="font-display text-[20px] text-ink">
            {initial ? "Edit item" : "Add item"}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-[12px] text-muted">
          Fields marked <ReqMark /> are required.
        </p>

        <Section title="Basics">
          {!initial && products.length > 0 && (
            <Field label="Link to a product (optional)">
              <select
                value={productId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setProductId(id);
                  if (id) {
                    const p = products.find((x) => x.id === id);
                    if (p && !name) setName(p.product_name ?? "");
                  }
                }}
                className="h-11 w-full rounded-[12px] bg-surface px-3 text-[15px] text-ink"
              >
                <option value="">— No linked product —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.product_name ?? "Untitled"}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {!linkedHasPhotos && (
            <Link
              to="/create"
              className="mt-2 inline-flex h-10 items-center rounded-[12px] bg-surface px-3 text-[13px] font-semibold text-ink"
            >
              Generate photos — {COSTS.product} credits
            </Link>
          )}

          <Field label="Name" required error={fieldErr.name}>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Sarees" className="input" />
            </Field>
            <Field label="Brand">
              <input value={brand} onChange={(e) => setBrand(e.target.value)} className="input" />
            </Field>
          </div>
          <Field label="SKU">
            <input value={sku} onChange={(e) => setSku(e.target.value)} className="input" />
          </Field>
        </Section>

        <Section title="Pricing">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cost price ₹">
              <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} className="input font-mono" />
            </Field>
            <Field label="Selling price ₹" required error={fieldErr.sell}>
              <input inputMode="decimal" value={sell} onChange={(e) => setSell(e.target.value)} className="input font-mono" />
            </Field>
          </div>
          {(() => {
            const c = parseFloat(cost || "0");
            const s = parseFloat(sell || "0");
            if (s > 0 && c > 0) {
              const profit = s - c;
              const margin = ((profit / s) * 100).toFixed(0);
              return (
                <p className="mt-2 text-[13px] text-muted">
                  Profit per unit:{" "}
                  <span className="font-mono font-semibold text-ink">
                    {formatInr(Math.round(profit))}
                  </span>{" "}
                  ({margin}% margin)
                </p>
              );
            }
            return null;
          })()}
        </Section>

        <Section title="Quantity">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity" required error={fieldErr.qty}>
              <input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))} className="input font-mono" />
            </Field>
            <Field label="Low-stock alert at" error={fieldErr.low}>
              <input inputMode="numeric" value={low} onChange={(e) => setLow(e.target.value.replace(/\D/g, ""))} className="input font-mono" />
            </Field>
          </div>
          <Field label="Reorder level" error={fieldErr.reorder}>
            <input
              inputMode="numeric"
              value={reorder}
              onChange={(e) => setReorder(e.target.value.replace(/\D/g, ""))}
              placeholder="Reorder from supplier at this count"
              className="input font-mono"
            />
          </Field>
        </Section>

        <Section title="Details">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Size / Variant">
              <input value={variant} onChange={(e) => setVariant(e.target.value)} placeholder="M · 6-inch · Red" className="input" />
            </Field>
            <Field label="Weight">
              <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="500g" className="input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="HSN code">
              <input value={hsn} onChange={(e) => setHsn(e.target.value)} className="input font-mono" />
            </Field>
            <Field label="Barcode">
              <input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="input font-mono" />
            </Field>
          </div>
          <Field label="Supplier">
            <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input" />
          </Field>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-[12px] bg-raised p-3 text-[15px] text-ink outline-none"
              style={{ boxShadow: "inset 0 0 0 1px var(--line)" }}
            />
          </Field>
        </Section>

        {err && <p className="mt-3 text-[13px] text-primary">{err}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={save.isPending}
          className="mt-5 h-12 w-full rounded-[14px] bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-60"
        >
          {save.isPending ? "Saving…" : initial ? "Save changes" : "Add to stock"}
        </button>
      </div>

      <style>{`.input{height:44px;width:100%;border-radius:12px;background:var(--raised);padding:0 12px;color:var(--text);font-size:15px;outline:none;box-shadow:inset 0 0 0 1px var(--line)}`}</style>
    </div>
  );
}

function UndoToast({ name, onUndo, onClose }: { name: string; onUndo: () => void; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-5">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-raised px-4 py-2.5 text-[13px] text-ink scale-in"
           style={{ boxShadow: "var(--shadow-raised)" }}>

        <span>Sold 1 · {name}</span>
        <button type="button" onClick={onUndo} className="text-[color:var(--page-accent)] font-semibold hover:brightness-110">Undo</button>
      </div>
    </div>
  );
}



function MovementLog({
  movements,
  onClose,
}: {
  movements: Awaited<ReturnType<typeof listMovements>>;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-[480px] overflow-y-auto rounded-t-[20px] bg-raised p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[20px] text-ink">Movement log</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        {movements.length === 0 ? (
          <p className="mt-6 text-center text-[14px] text-muted">Nothing logged yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[color:var(--color-border)]">
            {movements.map((m) => {
              const when = new Date(m.created_at).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              const sign = m.delta > 0 ? "+" : "";
              return (
                <li key={m.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-ink">{m.item_name}</p>
                    <p className="text-[12px] text-muted">
                      {REASON_LABEL[m.reason]} · {when}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-[15px] font-semibold tabular-nums ${
                      m.delta < 0 ? "text-primary" : "text-ink"
                    }`}
                  >
                    {sign}
                    {m.delta}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
