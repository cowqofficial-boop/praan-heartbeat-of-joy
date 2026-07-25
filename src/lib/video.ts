// Shared, client-safe video vocabulary. No server imports here.
import { COSTS } from "./plans";

/**
 * Master switch. Video stays OFF until the fal.ai Kling endpoint is confirmed
 * working. Flip by setting VITE_VIDEO_ENABLED=true (browser) and
 * VIDEO_ENABLED=true (server) — both are checked so a half-flipped flag can
 * never charge someone for a video that can't run.
 */
export const VIDEO_ENABLED: boolean =
  String(import.meta.env.VITE_VIDEO_ENABLED ?? "").toLowerCase() === "true";

export type VideoType = "ad" | "usage" | "presenter";
export type VideoRatio = "9:16" | "1:1" | "16:9";
export type VideoDuration = 5 | 8;
export type VideoStatus = "queued" | "running" | "ready" | "failed" | "refunded";

export const VIDEO_TYPES: Array<{
  id: VideoType;
  name: string;
  blurb: string;
  example: string;
}> = [
  {
    id: "ad",
    name: "Advertisement",
    blurb: "Your product shown off with movement and an upbeat voice selling it.",
    example: "Best for Instagram Reels and marketplace banners.",
  },
  {
    id: "usage",
    name: "Usage",
    blurb: "The product being used in a real setting, so buyers see how it works.",
    example: "Best when people ask you how big it is or how it works.",
  },
  {
    id: "presenter",
    name: "Presenter",
    blurb: "A spokesperson on camera introducing and recommending your product.",
    example: "Clearly an advertisement — never a pretend customer review.",
  },
];

export const VIDEO_RATIOS: Array<{ id: VideoRatio; name: string; where: string }> = [
  { id: "9:16", name: "Tall", where: "Reels, Stories, WhatsApp status" },
  { id: "1:1", name: "Square", where: "Instagram feed, Facebook" },
  { id: "16:9", name: "Wide", where: "YouTube, Amazon, Flipkart" },
];

export const VIDEO_DURATIONS: VideoDuration[] = [5, 8];

/** Voiceover script caps — roughly what fits comfortably in the spoken time. */
export const SCRIPT_CAP: Record<VideoDuration, number> = { 5: 250, 8: 400 };

/** Credit price per shape (ratio). Each shape is its own generation. */
export function videoCostPerRatio(duration: VideoDuration): number {
  return duration === 8 ? COSTS.video_8s : COSTS.video_5s;
}

export function videoBatchCost(duration: VideoDuration, ratios: VideoRatio[]): number {
  return videoCostPerRatio(duration) * ratios.length;
}

export function videoTypeName(t: VideoType): string {
  return VIDEO_TYPES.find((v) => v.id === t)?.name ?? t;
}

export function ratioName(r: VideoRatio): string {
  return VIDEO_RATIOS.find((v) => v.id === r)?.name ?? r;
}

/** Aspect-ratio CSS value for preview players. */
export function ratioCss(r: VideoRatio): string {
  return r === "9:16" ? "9 / 16" : r === "16:9" ? "16 / 9" : "1 / 1";
}

/** Honest labelling shown under every generated video. */
export const VIDEO_DISCLAIMER =
  "AI-generated video. Check it represents your product accurately before posting.";
export const PRESENTER_DISCLAIMER =
  "AI presenter — this is promotional, not a real customer review.";

export function disclaimersFor(t: VideoType): string[] {
  return t === "presenter" ? [VIDEO_DISCLAIMER, PRESENTER_DISCLAIMER] : [VIDEO_DISCLAIMER];
}
