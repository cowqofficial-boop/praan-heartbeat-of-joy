// Line illustrations for the Profile empty states. Stroke uses the card's
// accent so each empty state carries its section's colour.
type Props = { tint: string; className?: string };

const S = { fill: "none", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function NoIntegrationsArt({ tint, className = "" }: Props) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden>
      <g stroke={tint} {...S} opacity={0.9}>
        <rect x="14" y="34" width="44" height="44" rx="12" />
        <rect x="102" y="34" width="44" height="44" rx="12" />
        <path d="M58 56h16M86 56h16" strokeDasharray="4 5" />
        <circle cx="80" cy="56" r="7" />
        <path d="M36 48v16M28 56h16" />
      </g>
    </svg>
  );
}

export function NoModelArt({ tint, className = "" }: Props) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden>
      <g stroke={tint} {...S} opacity={0.9}>
        <rect x="46" y="14" width="68" height="82" rx="14" />
        <circle cx="80" cy="46" r="14" />
        <path d="M58 84c4-12 11-18 22-18s18 6 22 18" />
        <path d="M24 30v50M136 30v50" strokeDasharray="3 6" />
      </g>
    </svg>
  );
}

export function NoTeamArt({ tint, className = "" }: Props) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden>
      <g stroke={tint} {...S} opacity={0.9}>
        <circle cx="62" cy="40" r="14" />
        <path d="M36 82c3-14 13-22 26-22s23 8 26 22" />
        <circle cx="110" cy="46" r="10" strokeDasharray="4 5" />
        <path d="M94 82c2-10 8-16 16-16s14 6 16 16" strokeDasharray="4 5" />
      </g>
    </svg>
  );
}

export function NoActivityArt({ tint, className = "" }: Props) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden>
      <g stroke={tint} {...S} opacity={0.9}>
        <path d="M32 22v66" />
        <circle cx="32" cy="36" r="6" />
        <circle cx="32" cy="60" r="6" strokeDasharray="3 4" />
        <circle cx="32" cy="84" r="6" strokeDasharray="3 4" />
        <path d="M50 36h74M50 60h52" strokeDasharray="4 6" />
        <path d="M50 84h38" strokeDasharray="4 6" />
      </g>
    </svg>
  );
}

export function NoWorkflowArt({ tint, className = "" }: Props) {
  return (
    <svg viewBox="0 0 160 110" className={className} aria-hidden>
      <g stroke={tint} {...S} opacity={0.9}>
        <rect x="16" y="42" width="36" height="26" rx="8" />
        <rect x="108" y="20" width="36" height="26" rx="8" strokeDasharray="4 5" />
        <rect x="108" y="64" width="36" height="26" rx="8" strokeDasharray="4 5" />
        <path d="M52 55h22M74 55V33h34M74 55v22h34" />
      </g>
    </svg>
  );
}
