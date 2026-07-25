import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Film, Loader2, X } from "lucide-react";
import {
  SCRIPT_CAP,
  VIDEO_DURATIONS,
  VIDEO_RATIOS,
  VIDEO_TYPES,
  videoBatchCost,
  videoCostPerRatio,
  type VideoDuration,
  type VideoRatio,
  type VideoType,
} from "@/lib/video";
import { draftVideoScript, startVideoBatch } from "@/lib/video.functions";
import { getMyCredits } from "@/lib/billing.functions";
import { useVideoQueue } from "@/lib/video-queue-store";

const TINTS = ["card-cobalt", "card-magenta", "card-amber"] as const;

export function VideoSetupDialog({
  generationId,
  productName,
  onClose,
}: {
  generationId: string;
  productName: string;
  onClose: () => void;
}) {
  const [videoType, setVideoType] = useState<VideoType>("ad");
  const [durationSec, setDurationSec] = useState<VideoDuration>(5);
  const [ratios, setRatios] = useState<VideoRatio[]>(["9:16"]);
  const [script, setScript] = useState("");
  const [touchedScript, setTouchedScript] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draft = useServerFn(draftVideoScript);
  const start = useServerFn(startVideoBatch);
  const enqueue = useVideoQueue((s) => s.enqueue);

  const { data: credits } = useQuery({
    queryKey: ["my-credits"],
    queryFn: () => getMyCredits(),
    staleTime: 30_000,
  });
  const balance = credits?.balance ?? 0;

  const cap = SCRIPT_CAP[durationSec];
  const perRatio = videoCostPerRatio(durationSec);
  const total = videoBatchCost(durationSec, ratios);
  const short = total > balance;

  // Redraft when type or length changes, unless the seller has edited it.
  useEffect(() => {
    if (touchedScript) return;
    let alive = true;
    setDrafting(true);
    draft({ data: { generationId, videoType, durationSec } })
      .then((r) => {
        if (alive) setScript(r.script.slice(0, cap));
      })
      .catch(() => {})
      .finally(() => alive && setDrafting(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoType, durationSec, generationId]);

  function toggleRatio(r: VideoRatio) {
    setRatios((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  }

  async function handleStart() {
    setError(null);
    if (ratios.length === 0) return setError("Pick at least one shape.");
    if (!script.trim()) return setError("Write a script first.");
    setStarting(true);
    try {
      const res = await start({
        data: { generationId, videoType, durationSec, ratios, script: script.trim() },
      });
      enqueue(
        res.jobs.map((j) => ({
          id: j.id,
          batchId: res.batchId,
          generationId,
          productName,
          videoType,
          durationSec,
          ratio: j.ratio,
        })),
      );
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("NO_CREDITS")) setError("Not enough credits for this. Top up and try again.");
      else if (msg.includes("VIDEO_DISABLED")) setError("Video isn't switched on yet.");
      else setError(msg.replace(/^Error:\s*/, ""));
      setStarting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Make a video"
    >
      <div className="max-h-[92vh] w-full max-w-[480px] overflow-y-auto rounded-t-[20px] border border-line bg-raised p-5 sm:rounded-[20px]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Make a video</p>
            <h2 className="mt-1 text-[22px] font-semibold text-ink">{productName}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Type */}
        <fieldset className="mt-5">
          <legend className="eyebrow mb-2">What kind of video?</legend>
          <div className="flex flex-col gap-2">
            {VIDEO_TYPES.map((t, i) => (
              <button
                key={t.id}
                onClick={() => {
                  setVideoType(t.id);
                  setTouchedScript(false);
                }}
                aria-pressed={videoType === t.id}
                className={`${TINTS[i % 3]} rounded-[12px] p-3 text-left transition ${
                  videoType === t.id ? "ring-2 ring-[var(--cobalt)]" : "opacity-70 hover:opacity-100"
                }`}
              >
                <p className="text-[15px] font-semibold text-ink">{t.name}</p>
                <p className="mt-0.5 text-[13px] text-muted">{t.blurb}</p>
                <p className="mt-1 text-[12px] text-muted/80">{t.example}</p>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Length */}
        <fieldset className="mt-5">
          <legend className="eyebrow mb-2">How long?</legend>
          <div className="grid grid-cols-2 gap-2">
            {VIDEO_DURATIONS.map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDurationSec(d);
                  setTouchedScript(false);
                }}
                aria-pressed={durationSec === d}
                className={`rounded-[12px] border p-3 text-left ${
                  durationSec === d ? "border-[var(--cobalt)] bg-[var(--cobalt)]/10" : "border-line"
                }`}
              >
                <p className="text-[15px] font-semibold text-ink">{d} seconds</p>
                <p className="text-[12px] text-muted">{videoCostPerRatio(d)} credits per shape</p>
              </button>
            ))}
          </div>
        </fieldset>

        {/* Ratios */}
        <fieldset className="mt-5">
          <legend className="eyebrow mb-2">Which shapes? Each one is its own video.</legend>
          <div className="flex flex-col gap-2">
            {VIDEO_RATIOS.map((r) => {
              const on = ratios.includes(r.id);
              return (
                <label
                  key={r.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-[12px] border p-3 ${
                    on ? "border-[var(--magenta)] bg-[var(--magenta)]/10" : "border-line"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleRatio(r.id)}
                    className="h-4 w-4 accent-[var(--magenta)]"
                  />
                  <span className="flex-1">
                    <span className="block text-[15px] font-medium text-ink">
                      {r.name} · {r.id}
                    </span>
                    <span className="block text-[12px] text-muted">{r.where}</span>
                  </span>
                  <span className="text-[13px] text-muted">{perRatio}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Script */}
        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="eyebrow">What the voice says</span>
            <span className="text-[12px] text-muted">
              {script.length}/{cap}
            </span>
          </div>
          <textarea
            value={script}
            onChange={(e) => {
              setScript(e.target.value.slice(0, cap));
              setTouchedScript(true);
            }}
            rows={4}
            placeholder={drafting ? "Writing a draft…" : "Your voiceover"}
            className="w-full rounded-[12px] border border-line bg-base p-3 text-[15px] text-ink outline-none focus:border-[var(--cobalt)]"
          />
          <p className="mt-1 text-[12px] text-muted">
            {drafting ? "CowQ is drafting this for you…" : "Edit it however you like before generating."}
          </p>
        </div>

        {/* Cost */}
        <div className="card-amber mt-5 rounded-[12px] p-4">
          <p className="text-[13px] text-muted">
            {ratios.length} shape{ratios.length === 1 ? "" : "s"} × {perRatio} credits ({durationSec}s)
          </p>
          <p className="mt-1 text-[20px] font-semibold text-ink">{total} credits</p>
          <p className="mt-1 text-[12px] text-muted">
            You have {balance}. {short ? "That isn't enough yet." : `${balance - total} left after this.`}
          </p>
        </div>

        {error && <p className="mt-3 text-[13px] text-[var(--magenta)]">{error}</p>}

        <div className="mt-4 flex flex-col gap-2 pb-2">
          {short ? (
            <Link
              to="/pricing"
              className="flex h-14 w-full items-center justify-center rounded-[14px] bg-primary text-[16px] font-semibold text-primary-foreground"
            >
              Get more credits
            </Link>
          ) : (
            <button
              onClick={handleStart}
              disabled={starting || drafting || ratios.length === 0}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-primary text-[16px] font-semibold text-primary-foreground disabled:opacity-50"
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
              {starting ? "Starting…" : `Make video · ${total} credits`}
            </button>
          )}
          <p className="text-center text-[12px] text-muted">
            Videos take a minute or two. You can leave this page — we'll tell you when they're done.
          </p>
        </div>
      </div>
    </div>
  );
}
