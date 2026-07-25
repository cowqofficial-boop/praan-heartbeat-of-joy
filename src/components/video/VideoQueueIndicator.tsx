import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Film } from "lucide-react";
import { useVideoQueue, videoQueueCounts } from "@/lib/video-queue-store";

export function VideoQueueIndicator() {
  const jobs = useVideoQueue((s) => s.jobs);
  const clearFinished = useVideoQueue((s) => s.clearFinished);
  const c = videoQueueCounts(jobs);
  const [showDone, setShowDone] = useState(false);
  const settled = jobs.length > 0 && c.busy === 0;
  const lastGen = jobs[jobs.length - 1]?.generationId;

  useEffect(() => {
    if (!settled) {
      setShowDone(false);
      return;
    }
    setShowDone(true);
    const t = setTimeout(() => {
      setShowDone(false);
      clearFinished();
    }, 12_000);
    return () => clearTimeout(t);
  }, [settled, c.ready, c.failed, clearFinished]);

  if (jobs.length === 0) return null;
  if (settled && !showDone) return null;

  const label = settled
    ? c.ready > 0
      ? `${c.ready} video${c.ready === 1 ? "" : "s"} ready`
      : "Video didn't work — credits back"
    : `${c.busy} video${c.busy === 1 ? "" : "s"} being made`;

  const fg = settled ? (c.ready > 0 ? "var(--magenta)" : "var(--cobalt)") : "var(--amber)";

  return (
    <Link
      to="/results/$id"
      params={{ id: lastGen ?? "" }}
      className={`fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium text-ink shadow-lg transition hover:brightness-110 lg:right-6 ${
        settled ? "" : "breathe"
      }`}
      style={{
        background: `color-mix(in oklab, ${fg} 18%, var(--raised))`,
        boxShadow: `0 8px 28px color-mix(in oklab, ${fg} 30%, transparent)`,
      }}
      aria-label={label}
    >
      <Film className="h-3.5 w-3.5" style={{ color: fg }} />
      <span>{label}</span>
    </Link>
  );
}
