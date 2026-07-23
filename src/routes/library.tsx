import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, CalendarDays, LogOut, Plus, Receipt, Search, Settings2, Trash2, Pencil, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyProduct, listMyProducts, renameMyProduct, type LibraryItem } from "@/lib/library.functions";
import { CreditBadge } from "@/components/CreditBadge";
import { LowBalanceBanner } from "@/components/LowBalanceBanner";
import { ReconnectBanner } from "@/components/ReconnectBanner";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your products — CowQ Ai" },
      { name: "description", content: "Every product you've generated with CowQ Ai — reopen, rename, delete, or add a new one." },
      { property: "og:title", content: "Your products — CowQ Ai" },
      { property: "og:description", content: "Your CowQ Ai product library." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [authReady, setAuthReady] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", search: { mode: "signin", next: "/library" }, replace: true });
      } else {
        setAuthReady(true);
      }
    });
  }, [navigate]);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["library"],
    queryFn: () => listMyProducts(),
    enabled: authReady,
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((it) => (it.product_name ?? "").toLowerCase().includes(q));
  }, [items, query]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[15px] text-muted">Loading…</p>
      </div>
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  async function handleRename(item: LibraryItem) {
    const name = prompt("Rename product", item.product_name ?? "");
    if (!name || !name.trim()) return;
    await renameMyProduct({ data: { id: item.id, name: name.trim() } });
    qc.invalidateQueries({ queryKey: ["library"] });
  }

  async function handleDelete(item: LibraryItem) {
    if (!confirm(`Delete "${item.product_name ?? "this product"}"? This can't be undone.`)) return;
    await deleteMyProduct({ data: { id: item.id } });
    qc.invalidateQueries({ queryKey: ["library"] });
  }

  return (
    <main className="flex min-h-screen flex-col px-5 pb-16 pt-8">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-[28px] leading-tight text-ink">Your products</h1>
        <div className="flex items-center gap-1">
          <CreditBadge />
          <Link
            to="/stock"
            className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink"
            aria-label="Stock"
          >
            <Boxes className="h-5 w-5" />
          </Link>
          <Link
            to="/calendar"
            className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink"
            aria-label="Content calendar"
          >
            <CalendarDays className="h-5 w-5" />
          </Link>
          <Link
            to="/connect"
            className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink"
            aria-label="Connect channels"
          >
            <Link2 className="h-5 w-5" />
          </Link>
          <Link
            to="/billing"
            className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink"
            aria-label="Billing"
          >
            <Receipt className="h-5 w-5" />
          </Link>
          <Link
            to="/brand-kit"
            className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink"
            aria-label="Brand kit"
          >
            <Settings2 className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <ReconnectBanner />
      <LowBalanceBanner />



      <Link
        to="/"
        className="mt-6 flex h-14 items-center justify-center gap-2 rounded-[12px] bg-primary text-[16px] font-semibold text-primary-foreground"
      >
        <Plus className="h-5 w-5" />
        Add new product
      </Link>

      {items.length > 0 && (
        <label className="mt-6 flex h-11 items-center gap-2 rounded-[12px] border border-[color:var(--color-border)] bg-raised px-3">
          <Search className="h-4 w-4 text-muted" />
          <input
            aria-label="Search products"
            className="flex-1 bg-transparent text-[15px] text-ink outline-none"
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      )}

      <div className="mt-6">
        {isLoading ? (
          <p className="text-[15px] text-muted">Loading…</p>
        ) : items.length === 0 ? (
          <div className="mt-16 rounded-[12px] border border-dashed border-[color:var(--color-border)] bg-surface p-8 text-center">
            <p className="text-[16px] font-medium text-ink">Your products will live here.</p>
            <p className="mt-2 text-[14px] text-muted">Add your first one.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-[15px] text-muted">No products match "{query}".</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {filtered.map((it) => (
              <ProductCard key={it.id} item={it} onRename={handleRename} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function ProductCard({
  item,
  onRename,
  onDelete,
}: {
  item: LibraryItem;
  onRename: (i: LibraryItem) => void;
  onDelete: (i: LibraryItem) => void;
}) {
  const thumb =
    item.generated_images.find((i) => i.kind === "white" && i.ratio === "1:1")?.url ??
    item.generated_images[0]?.url ??
    item.original_image_url ??
    "";
  const date = new Date(item.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
  return (
    <li className="overflow-hidden rounded-[12px] border border-[color:var(--color-border)] bg-raised">
      <Link
        to="/results/$id"
        params={{ id: item.id }}
        className="block aspect-square w-full overflow-hidden bg-surface"
      >
        {thumb ? (
          <img src={thumb} alt={item.product_name ?? "Product"} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full" />
        )}
      </Link>
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-ink">
            {item.product_name ?? "Untitled"}
          </p>
          <p className="mt-0.5 text-[12px] text-muted">{date}</p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onRename(item)}
            aria-label="Rename"
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-ink"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item)}
            aria-label="Delete"
            className="grid h-8 w-8 place-items-center rounded-full text-muted hover:text-primary"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
