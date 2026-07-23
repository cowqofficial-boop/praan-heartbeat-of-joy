import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MoreHorizontal, Package, Plus, Search, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyProduct, listMyProducts, renameMyProduct, type LibraryItem } from "@/lib/library.functions";
import { CreditBadge } from "@/components/CreditBadge";
import { LowBalanceBanner } from "@/components/LowBalanceBanner";
import { ReconnectBanner } from "@/components/ReconnectBanner";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState, IllustrationShelf } from "@/components/EmptyState";
import { NudgeCard } from "@/components/NudgeCard";
import { MobileNavSheet } from "@/components/MobileNavSheet";
import { showConfirm, showPrompt } from "@/components/Dialogs";



export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your products — CowQ" },
      { name: "description", content: "Every product you've generated with CowQ — reopen, rename, delete, or add a new one." },
      { property: "og:title", content: "Your products — CowQ" },
      { property: "og:description", content: "Your CowQ product library." },
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
  const [menuOpen, setMenuOpen] = useState(false);

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

    <main className="flex min-h-screen flex-col px-6 pb-16 pt-8 lg:px-0 lg:pt-12">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <PageHeader
            icon={Package}
            title="Your products"
            subtitle="Everything you've made with CowQ lives here. Open any product to download its photos and copy again."
            help={
              <>
                <p className="font-semibold text-ink">Your library</p>
                <p className="mt-1 text-muted">
                  Every product you create is saved automatically. Come back any time — the photos, the listing and the catalog file are all still here. Nothing expires.
                </p>
              </>
            }
            action={{ label: "Add a product", to: "/create", icon: Plus }}
          />
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <CreditBadge />
          <Link to="/stock" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink" aria-label="Stock"><Boxes className="h-5 w-5" /></Link>
          <Link to="/calendar" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink" aria-label="Content calendar"><CalendarDays className="h-5 w-5" /></Link>
          <Link to="/connect" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink" aria-label="Connect channels"><Link2 className="h-5 w-5" /></Link>
          <Link to="/billing" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink" aria-label="Billing"><Receipt className="h-5 w-5" /></Link>
          <Link to="/brand-kit" className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink" aria-label="Brand kit"><Settings2 className="h-5 w-5" /></Link>
          <button type="button" onClick={handleSignOut} className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink" aria-label="Sign out"><LogOut className="h-5 w-5" /></button>
        </div>
      </div>

      <ReconnectBanner />
      <LowBalanceBanner />

      {items.length > 0 && (
        <label className="mt-6 flex h-11 items-center gap-2 rounded-[12px] bg-raised px-3">
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
          <EmptyState
            illustration={<IllustrationShelf />}
            title="Your products will appear here"
            body="Make your first one — photos, listing and catalog file, in about a minute."
            action={{ label: "Add your first product", to: "/create" }}
            help={
              <>
                <p className="font-semibold text-ink">How this works</p>
                <p className="mt-1 text-muted">Take one clear phone photo of your product in daylight. CowQ turns it into 4 studio-style photos, marketplace-ready copy, social posts and a Shopify catalog file — in about a minute.</p>
              </>
            }
          />
        ) : filtered.length === 0 ? (
          <p className="text-[15px] text-muted">Nothing matches "{query}".</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 stagger sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
            {filtered.map((it) => (
              <ProductCard key={it.id} item={it} onRename={handleRename} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </div>

      {items.length > 0 && (
        <NudgeCard
          icon={CalendarDays}
          text="Plan a month of posts from these."
          linkLabel="Open calendar"
          to="/calendar"
        />
      )}
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
    <li className="stagger-item group relative overflow-hidden rounded-[16px] bg-surface transition-transform duration-200 hover:-translate-y-0.5"
        style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 1px 3px rgba(0,0,0,0.4)" }}
    >
      <Link
        to="/results/$id"
        params={{ id: item.id }}
        className="block aspect-[4/5] w-full overflow-hidden bg-surface"
      >
        {thumb ? (
          <img
            src={thumb}
            alt={item.product_name ?? "Product"}
            className="h-full w-full object-cover img-warm transition-[filter] duration-200 group-hover:brightness-110"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full" />
        )}
        {/* scrim + name */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
          <p className="line-clamp-2 text-[14px] font-semibold text-white">
            {item.product_name ?? "Untitled"}
          </p>
          <p className="mt-0.5 text-[11px] text-white/70">{date}</p>
        </div>
      </Link>
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          onClick={() => onRename(item)}
          aria-label="Rename"
          className="grid h-8 w-8 place-items-center rounded-full bg-background/70 text-ink backdrop-blur-sm hover:brightness-110"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          aria-label="Delete"
          className="grid h-8 w-8 place-items-center rounded-full bg-background/70 text-ink backdrop-blur-sm hover:text-primary"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

