import { useRef, useState, useCallback } from "react";

export function BeforeAfterSlider({
  before,
  after,
  aspect = "1 / 1",
}: {
  before: string;
  after: string;
  aspect?: string;
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
      className="relative w-full overflow-hidden rounded-[12px] bg-surface select-none touch-none cursor-ew-resize"
      style={{ aspectRatio: aspect }}
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
      <img
        src={after}
        alt="Studio photo"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${pos}%` }}
      >
        <img
          src={before}
          alt="Your photo"
          className="absolute inset-y-0 left-0 h-full object-cover"
          style={{ width: `${(ref.current?.clientWidth ?? 0)}px`, maxWidth: "none" }}
          draggable={false}
        />
      </div>

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white">
        Before
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-white">
        After
      </span>

      <div
        className="pointer-events-none absolute inset-y-0"
        style={{ left: `calc(${pos}% - 1.5px)`, width: "3px", background: "#F5A623" }}
      />
      <div
        className="pointer-events-none absolute top-1/2 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-highlight text-white shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
        style={{ left: `${pos}%` }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
          <polyline points="9 6 15 12 9 18" transform="translate(6 0)" />
        </svg>
      </div>
    </div>
  );
}
