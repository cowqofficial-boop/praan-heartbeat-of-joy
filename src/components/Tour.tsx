import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";

import { useAuth } from "@/lib/use-auth";
import { getTourStatus, setTourCompleted } from "@/lib/tour.functions";
import tourPhone from "@/assets/tour-phone.jpg.asset.json";
import tourResults from "@/assets/tour-results.jpg.asset.json";

type Step = {
  target: string | null; // data-tour attribute value; null = centered card
  title: string;
  body: string;
  image?: { url: string; alt: string };
  cta?: string;
};

const STEPS: Step[] = [
  {
    target: "nav-create",
    title: "Add a product",
    body:
      "This is where everything starts. One photo of anything you sell, and CowQ does the rest — studio photos, the listing, social posts, a catalog file.",
    image: { url: tourPhone.url, alt: "A phone photographing a product on a table" },
  },
  {
    target: "credits",
    title: "Your credits",
    body:
      "Credits are how CowQ charges. One complete product costs 90. You have 300 to start — that's three products, free.",
  },
  {
    target: "nav-library",
    title: "Your library",
    body:
      "Everything you make is saved here forever. Come back any time and download it again.",
  },
  {
    target: "nav-stock",
    title: "Your stock",
    body:
      "Track what you're holding. It's free on every plan, and CowQ won't advertise anything you've run out of.",
  },
  {
    target: null,
    title: "Make your first one",
    body:
      "That's everything. Add your first product and see what comes back — it takes about a minute.",
    image: { url: tourResults.url, alt: "A set of finished studio product photos" },
    cta: "Add my first product",
  },
];

const PAD = 8;
const CARD_W = 320;
const CARD_GAP = 16;

type Rect = { top: number; left: number; width: number; height: number };

function getRect(target: string | null): Rect | null {
  if (!target || typeof document === "undefined") return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

type TourOverlayProps = { onDone: () => void };

function TourOverlay({ onDone }: TourOverlayProps) {
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const [rect, setRect] = useState<Rect | null>(() => getRect(step.target));
  const [vw, setVw] = useState(() => (typeof window === "undefined" ? 0 : window.innerWidth));
  const [vh, setVh] = useState(() => (typeof window === "undefined" ? 0 : window.innerHeight));

  // Track viewport + target position (handles resize, scroll, sidebar mount timing).
  useLayoutEffect(() => {
    let raf = 0;
    const update = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
      setRect(getRect(step.target));
    };
    update();
    const loop = () => {
      update();
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step.target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll while the tour is up.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onDone]);

  function next() {
    if (i < STEPS.length - 1) setI(i + 1);
    else finish();
  }
  function finish() {
    onDone();
    if (step.cta) navigate({ to: "/create" });
  }

  const isLast = i === STEPS.length - 1;
  const highlight = rect ? { ...rect } : null;

  // Card placement: beside the highlight when possible, else centered.
  const cardStyle: React.CSSProperties = useMemo(() => {
    if (!highlight || vw === 0) {
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: Math.min(CARD_W, vw - 32),
      };
    }
    const width = Math.min(CARD_W, vw - 32);
    // Prefer to the right of the highlight on desktop; below on mobile.
    const rightSpace = vw - (highlight.left + highlight.width) - CARD_GAP;
    const leftSpace = highlight.left - CARD_GAP;
    let left: number;
    let top: number;
    if (rightSpace >= width + 8) {
      left = highlight.left + highlight.width + CARD_GAP;
      top = Math.max(16, Math.min(vh - 200, highlight.top));
    } else if (leftSpace >= width + 8) {
      left = highlight.left - CARD_GAP - width;
      top = Math.max(16, Math.min(vh - 200, highlight.top));
    } else {
      // Stack below the highlight (mobile).
      left = Math.max(16, Math.min(vw - width - 16, highlight.left));
      top = Math.min(vh - 220, highlight.top + highlight.height + CARD_GAP);
    }
    return { left, top, width };
  }, [highlight, vw, vh]);

  const svgW = vw || 1200;
  const svgH = vh || 800;

  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label={`Tour step ${i + 1} of ${STEPS.length}`}
    >
      {/* Dim overlay with a cut-out around the highlight */}
      <svg
        className="absolute inset-0 h-full w-full"
        width={svgW}
        height={svgH}
        aria-hidden
      >
        <defs>
          <mask id="cowq-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {highlight && (
              <rect
                x={highlight.left - PAD}
                y={highlight.top - PAD}
                width={highlight.width + PAD * 2}
                height={highlight.height + PAD * 2}
                rx={14}
                ry={14}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(6,7,10,0.72)"
          mask="url(#cowq-tour-mask)"
          onClick={onDone}
          style={{ cursor: "pointer" }}
        />
        {highlight && (
          <rect
            x={highlight.left - PAD}
            y={highlight.top - PAD}
            width={highlight.width + PAD * 2}
            height={highlight.height + PAD * 2}
            rx={14}
            ry={14}
            fill="none"
            stroke="#3D5AFE"
            strokeWidth={2}
            style={{ filter: "drop-shadow(0 0 12px rgba(59,130,246,0.6))" }}
          />
        )}
      </svg>

      {/* Skip link */}
      <button
        type="button"
        onClick={onDone}
        className="absolute right-4 top-4 z-[110] flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-white/80 hover:text-white"
        style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(6px)" }}
      >
        <span>Skip tour</span>
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Step counter */}
      <div
        className="absolute left-4 top-4 z-[110] rounded-full px-3 py-1.5 text-[12px] font-mono text-white/70"
        style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(6px)" }}
      >
        {i + 1} / {STEPS.length}
      </div>

      {/* Card */}
      <div
        key={i}
        className="absolute z-[110] rounded-[16px] p-5 shadow-2xl"
        style={{
          ...cardStyle,
          background: "var(--raised, #1C1C22)",
          border: "1px solid rgba(255,255,255,0.08)",
          animation: "tour-card-in 260ms ease-out",
        }}
      >
        {step.image && (
          <div
            className="mb-4 overflow-hidden rounded-[12px]"
            style={{ aspectRatio: "16 / 10", background: "var(--surface, #141418)" }}
          >
            <img
              src={step.image.url}
              alt={step.image.alt}
              width={640}
              height={400}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <p className="font-display text-[20px] leading-tight text-ink">{step.title}</p>
        <p className="mt-2 text-[14px] leading-snug text-muted">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-muted">
            Step {i + 1} of {STEPS.length}
          </span>
          <button
            type="button"
            onClick={next}
            className="h-10 rounded-[10px] px-5 text-[14px] font-semibold"
            style={{ background: "#3D5AFE", color: "#F5F7FF" }}
          >
            {isLast ? step.cta ?? "Done" : "Next"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes tour-card-in {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body,
  );
}

export function Tour() {
  const { user, ready } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const { data: status } = useQuery({
    queryKey: ["tour-status"],
    queryFn: () => getTourStatus(),
    enabled: ready && !!user,
    staleTime: 5 * 60_000,
  });

  const complete = useMutation({
    mutationFn: () => setTourCompleted(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tour-status"] }),
  });

  // Explicit "restart tour" via ?tour=1
  const search = useRouterState({ select: (s) => s.location.search }) as unknown as
    | Record<string, unknown>
    | undefined;
  const forced = useMemo(() => {
    return search?.tour === 1 || search?.tour === "1";
  }, [search]);

  const [open, setOpen] = useState(false);

  // Routes where we don't run the tour (auth flow, landing, onboarding wizard).
  const suppressed =
    path === "/" ||
    path.startsWith("/auth") ||
    path.startsWith("/create") ||
    path.startsWith("/confirm") ||
    path.startsWith("/generating") ||
    path.startsWith("/results") ||
    path.startsWith("/api");

  useEffect(() => {
    if (!ready || !user || !status) return;
    if (suppressed) return;
    if (forced) {
      setOpen(true);
      return;
    }
    if (!status.completed) setOpen(true);
  }, [ready, user, status, suppressed, forced]);

  // If the user is signed in and hasn't taken the tour, but is sitting on a
  // suppressed surface (e.g. brand-kit onboarding wizard exit → /library), we
  // let them arrive naturally. Landing/upload aren't the right context.
  if (!open) return null;

  return (
    <TourOverlay
      onDone={() => {
        setOpen(false);
        complete.mutate();
        if (forced) {
          // Strip the ?tour=1 param so it doesn't relaunch on refresh.
          navigate({ to: path, search: {}, replace: true });
        }
      }}
    />
  );
}
