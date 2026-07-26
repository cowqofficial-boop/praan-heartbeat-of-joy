// Storage retention. Server-only.
// Free plans keep generated image files for a limited window; after that the
// files are removed from storage while the product record itself is kept, so
// the seller can still see the product and regenerate the photos.

const BUCKET = "praan";

/** Pulls the object path out of a Supabase signed/public storage URL. */
function pathFromUrl(url: string): string | null {
  const m = /\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\/([^?]+)/.exec(url);
  if (!m || m[1] !== BUCKET) return null;
  try {
    return decodeURIComponent(m[2]);
  } catch {
    return m[2];
  }
}

type ImageEntry = { url?: string } | string;

export async function pruneExpiredGeneratedFiles(
  userId: string,
  retentionDays: number,
): Promise<{ rows: number; files: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabaseAdmin
    .from("generations")
    .select("id, generated_images, gen_metadata, created_at")
    .eq("user_id", userId)
    .lt("created_at", cutoff)
    .limit(200);
  if (error || !rows?.length) return { rows: 0, files: 0 };

  let files = 0;
  let touched = 0;

  for (const row of rows) {
    const meta = (row.gen_metadata ?? {}) as Record<string, unknown>;
    if (meta.images_purged) continue;
    const imgs = Array.isArray(row.generated_images) ? (row.generated_images as ImageEntry[]) : [];
    const paths = Array.from(
      new Set(
        imgs
          .map((i) => (typeof i === "string" ? i : i?.url))
          .filter((u): u is string => typeof u === "string")
          .map(pathFromUrl)
          .filter((p): p is string => !!p),
      ),
    );
    if (paths.length) {
      const { error: rmErr } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
      if (rmErr) {
        console.error("[retention] remove failed", rmErr.message);
        continue;
      }
      files += paths.length;
    }
    const { error: updErr } = await supabaseAdmin
      .from("generations")
      .update({
        generated_images: [],
        gen_metadata: {
          ...meta,
          images_purged: true,
          purged_at: new Date().toISOString(),
          purged_count: paths.length,
        },
      })
      .eq("id", row.id);
    if (!updErr) touched += 1;
  }

  if (touched) console.info(`[retention] pruned user=${userId} rows=${touched} files=${files}`);
  return { rows: touched, files };
}
