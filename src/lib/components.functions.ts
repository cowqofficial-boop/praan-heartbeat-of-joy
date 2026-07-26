// Server functions for modular editing.
//
// Manual edits are free. AI actions go through the one canonical credit
// pipeline (spend_credits) and are refunded automatically if the model fails,
// leaving the seller's existing content untouched.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { ComponentContent, GenerationComponent } from "./components";
import { defFor } from "./components";
import { COSTS } from "./plans";

const contentSchema = z.object({
  text: z.string().max(8000).optional(),
  items: z.array(z.string().max(400)).max(40).optional(),
  url: z.string().max(2000).optional(),
  kind: z.string().max(60).optional(),
  ratios: z.array(z.string().max(10)).max(6).optional(),
});

/** Loads every component of a generation, creating any that don't exist yet. */
export const listComponents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ generationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { loadOwnedGeneration, syncComponents } = await import("./components.server");
    const row = await loadOwnedGeneration(context.supabase, data.generationId, context.userId);
    await syncComponents(context.supabase, row, context.userId);

    const { data: rows, error } = await context.supabase
      .from("generation_components")
      .select("id, generation_id, component_type, component_key, content, updated_by, updated_at, credits_spent_total")
      .eq("generation_id", data.generationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r) => r.id);
    const counts = new Map<string, number>();
    if (ids.length > 0) {
      const { data: versions } = await context.supabase
        .from("generation_component_versions")
        .select("component_id")
        .in("component_id", ids);
      for (const v of versions ?? []) counts.set(v.component_id, (counts.get(v.component_id) ?? 0) + 1);
    }

    return (rows ?? []).map<GenerationComponent>((r) => ({
      id: r.id,
      generationId: r.generation_id,
      type: r.component_type,
      key: r.component_key,
      content: (r.content ?? {}) as ComponentContent,
      updatedBy: (r.updated_by as "ai" | "seller") ?? "ai",
      updatedAt: r.updated_at,
      creditsSpentTotal: r.credits_spent_total ?? 0,
      versionCount: counts.get(r.id) ?? 0,
    }));
  });

/** A manual edit. Always free. */
export const saveComponent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ componentId: z.string().uuid(), content: contentSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { loadOwnedGeneration, mirrorToGeneration, pushVersion } = await import("./components.server");
    const { data: comp, error } = await context.supabase
      .from("generation_components")
      .select("id, generation_id, component_type, component_key, content")
      .eq("id", data.componentId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!comp) throw new Error("That part was not found.");

    const row = await loadOwnedGeneration(context.supabase, comp.generation_id, context.userId);
    const previous = (comp.content ?? {}) as ComponentContent;
    await pushVersion(context.supabase, comp.id, context.userId, previous, "seller", 0);

    const { error: upErr } = await context.supabase
      .from("generation_components")
      .update({ content: data.content as never, updated_by: "seller" })
      .eq("id", comp.id)
      .eq("user_id", context.userId);
    if (upErr) throw new Error(upErr.message);

    await mirrorToGeneration(context.supabase, row, comp.component_type, comp.component_key, data.content);

    // Learning signal — never blocks the save.
    const def = defFor(comp.component_type);
    if (def.shape !== "image") {
      const before = def.shape === "list" ? (previous.items ?? []).join("\n") : (previous.text ?? "");
      const after = def.shape === "list" ? (data.content.items ?? []).join("\n") : (data.content.text ?? "");
      if (before !== after) {
        await context.supabase.from("brand_memory_events").insert({
          user_id: context.userId,
          event_type: "edited",
          surface: comp.component_type,
          generation_id: comp.generation_id,
          original_text: before.slice(0, 4000),
          edited_text: after.slice(0, 4000),
        });
      }
    }
    return { ok: true };
  });

/** One AI action on one component. Everything else stays exactly as it is. */
export const regenerateComponent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        componentId: z.string().uuid(),
        action: z.string().trim().min(1).max(40),
        instruction: z.string().trim().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const {
      loadOwnedGeneration,
      mirrorToGeneration,
      pushVersion,
      regenerateImageComponent,
      regenerateTextComponent,
      safeInstruction,
    } = await import("./components.server");

    const { data: comp, error } = await context.supabase
      .from("generation_components")
      .select("id, generation_id, component_type, component_key, content, credits_spent_total")
      .eq("id", data.componentId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!comp) throw new Error("That part was not found.");

    const def = defFor(comp.component_type);
    const action =
      def.shape === "image"
        ? COSTS.regen_image
        : comp.component_type === "hashtags"
          ? COSTS.regen_hashtags
          : COSTS.rewrite_component;
    const actionKey =
      def.shape === "image" ? "regen_image" : comp.component_type === "hashtags" ? "regen_hashtags" : "rewrite_component";

    const row = await loadOwnedGeneration(context.supabase, comp.generation_id, context.userId);
    const previous = (comp.content ?? {}) as ComponentContent;
    const instruction = await safeInstruction(data.instruction);

    const { spendOrThrow, refundSpend } = await import("./credits.server");
    const spend = await spendOrThrow(context.userId, actionKey as never);

    try {
      const next =
        def.shape === "image"
          ? await regenerateImageComponent({
              row,
              imageKind: comp.component_key ?? "white",
              action: data.action,
              instruction,
              userId: context.userId,
            })
          : await regenerateTextComponent({
              row,
              componentType: comp.component_type,
              shape: def.shape,
              current: previous,
              action: data.action,
              instruction,
              userId: context.userId,
            });

      await pushVersion(context.supabase, comp.id, context.userId, previous, "ai", 0);
      const { error: upErr } = await context.supabase
        .from("generation_components")
        .update({
          content: next as never,
          updated_by: "ai",
          credits_spent_total: (comp.credits_spent_total ?? 0) + action,
        })
        .eq("id", comp.id)
        .eq("user_id", context.userId);
      if (upErr) throw new Error(upErr.message);

      await mirrorToGeneration(context.supabase, row, comp.component_type, comp.component_key, next);

      await context.supabase.from("brand_memory_events").insert({
        user_id: context.userId,
        event_type: "regenerated",
        surface: comp.component_type,
        generation_id: comp.generation_id,
      });

      return { content: next, creditsSpent: action };
    } catch (err) {
      // The old content is still in place — give the credits back.
      await refundSpend(context.userId, spend).catch(() => {});
      throw err;
    }
  });

/** Puts one earlier version back. Free, and it touches nothing else. */
export const restoreComponentVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ versionId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { loadOwnedGeneration, mirrorToGeneration, pushVersion } = await import("./components.server");
    const { data: version, error } = await context.supabase
      .from("generation_component_versions")
      .select("id, component_id, content")
      .eq("id", data.versionId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!version) throw new Error("That version was not found.");

    const { data: comp, error: compErr } = await context.supabase
      .from("generation_components")
      .select("id, generation_id, component_type, component_key, content")
      .eq("id", version.component_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (compErr) throw new Error(compErr.message);
    if (!comp) throw new Error("That part was not found.");

    const row = await loadOwnedGeneration(context.supabase, comp.generation_id, context.userId);
    await pushVersion(context.supabase, comp.id, context.userId, (comp.content ?? {}) as ComponentContent, "seller", 0);

    const restored = (version.content ?? {}) as ComponentContent;
    const { error: upErr } = await context.supabase
      .from("generation_components")
      .update({ content: restored as never, updated_by: "seller" })
      .eq("id", comp.id)
      .eq("user_id", context.userId);
    if (upErr) throw new Error(upErr.message);

    await mirrorToGeneration(context.supabase, row, comp.component_type, comp.component_key, restored);
    return { content: restored };
  });

/** Version history for one component, newest first. */
export const listComponentVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ componentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("generation_component_versions")
      .select("id, content, source, credits_spent, created_at")
      .eq("component_id", data.componentId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      content: (r.content ?? {}) as ComponentContent,
      source: (r.source as "ai" | "seller") ?? "ai",
      creditsSpent: r.credits_spent ?? 0,
      createdAt: r.created_at,
    }));
  });
