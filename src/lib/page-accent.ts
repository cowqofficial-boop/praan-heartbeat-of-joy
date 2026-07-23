// Per-page accent colour. One place decides the identity for every route.
// See styles.css: --page-accent (primary) drives icon tiles, empty-state
// stroke, sidebar active state, buttons and glows. --page-accent-2 only
// affects the page headline gradient — accent → pearl for most pages, or
// accent → accent-2 for brand-kit.

export const COBALT = "#3D5AFE";
export const MAGENTA = "#FF2FA3";
export const AMBER = "#FF8A1E";
export const PEARL = "#F5F7FF";

export type Accent = { color: string; color2: string };

const MAP: Array<{ match: (p: string) => boolean; accent: Accent }> = [
  { match: (p) => p.startsWith("/results"), accent: { color: MAGENTA, color2: PEARL } },
  { match: (p) => p.startsWith("/calendar"), accent: { color: MAGENTA, color2: PEARL } },
  { match: (p) => p.startsWith("/stock"), accent: { color: AMBER, color2: PEARL } },
  { match: (p) => p.startsWith("/billing"), accent: { color: AMBER, color2: PEARL } },
  { match: (p) => p.startsWith("/pricing"), accent: { color: AMBER, color2: PEARL } },
  { match: (p) => p.startsWith("/generating"), accent: { color: AMBER, color2: PEARL } },
  { match: (p) => p.startsWith("/brand-kit"), accent: { color: COBALT, color2: MAGENTA } },
  { match: (p) => p.startsWith("/library"), accent: { color: COBALT, color2: PEARL } },
  { match: (p) => p.startsWith("/create"), accent: { color: COBALT, color2: PEARL } },
  { match: (p) => p.startsWith("/confirm"), accent: { color: COBALT, color2: PEARL } },
  { match: (p) => p.startsWith("/connect"), accent: { color: COBALT, color2: PEARL } },
  { match: (p) => p.startsWith("/auth"), accent: { color: COBALT, color2: PEARL } },
];

export function pageAccent(pathname: string): Accent {
  for (const row of MAP) if (row.match(pathname)) return row.accent;
  return { color: COBALT, color2: PEARL };
}

// Nav item colour mapping — used by AppSidebar so every icon carries its
// destination's page colour (dimmed when inactive).
export const NAV_ACCENT: Record<string, string> = {
  "/create": COBALT,
  "/library": COBALT,
  "/calendar": MAGENTA,
  "/stock": AMBER,
  "/connect": COBALT,
  "/brand-kit": COBALT,
  "/billing": AMBER,
};

// Credit balance colour: cobalt normally, amber below 20% or absolute low
// count, magenta at zero. Callers may pass a plan quota; without it we fall
// back to absolute thresholds tuned for free-tier credits.
export function creditColor(total: number, quota?: number): string {
  if (total <= 0) return MAGENTA;
  const ratio = quota && quota > 0 ? total / quota : null;
  if (ratio != null ? ratio < 0.2 : total < 100) return AMBER;
  return COBALT;
}
