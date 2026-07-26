// Server-only: loads a seller's brand memory and turns it into prompt text.
import { mergeBrandMemory, buildVoicePrompt, buildPhotoPrompt } from "@/lib/brand-memory";

export type BrandMemoryContext = { voice: string; photo: string };

const EMPTY: BrandMemoryContext = { voice: "", photo: "" };

/**
 * Never throws — a missing or broken memory row must not stop a generation.
 */
export async function loadBrandMemoryContext(
  userId?: string | null,
): Promise<BrandMemoryContext> {
  if (!userId) return EMPTY;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("brand_memory")
      .select("prefs")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return EMPTY;
    const memory = mergeBrandMemory(data.prefs);
    return { voice: buildVoicePrompt(memory), photo: buildPhotoPrompt(memory) };
  } catch {
    return EMPTY;
  }
}
