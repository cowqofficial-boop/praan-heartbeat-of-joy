/**
 * fal.ai — Kling 2.6 Pro image-to-video with native audio.
 *
 * Server-only. Nothing here may be imported from a component or a
 * *.functions.ts module scope; load it inside a handler.
 *
 * The queue API is used (submit → poll → fetch result) because Kling runs
 * well past any single HTTP request's patience. A hard deadline is enforced
 * by the caller.
 */

const FAL_QUEUE = "https://queue.fal.run";
export const KLING_MODEL = "fal-ai/kling-video/v2.6/pro/image-to-video";

export type KlingRatio = "9:16" | "1:1" | "16:9";

function key(): string {
  const k = process.env.FAL_KEY;
  if (!k) throw new Error("VIDEO_NOT_CONFIGURED");
  return k;
}

function headers(): Record<string, string> {
  return {
    Authorization: `Key ${key()}`,
    "Content-Type": "application/json",
  };
}

async function readError(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  return `fal ${res.status}: ${body.slice(0, 600)}`;
}

export type SubmitArgs = {
  imageUrl: string;
  prompt: string;
  script: string;
  durationSec: 5 | 8;
  ratio: KlingRatio;
  negativePrompt?: string;
};

/** Put a job on fal's queue. Returns the request id to poll. */
export async function klingSubmit(args: SubmitArgs): Promise<string> {
  const res = await fetch(`${FAL_QUEUE}/${KLING_MODEL}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      image_url: args.imageUrl,
      prompt: args.prompt,
      duration: String(args.durationSec),
      aspect_ratio: args.ratio,
      generate_audio: true,
      audio_prompt: args.script,
      negative_prompt:
        args.negativePrompt ??
        "distorted product, changed logo, changed colours, extra limbs, text artefacts, watermark, children, blurry",
    }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const json = (await res.json()) as { request_id?: string };
  if (!json.request_id) throw new Error("fal: no request_id returned");
  return json.request_id;
}

export type KlingStatus =
  | { state: "pending" }
  | { state: "done"; videoUrl: string }
  | { state: "error"; message: string };

/** One poll of an in-flight fal job. */
export async function klingPoll(requestId: string): Promise<KlingStatus> {
  const statusRes = await fetch(
    `${FAL_QUEUE}/${KLING_MODEL}/requests/${requestId}/status`,
    { headers: headers() },
  );
  if (!statusRes.ok) return { state: "error", message: await readError(statusRes) };
  const status = (await statusRes.json()) as { status?: string };

  if (status.status === "COMPLETED") {
    const res = await fetch(`${FAL_QUEUE}/${KLING_MODEL}/requests/${requestId}`, {
      headers: headers(),
    });
    if (!res.ok) return { state: "error", message: await readError(res) };
    const out = (await res.json()) as { video?: { url?: string }; error?: unknown };
    const url = out?.video?.url;
    if (!url) return { state: "error", message: "fal: finished with no video url" };
    return { state: "done", videoUrl: url };
  }

  if (status.status === "IN_QUEUE" || status.status === "IN_PROGRESS") {
    return { state: "pending" };
  }
  return { state: "error", message: `fal: unexpected status ${status.status ?? "unknown"}` };
}

/** Best-effort cancel so an abandoned job doesn't keep burning provider time. */
export async function klingCancel(requestId: string): Promise<void> {
  try {
    await fetch(`${FAL_QUEUE}/${KLING_MODEL}/requests/${requestId}/cancel`, {
      method: "PUT",
      headers: headers(),
    });
  } catch {
    /* best effort */
  }
}
