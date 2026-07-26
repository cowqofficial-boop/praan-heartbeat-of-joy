// Brand memory server functions. Client-reachable, so nothing server-only is
// imported at module scope.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  DEFAULT_BRAND_MEMORY,
  mergeBrandMemory,
  type BrandMemory,
} from "@/lib/brand-memory";

const s = (max: number) => z.string().trim().max(max).default("");

const memorySchema = z.object({
  identity: z
    .object({
      what_we_sell: s(300),
      who_we_serve: s(300),
      what_makes_us_different: s(400),
      promise: s(300),
      city: s(120),
    })
    .partial()
    .optional(),
  voice: z
    .object({
      tone: s(40),
      formality: s(40),
      energy: s(40),
      language_mix: s(40),
      emoji: s(40),
      sentence_length: s(40),
    })
    .partial()
    .optional(),
  comms: z
    .object({
      greeting: s(160),
      sign_off: s(160),
      cta_style: s(40),
      price_style: s(40),
      favourite_words: s(400),
      banned_words: s(400),
    })
    .partial()
    .optional(),
  photos: z
    .object({
      look: s(40),
      surface: s(300),
      mood: s(40),
      props: s(40),
      avoid: s(300),
    })
    .partial()
    .optional(),
});

export type BrandMemoryRecord = {
  memory: BrandMemory;
  version: number;
  last_confirmed_at: string | null;
  updated_at: string | null;
};

export const getMyBrandMemory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BrandMemoryRecord> => {
    const { data } = await context.supabase
      .from("brand_memory")
      .select("prefs, version, last_confirmed_at, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!data) {
      // Seed from the brand kit so the seller doesn't retype what they already told us.
      const { data: kit } = await context.supabase
        .from("brand_kits")
        .select("sells_what, sells_to, tone")
        .eq("user_id", context.userId)
        .maybeSingle();
      const seeded: BrandMemory = {
        ...DEFAULT_BRAND_MEMORY,
        identity: {
          ...DEFAULT_BRAND_MEMORY.identity,
          what_we_sell: (kit?.sells_what as string) || "",
          who_we_serve: (kit?.sells_to as string) || "",
        },
        voice: {
          ...DEFAULT_BRAND_MEMORY.voice,
          tone: (kit?.tone as string) || DEFAULT_BRAND_MEMORY.voice.tone,
        },
      };
      return { memory: seeded, version: 0, last_confirmed_at: null, updated_at: null };
    }

    return {
      memory: mergeBrandMemory(data.prefs),
      version: data.version ?? 1,
      last_confirmed_at: data.last_confirmed_at ?? null,
      updated_at: data.updated_at ?? null,
    };
  });

export const saveMyBrandMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => memorySchema.parse(d))
  .handler(async ({ data, context }): Promise<BrandMemoryRecord> => {
    const { data: existing } = await context.supabase
      .from("brand_memory")
      .select("prefs, version, history")
      .eq("user_id", context.userId)
      .maybeSingle();

    const current = mergeBrandMemory(existing?.prefs);
    const next = mergeBrandMemory({
      identity: { ...current.identity, ...(data.identity ?? {}) },
      voice: { ...current.voice, ...(data.voice ?? {}) },
      comms: { ...current.comms, ...(data.comms ?? {}) },
      photos: { ...current.photos, ...(data.photos ?? {}) },
    });

    const version = (existing?.version ?? 0) + 1;
    const history = Array.isArray(existing?.history) ? existing.history : [];
    const trimmed = [
      { at: new Date().toISOString(), version, prefs: current },
      ...history,
    ].slice(0, 10);

    const { error } = await context.supabase.from("brand_memory").upsert(
      {
        user_id: context.userId,
        prefs: next,
        version,
        history: trimmed,
        last_confirmed_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);

    return {
      memory: next,
      version,
      last_confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

const signalSchema = z.object({
  event_type: z.enum(["edited", "regenerated", "copied", "posted", "deleted"]),
  surface: z.string().trim().max(40),
  generation_id: z.string().uuid().nullish(),
  original_text: z.string().max(4000).nullish(),
  edited_text: z.string().max(4000).nullish(),
});

/**
 * Fire-and-forget learning signal. Never throws at the call site — a failed
 * log must never break a generation flow.
 */
export const recordBrandSignal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => signalSchema.parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("brand_memory_events").insert({
      user_id: context.userId,
      event_type: data.event_type,
      surface: data.surface,
      generation_id: data.generation_id ?? null,
      original_text: data.original_text ?? null,
      edited_text: data.edited_text ?? null,
    });
    return { ok: true };
  });

export type BrandMemoryInsights = {
  total: number;
  edits: number;
  regenerates: number;
  copies: number;
  topSurface: string | null;
};

export const getBrandMemoryInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BrandMemoryInsights> => {
    const { data } = await context.supabase
      .from("brand_memory_events")
      .select("event_type, surface")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(500);

    const rows = data ?? [];
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.surface, (counts.get(r.surface) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      total: rows.length,
      edits: rows.filter((r) => r.event_type === "edited").length,
      regenerates: rows.filter((r) => r.event_type === "regenerated").length,
      copies: rows.filter((r) => r.event_type === "copied").length,
      topSurface: top?.[0] ?? null,
    };
  });
