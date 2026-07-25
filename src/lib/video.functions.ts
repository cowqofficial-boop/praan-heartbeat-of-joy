import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  SCRIPT_CAP,
  videoCostPerRatio,
  type VideoDuration,
  type VideoRatio,
  type VideoType,
  type VideoStatus,
} from "./video";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function serverVideoEnabled(): boolean {
  return String(process.env.VIDEO_ENABLED ?? "").toLowerCase() === "true";
}

export type ProductVideo = {
  id: string;
  generation_id: string;
  batch_id: string;
  video_type: VideoType;
  duration_sec: VideoDuration;
  ratio: VideoRatio;
  script: string;
  status: VideoStatus;
  video_url: string | null;
  error: string | null;
  created_at: string;
};

// ---------- Script drafting ----------

const TYPE_BRIEF: Record<VideoType, string> = {
  ad: "A short advertisement. Sell the product with energy: what it is, one thing that makes it worth buying, and a nudge to order. Upbeat but plain-spoken.",
  usage:
    "A short demonstration. Describe the product being used in an ordinary Indian home or shop, so a buyer understands how it works and how big it is.",
  presenter:
    "A short spokesperson advertisement. The presenter is openly advertising on behalf of the shop — they INTRODUCE and RECOMMEND the product. Open with a line like 'Meet the…', 'Introducing…' or 'Here's why we love…'. NEVER write it as a customer's own experience — no 'I bought this', no 'I've been using this for weeks', no pretend review. It must read as an advertisement.",
};

export const draftVideoScript = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { generationId: string; videoType: VideoType; durationSec: VideoDuration }) => d,
  )
  .handler(async ({ context, data }) => {
    const cap = SCRIPT_CAP[data.durationSec] ?? 250;
    const { data: gen } = await context.supabase
      .from("generations")
      .select("product_name, category, detail, price, copy")
      .eq("id", data.generationId)
      .eq("user_id", context.userId)
      .maybeSingle();

    const name = (gen?.product_name as string) || "this product";
    const category = (gen?.category as string) || "";
    const detail = (gen?.detail as string) || "";
    const copy = (gen?.copy ?? {}) as { description?: string; bullets?: string[] };
    const facts = [detail, copy.description, ...(copy.bullets ?? [])]
      .filter(Boolean)
      .join(" ")
      .slice(0, 700);

    const fallback = `Meet the ${name}. ${detail || category || "Made to last, priced for real shops."} Order yours today.`.slice(0, cap);

    try {
      const { geminiGenerateText } = await import("./gemini.server");
      const out = await geminiGenerateText(
        `You write voiceover scripts for a small Indian shop's product videos. Write ONE English voiceover script for a ${data.durationSec}-second video.

${TYPE_BRIEF[data.videoType]}

Product: ${name}${category ? ` (${category})` : ""}
What the shopkeeper says about it: ${facts || "no extra detail given"}

Rules:
- Hard limit ${cap} characters, including spaces. Shorter is fine.
- Plain spoken English an Indian shopkeeper would actually say out loud. No jargon, no "elevate your lifestyle", no hype words.
- Concrete facts only — never invent materials, sizes, guarantees or discounts.
- No hashtags, no emoji, no stage directions, no speaker labels. Just the words to be spoken.
- This is an advertisement. Never pretend to be an independent customer or a review.

Return only the script text.`,
      );
      const cleaned = String(out || "")
        .replace(/^["'\s]+|["'\s]+$/g, "")
        .replace(/\s+/g, " ")
        .slice(0, cap);
      return { script: cleaned || fallback, cap };
    } catch {
      return { script: fallback, cap };
    }
  });

// ---------- Starting a batch (this is where credits are spent) ----------

export const startVideoBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      generationId: string;
      videoType: VideoType;
      durationSec: VideoDuration;
      ratios: VideoRatio[];
      script: string;
    }) => d,
  )
  .handler(async ({ context, data }) => {
    if (!serverVideoEnabled()) throw new Error("VIDEO_DISABLED");

    const ratios = Array.from(new Set(data.ratios)).filter((r) =>
      ["9:16", "1:1", "16:9"].includes(r),
    ) as VideoRatio[];
    if (ratios.length === 0) throw new Error("Pick at least one shape.");
    const duration: VideoDuration = data.durationSec === 8 ? 8 : 5;
    const cap = SCRIPT_CAP[duration];
    const script = String(data.script || "").trim().slice(0, cap);
    if (!script) throw new Error("Write a script first.");

    // The product must be theirs.
    const { data: gen } = await context.supabase
      .from("generations")
      .select("id, product_name, generated_images, original_image_url")
      .eq("id", data.generationId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!gen) throw new Error("That product isn't in your library.");

    const perRatio = videoCostPerRatio(duration);
    const total = perRatio * ratios.length;

    const sb = await admin();
    const { data: rows, error: spendErr } = await sb.rpc("spend_credits", {
      _user_id: context.userId,
      _amount: total,
    });
    if (spendErr) throw new Error(`credit check failed: ${spendErr.message}`);
    const spend = Array.isArray(rows) ? rows[0] : rows;
    if (!spend?.ok) throw new Error(`NO_CREDITS:${total}:${spend?.balance ?? 0}`);

    // Split what was actually taken across the ratios so a single failed shape
    // refunds exactly its own share.
    const tookSub = spend.took_sub ?? 0;
    const tookPack = spend.took_pack ?? 0;
    const shares: Array<{ sub: number; pack: number }> = [];
    let subLeft = tookSub;
    let packLeft = tookPack;
    ratios.forEach((_, i) => {
      const last = i === ratios.length - 1;
      const sub = last ? subLeft : Math.min(subLeft, perRatio);
      const pack = last ? packLeft : Math.min(packLeft, perRatio - sub);
      subLeft -= sub;
      packLeft -= pack;
      shares.push({ sub, pack });
    });

    const batchId = crypto.randomUUID();
    const insert = ratios.map((ratio, i) => ({
      user_id: context.userId,
      generation_id: data.generationId,
      batch_id: batchId,
      video_type: data.videoType,
      duration_sec: duration,
      ratio,
      script,
      status: "queued",
      credits_spent: perRatio,
      refund_sub: shares[i].sub,
      refund_pack: shares[i].pack,
    }));

    const { data: created, error } = await sb
      .from("product_videos")
      .insert(insert)
      .select("id, ratio");
    if (error) {
      await sb.rpc("refund_credits", { _user_id: context.userId, _sub: tookSub, _pack: tookPack });
      throw new Error(`Could not start: ${error.message}`);
    }

    console.info(
      `[video] batch=${batchId} user=${context.userId} type=${data.videoType} ${duration}s ratios=${ratios.join(",")} cost=${total}`,
    );

    return {
      batchId,
      cost: total,
      perRatio,
      jobs: (created ?? []).map((r) => ({ id: r.id as string, ratio: r.ratio as VideoRatio })),
    };
  });

// ---------- Running one shape ----------

const HARD_TIMEOUT_MS = 8 * 60 * 1000;
const POLL_MS = 6000;

const SCENE: Record<VideoType, string> = {
  ad: "A product advertisement. Keep the product exactly as it appears in the reference photo — same shape, same colours, same pattern, same logo. Slow deliberate camera movement around the product on a simple real surface with natural window light. No people. Real materials and visible texture.",
  usage:
    "A demonstration shot. Keep the product exactly as it appears in the reference photo — same shape, same colours, same pattern. Show it being used naturally in an ordinary Indian home or small shop with simple everyday props and natural window light. Adult hands only, no children, no faces in close-up.",
  presenter:
    "A spokesperson advertisement. One clearly adult presenter, 25 to 45 years old, speaking to camera and holding or gesturing towards the product. The product must stay exactly as it appears in the reference photo — same shape, same colours, same pattern, same logo. Natural indoor light, simple real background. This is an advertisement by the shop, not a customer testimonial. No children.",
};

async function markFailedAndRefund(videoId: string, message: string) {
  const sb = await admin();
  const { data: row } = await sb
    .from("product_videos")
    .select("user_id, refund_sub, refund_pack, refunded")
    .eq("id", videoId)
    .maybeSingle();
  if (row && !row.refunded) {
    try {
      await sb.rpc("refund_credits", {
        _user_id: row.user_id,
        _sub: row.refund_sub ?? 0,
        _pack: row.refund_pack ?? 0,
      });
    } catch {
      /* refund is best effort; status still reflects the failure */
    }
  }
  await sb
    .from("product_videos")
    .update({ status: "refunded", refunded: true, error: message.slice(0, 500) })
    .eq("id", videoId);
}

/**
 * Runs one shape end-to-end. Called from the background runner.
 * On a real provider error it retries ONCE for free; a second failure refunds
 * that shape's credits. Never retries for subjective quality.
 */
export const runVideoJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { videoId: string }) => d)
  .handler(async ({ context, data }) => {
    const sb = await admin();
    const { data: job } = await sb
      .from("product_videos")
      .select("id, user_id, generation_id, video_type, duration_sec, ratio, script, status, attempts")
      .eq("id", data.videoId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!job) throw new Error("That video job isn't yours.");
    if (job.status === "ready") return { status: "ready" as const };
    if (job.status === "refunded" || job.status === "failed") {
      return { status: job.status as VideoStatus };
    }

    if (!serverVideoEnabled()) {
      await markFailedAndRefund(job.id, "Video is not switched on yet.");
      return { status: "refunded" as const, error: "Video is not switched on yet." };
    }

    // Best product photo as the image reference, so the real product appears.
    const { data: gen } = await sb
      .from("generations")
      .select("product_name, category, generated_images, original_image_url")
      .eq("id", job.generation_id)
      .maybeSingle();
    const images = (gen?.generated_images ?? []) as Array<{ kind: string; url: string }>;
    const imageUrl =
      images.find((i) => i.kind === "white")?.url ??
      images.find((i) => i.kind === "lifestyle")?.url ??
      images[0]?.url ??
      (gen?.original_image_url as string | null) ??
      "";
    if (!imageUrl) {
      await markFailedAndRefund(job.id, "This product has no photo to build a video from.");
      return { status: "refunded" as const, error: "This product has no photo to build a video from." };
    }

    const type = job.video_type as VideoType;
    const prompt = `${SCENE[type]} Product: ${gen?.product_name ?? "product"}${gen?.category ? ` (${gen.category})` : ""}. Spoken English voiceover with soft background music. Never idealize or change the product. Shot on an 85mm lens, natural light, real texture, no gloss, no HDR, no cinematic colour grading.`;

    const { klingSubmit, klingPoll, klingCancel } = await import("./fal.server");

    async function attempt(): Promise<string> {
      const requestId = await klingSubmit({
        imageUrl,
        prompt,
        script: job!.script as string,
        durationSec: (job!.duration_sec === 8 ? 8 : 5) as 5 | 8,
        ratio: job!.ratio as VideoRatio,
      });
      await sb
        .from("product_videos")
        .update({ status: "running", provider_request_id: requestId })
        .eq("id", job!.id);

      const deadline = Date.now() + HARD_TIMEOUT_MS;
      for (;;) {
        if (Date.now() > deadline) {
          await klingCancel(requestId);
          throw new Error("Timed out waiting for the video.");
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
        const s = await klingPoll(requestId);
        if (s.state === "done") return s.videoUrl;
        if (s.state === "error") throw new Error(s.message);
      }
    }

    let lastError = "";
    for (let tries = 0; tries < 2; tries++) {
      await sb
        .from("product_videos")
        .update({ status: "running", attempts: (job.attempts ?? 0) + tries + 1 })
        .eq("id", job.id);
      try {
        const videoUrl = await attempt();
        await sb
          .from("product_videos")
          .update({ status: "ready", video_url: videoUrl, error: null })
          .eq("id", job.id);
        console.info(`[video] ready id=${job.id} ratio=${job.ratio}`);
        return { status: "ready" as const, videoUrl };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`[video] attempt ${tries + 1} failed id=${job.id}: ${lastError}`);
      }
    }

    await markFailedAndRefund(job.id, lastError || "The video engine did not respond.");
    return {
      status: "refunded" as const,
      error: "That one didn't work — your credits are back. Try again.",
    };
  });

// ---------- Reading and removing ----------

export const listProductVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { generationId: string }) => d)
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase
      .from("product_videos")
      .select(
        "id, generation_id, batch_id, video_type, duration_sec, ratio, script, status, video_url, error, created_at",
      )
      .eq("generation_id", data.generationId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []) as ProductVideo[];
  });

export const deleteProductVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("product_videos")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
