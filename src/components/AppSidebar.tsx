import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  CalendarDays,
  LibraryBig,
  Link2,
  LogOut,
  Plus,
  Receipt,
  Settings2,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { getMyCredits } from "@/lib/billing.functions";

type Item = { to: string; label: string; icon: typeof Plus };

const ITEMS: Item[] = [
  { to: "/create", label: "Add product", icon: Plus },
  { to: "/library", label: "Library", icon: LibraryBig },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/stock", label: "Stock", icon: Boxes },
  { to: "/connect", label: "Connect", icon: Link2 },
  { to: "/brand-kit", label: "Brand kit", icon: Settings2 },
  { to: "/billing", label: "Billing", icon: Receipt },
];

export function AppSidebar() {
  const { user, ready } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: credits } = useQuery({
    queryKey: ["my-credits"],
    queryFn: () => getMyCredits(),
    enabled: !!user,
    staleTime: 30_000,
  });

  if (!ready || !user) return null;

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <aside
      className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-[240px] lg:flex-col"
      style={{ background: "var(--surface)" }}
      aria-label="Main navigation"
    >
      <div className="flex h-full flex-col px-4 py-8">
        <Link to="/" className="mb-10 px-2">
          <span className="font-display text-[28px] leading-none text-ink">CowQ</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {ITEMS.map((item) => {
            const active =
              item.to === "/"
                ? path === "/"
                : path === item.to || path.startsWith(item.to + "/");
            const Icon = item.icon;
            const tourId =
              item.to === "/create"
                ? "nav-create"
                : item.to === "/library"
                ? "nav-library"
                : item.to === "/stock"
                ? "nav-stock"
                : undefined;
            return (
              <Link
                key={item.to}
                to={item.to}
                data-tour={tourId}
                className={`relative flex h-11 items-center gap-3 rounded-[10px] px-3 text-[14px] font-medium transition-colors ${
                  active
                    ? "text-ink"
                    : "text-muted hover:text-ink"
                }`}
                style={
                  active
                    ? { background: "var(--raised)" }
                    : undefined
                }
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full"
                    style={{ background: "var(--sindoor)" }}
                  />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <Link
            to="/pricing"
            className="flex h-11 items-center justify-between rounded-[10px] px-3 text-[13px] text-muted hover:text-ink"
            style={{ background: "var(--raised)" }}
            aria-label="View plans"
          >
            <span className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-marigold" fill="currentColor" />
              <span className="font-mono tabular-nums text-ink">
                {credits ? credits.total.toLocaleString("en-IN") : "…"}
              </span>
            </span>
            <span className="text-[11px] uppercase tracking-wider">credits</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium text-muted hover:text-ink"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
