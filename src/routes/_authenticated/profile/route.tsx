import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  Compass,

  HelpCircle,
  Search,
  Sparkles,
  UserRoundCog,
  X,
} from "lucide-react";
import { getMyProfile, getMyInsights } from "@/lib/profile.functions";
import { getMyCredits } from "@/lib/billing.functions";
import { getMyBrandKit } from "@/lib/brand-kit.functions";
import { getPlan } from "@/lib/plans";
import { COBALT, MAGENTA } from "@/lib/page-accent";
import { ProfileHeaderCard } from "@/components/profile/ProfileHeaderCard";
import { InsightsPanel } from "@/components/profile/InsightsPanel";
import { HelpButton } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfileLayout,
});

type Tab = { to: string; label: string; keywords: string; exact?: boolean };

const TABS: Tab[] = [
  { to: "/profile", label: "Overview", exact: true, keywords: "summary snapshot activity" },
  { to: "/profile/account", label: "Account", keywords: "name email phone password language timezone currency country" },
  { to: "/profile/ai", label: "AI preferences", keywords: "personality tone voice emoji creativity temperature writing" },
  { to: "/profile/shop", label: "My shop", keywords: "public storefront link slug share visitors listings shop page" },
  { to: "/profile/apps", label: "Connected apps", keywords: "instagram facebook whatsapp integrations channels" },

  { to: "/profile/security", label: "Security", keywords: "password sessions two step login devices" },
  { to: "/profile/subscription", label: "Plan & usage", keywords: "billing credits invoices payments upgrade" },
  { to: "/profile/team", label: "Team", keywords: "members roles permissions invite staff" },
  { to: "/profile/notifications", label: "Notifications", keywords: "email sms whatsapp push reports alerts" },
  { to: "/profile/privacy", label: "Data & privacy", keywords: "export delete account memory consent cookies" },
];

function ProfileLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  const profileFn = useServerFn(getMyProfile);
  const insightsFn = useServerFn(getMyInsights);
  const creditsFn = useServerFn(getMyCredits);
  const kitFn = useServerFn(getMyBrandKit);

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => profileFn({}) });
  const insightsQ = useQuery({ queryKey: ["profile", "insights"], queryFn: () => insightsFn({}) });
  const creditsQ = useQuery({ queryKey: ["credits"], queryFn: () => creditsFn({}) });
  const kitQ = useQuery({ queryKey: ["brand-kit"], queryFn: () => kitFn({}) });

  // "/" jumps to search, the way it does in Linear.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing = el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const visibleTabs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TABS;
    const hits = TABS.filter(
      (t) => t.label.toLowerCase().includes(q) || t.keywords.includes(q),
    );
    return hits.length ? hits : TABS;
  }, [query]);

  const planName = getPlan(creditsQ.data?.plan_id ?? "free").name;
  const unread = insightsQ.data && insightsQ.data.shops_connected === 0 ? 1 : 0;

  return (
    <div className="px-4 pb-24 pt-6 lg:px-0 lg:pb-16">
      {/* ---------------- top header ---------------- */}
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]"
            style={{
              background: `color-mix(in oklab, ${COBALT} 18%, var(--raised))`,
              color: COBALT,
              boxShadow: `0 6px 20px color-mix(in oklab, ${COBALT} 22%, transparent)`,
            }}
            aria-hidden
          >
            <UserRoundCog className="h-7 w-7" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="page-headline truncate">Profile</h1>
              <HelpButton
                content={
                  <>
                    <p className="font-semibold text-ink">Your account, in one place.</p>
                    <p className="mt-1.5 text-muted">
                      Your details, how CowQ writes for you, your shops, your plan and your data. Changes
                      save on their own — no Save button to hunt for.
                    </p>
                  </>
                }
              />
            </div>
            <p className="mt-1 text-[14px] text-muted">
              Everything about you and your shop. Press <kbd className="font-mono">/</kbd> to search settings.
            </p>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          {/* Tour lives in the header row, next to the other help controls. */}
          <a
            href="/library?tour=1"
            className="flex h-10 items-center gap-1.5 rounded-[12px] px-3 text-[13px] font-medium text-muted hover:text-ink"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)" }}
          >
            <Compass className="h-[18px] w-[18px]" style={{ color: COBALT }} />
            Take the tour
          </a>

          <Link
            to="/profile/notifications"
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-[12px] text-muted hover:text-ink"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)" }}
          >
            <Bell className="h-[18px] w-[18px]" />
            {unread > 0 && (
              <span
                className="absolute right-2 top-2 h-2 w-2 rounded-full"
                style={{ background: MAGENTA, boxShadow: `0 0 10px ${MAGENTA}` }}
              />
            )}
          </Link>
          <Link
            to="/how-it-works"
            aria-label="How CowQ works"
            className="grid h-10 w-10 place-items-center rounded-[12px] text-muted hover:text-ink"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)" }}
          >
            <HelpCircle className="h-[18px] w-[18px]" />
          </Link>
          <AmbienceToggle />
        </div>
      </header>

      {/* ---------------- search ---------------- */}
      <div
        className="mb-5 flex items-center gap-2 rounded-[12px] px-3"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)" }}
      >
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search settings — password, credits, WhatsApp…"
          aria-label="Search settings"
          className="h-11 w-full bg-transparent text-[14px] text-ink outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-muted hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <ProfileHeaderCard
        profile={profileQ.data}
        businessName={kitQ.data?.business_name ?? null}
        sellsWhat={kitQ.data?.sells_what ?? null}
        planName={planName}
        loading={profileQ.isLoading}
      />

      {/* ---------------- tabs ---------------- */}
      <nav
        className="mt-6 flex gap-1 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
        aria-label="Profile sections"
      >
        {visibleTabs.map((t) => {
          const active = t.exact ? pathname === "/profile" || pathname === "/profile/" : pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              data-active={active}
              aria-current={active ? "page" : undefined}
              className="tab-pill shrink-0 px-3.5 py-2 text-[14px] font-medium"
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {/* ---------------- body ---------------- */}
      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_296px] xl:items-start">
        <div className="min-w-0">
          <Outlet />
        </div>
        <aside className="min-w-0">
          <InsightsPanel insights={insightsQ.data} credits={creditsQ.data} loading={insightsQ.isLoading} />
        </aside>
      </div>
    </div>
  );
}

/**
 * Turns the ambient background glows down for sellers who find them heavy or
 * are on a low-end phone. Persisted, applied to <html>.
 */
function AmbienceToggle() {
  const [dim, setDim] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("cowq:dim-ambience") === "1";
    setDim(saved);
    document.documentElement.classList.toggle("dim-ambience", saved);
  }, []);

  function toggle() {
    const next = !dim;
    setDim(next);
    localStorage.setItem("cowq:dim-ambience", next ? "1" : "0");
    document.documentElement.classList.toggle("dim-ambience", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dim}
      aria-label={dim ? "Turn the background glow back on" : "Turn the background glow down"}
      title={dim ? "Glow off" : "Glow on"}
      className="grid h-10 w-10 place-items-center rounded-[12px] hover:text-ink"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--line)",
        color: dim ? "var(--text-dim)" : COBALT,
      }}
    >
      <Sparkles className="h-[18px] w-[18px]" strokeWidth={dim ? 1.4 : 2} />
    </button>
  );
}
