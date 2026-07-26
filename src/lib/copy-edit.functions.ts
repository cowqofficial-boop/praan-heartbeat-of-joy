// Saving seller edits to generated copy — and quietly learning from them.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const schema = z.object({
  id: z.string().uuid(),
  field: z.enum([
    "seoTitle",
    "description",
    "bullets",
    "tags",
    "instagram",
    "instagramHashtags",
    "whatsapp",
    "festival",
  ]),
  value: z.union([z.string().max(6000), z.array(z.string().max(400)).max(30)]),
  surface: z.string().trim().max(40).default("listing"),
  originalText: z.string().max(6000).default(""),
  editedText: z.string().max(6000).default(""),
});

/**
 * Rewrites one block of a generation's copy and logs the change as a brand
 * memory signal, so CowQ can see where its writing keeps missing.
 */
export const updateGenerationCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("generations")
      .select("copy")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("That item was not found.");

    const copy = { ...((row.copy as Record<string, unknown>) ?? {}), [data.field]: data.value };

    const { error: upErr } = await context.supabase
      .from("generations")
      .update({ copy })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (upErr) throw new Error(upErr.message);

    if (data.originalText !== data.editedText) {
      await context.supabase.from("brand_memory_events").insert({
        user_id: context.userId,
        event_type: "edited",
        surface: data.surface,
        generation_id: data.id,
        original_text: data.originalText.slice(0, 4000),
        edited_text: data.editedText.slice(0, 4000),
      });
    }

    return { ok: true };
  });
