import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Boxes,
  CalendarDays,
  ChevronRight,
  LibraryBig,
  Link2,
  LogOut,
  Package,
  Plus,
  Receipt,
  Settings2,
  UserRoundCog,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { to: string; label: string; icon: typeof Plus };

const NAV: NavItem[] = [
  { to: "/create", label: "Add product", icon: Plus },
  { to: "/library", label: "Library", icon: Package },
  { to: "/calendar", label: "Content calendar", icon: CalendarDays },
  { to: "/stock", label: "Stock", icon: Boxes },
  { to: "/connect", label: "Connect channels", icon: Link2 },
  { to: "/brand-kit", label: "Brand kit", icon: Settings2 },
  { to: "/billing", label: "Billing", icon: Receipt },
  { to: "/profile", label: "Profile & settings", icon: UserRoundCog },
  { to: "/library", label: "Your products", icon: LibraryBig },
];

// De-duplicate — the sidebar model has one library item; keep the first eight.
const ITEMS = NAV.slice(0, 8);

export function MobileNavSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  async function handleSignOut() {
    onClose();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex flex-col justify-end"
      style={{ background: "rgba(6,7,10,0.7)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="scale-in mx-auto w-full max-w-[520px] rounded-t-[20px] pb-6 pt-3"
        style={{ background: "var(--raised)", boxShadow: "var(--shadow-raised)", transformOrigin: "bottom" }}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full" style={{ background: "var(--line)" }} />
        <div className="flex items-center justify-between px-5 py-2">
          <span className="text-[12px] font-semibold uppercase tracking-wider text-muted">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex flex-col">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className="flex h-14 items-center gap-3 px-5 text-[15px] font-medium text-ink hover:bg-surface"
              >
                <span className="grid h-8 w-8 place-items-center rounded-[10px] text-muted" style={{ background: "var(--surface)" }}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </Link>
            );
          })}
          <div style={{ borderTop: "1px solid var(--line)" }} className="mt-1">
            <button
              type="button"
              onClick={handleSignOut}
              className="flex h-14 w-full items-center gap-3 px-5 text-[15px] font-medium text-muted hover:text-ink"
            >
              <span className="grid h-8 w-8 place-items-center rounded-[10px]" style={{ background: "var(--surface)" }}>
                <LogOut className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1 text-left">Sign out</span>
            </button>
          </div>
        </nav>
      </div>
    </div>,
    document.body,
  );
}
