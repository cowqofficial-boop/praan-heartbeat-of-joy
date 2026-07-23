import { useRef, useState, useCallback } from "react";

export function BeforeAfterSlider({
  before,
  after,
}: {
  before: string;
  after: string;
}) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const setFromClient = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(0, Math.min(100, x)));
  }, []);

  return (
    <div
      ref={ref}
      className="relative w-full overflow-hidden bg-surface select-none touch-none cursor-ew-resize"
      style={{ aspectRatio: "4 / 5" }}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setFromClient(e.clientX);
      }}
      onPointerMove={(e) => {
        if (!dragging.current) return;
        setFromClient(e.clientX);
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      {/* After image fills container */}
      <img
        src={after}
        alt="Studio photo"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {/* Before image also fills container, clipped from the right */}
      <img
        src={before}
        alt="Your photo"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white">
        Before
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white">
        After
      </span>

      <div
        className="pointer-events-none absolute inset-y-0"
        style={{ left: `calc(${pos}% - 1.5px)`, width: "3px", background: "#F2A73B" }}
      />
      <div
        className="pointer-events-none absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-white"
        style={{ left: `${pos}%`, background: "#F2A73B" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="14 6 8 12 14 18" />
          <polyline points="10 6 16 12 10 18" />
        </svg>
      </div>
    </div>
  );
}
