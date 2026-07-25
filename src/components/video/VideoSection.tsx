import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Film, Loader2, Trash2 } from "lucide-react";
import { deleteProductVideo, listProductVideos } from "@/lib/video.functions";
import {
  VIDEO_ENABLED,
  disclaimersFor,
  ratioCss,
  ratioName,
  videoTypeName,
  type VideoType,
} from "@/lib/video";
import { useVideoQueue } from "@/lib/video-queue-store";
import { VideoSetupDialog } from "./VideoSetupDialog";

const TINTS = ["card-cobalt", "card-magenta", "card-amber"] as const;

export function VideoSection({
  generationId,
  productName,
  hasAccount,
}: {
  generationId: string;
  productName: string;
  hasAccount: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Select the raw array — a selector that builds a NEW array on every call
  // makes zustand v5's useSyncExternalStore snapshot unstable and loops forever.
  const jobs = useVideoQueue((s) => s.jobs);
  const queued = useMemo(
    () =>
      jobs.filter(
        (j) => j.generationId === generationId && (j.status === "waiting" || j.status === "running"),
      ),
    [jobs, generationId],
  );

  const remove = useServerFn(deleteProductVideo);
  const { data: videos = [], refetch } = useQuery({
    queryKey: ["product-videos", generationId],
    queryFn: () => listProductVideos({ data: { generationId } }),
    enabled: hasAccount && VIDEO_ENABLED,
    refetchInterval: queued.length > 0 ? 10_000 : false,
  });

  if (!VIDEO_ENABLED || !hasAccount) return null;

  const ready = videos.filter((v) => v.status === "ready" && v.video_url);
  const failed = videos.filter((v) => v.status === "refunded" || v.status === "failed");

  async function handleDelete(id: string) {
    await remove({ data: { id } });
    void refetch();
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Videos</p>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] font-medium text-ink hover:border-[var(--cobalt)]"
        >
          <Film className="h-4 w-4" style={{ color: "var(--cobalt)" }} />
          Make a video
        </button>
      </div>

      {queued.length > 0 && (
        <div className="card-amber rounded-[12px] p-4">
          <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
            <Loader2 className="h-4 w-4 animate-spin" />
            Making {queued.length} video{queued.length === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-[12px] text-muted">
            {queued.map((j) => `${ratioName(j.ratio)} ${j.ratio}`).join(", ")} — you can leave this page.
          </p>
        </div>
      )}

      {ready.length === 0 && queued.length === 0 && (
        <div className="card-cobalt rounded-[12px] p-4">
          <p className="text-[14px] font-medium text-ink">Turn this product into a short video.</p>
          <p className="mt-1 text-[13px] text-muted">
            An ad, a demonstration, or a presenter recommending it — with an English voiceover.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ready.map((v, i) => (
          <div key={v.id} className={`${TINTS[i % 3]} rounded-[12px] p-3`}>
            <video
              src={v.video_url!}
              controls
              playsInline
              preload="metadata"
              className="w-full rounded-[10px] bg-black"
              style={{ aspectRatio: ratioCss(v.ratio) }}
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[13px] text-ink">
                {videoTypeName(v.video_type as VideoType)} · {ratioName(v.ratio)} {v.ratio} ·{" "}
                {v.duration_sec}s
              </p>
              <div className="flex items-center gap-1">
                <a
                  href={v.video_url!}
                  download={`${productName}-${v.video_type}-${v.ratio.replace(":", "x")}.mp4`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Download video"
                  className="rounded-full p-2 text-muted hover:text-ink"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => handleDelete(v.id)}
                  aria-label="Delete video"
                  className="rounded-full p-2 text-muted hover:text-ink"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {disclaimersFor(v.video_type as VideoType).map((d) => (
              <p key={d} className="mt-1 text-[11px] leading-snug text-muted/80">
                {d}
              </p>
            ))}
          </div>
        ))}
      </div>

      {failed.map((v) => (
        <p key={v.id} className="text-[13px] text-muted">
          {ratioName(v.ratio)} {v.ratio} — that one didn't work. Your credits are back. Try again.
        </p>
      ))}

      {open && (
        <VideoSetupDialog
          generationId={generationId}
          productName={productName}
          onClose={() => {
            setOpen(false);
            void refetch();
          }}
        />
      )}
    </section>
  );
}
