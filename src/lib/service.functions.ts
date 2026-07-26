import { createServerFn } from "@tanstack/react-start";

/**
 * Generates everything for one service: a promotional poster, listing copy,
 * captions, and the booking CTA — then saves it into the same `generations`
 * table products use, tagged `kind: 'service'`.
 *
 * Credits are reserved by `startGenerationJob` (the single canonical
 * spend_credits path) before this runs, and refunded by
 * `refundGenerationJob` if it fails.
 */
export const generateServiceAndSave = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      jobId: string;
      browserId: string;
      name: string;
      category: string;
      description: string;
      photoUrl?: string | null;
      flatPrice?: string | null;
      tiers?: Array<{ name: string; price: string; inclusions: string[] }>;
      contact: { method: string; value: string };
    }) => d,
  )
  .handler(async ({ data }) => {
    const [{ currentUserId }, svc, { supabaseAdmin }] = await Promise.all([
      import("./credits.server"),
      import("./service.server"),
      import("@/integrations/supabase/client.server"),
    ]);
    const userId = (await currentUserId()) ?? null;

    // The job must still be an open reservation — same guard products use.
    const { data: job } = await supabaseAdmin
      .from("generation_jobs")
      .select("status")
      .eq("id", data.jobId)
      .eq("browser_id", data.browserId)
      .maybeSingle();
    if (!job) throw new Error("Generation job was not found. Try again.");
    if (job.status !== "reserved") throw new Error("GENERATION_JOB_CLOSED");

    const name = data.name.trim().slice(0, 120) || "Service";
    const details = svc.normalizeServiceDetails({
      category: data.category,
      description: data.description,
      flatPrice: data.flatPrice ?? null,
      tiers: data.tiers ?? [],
      contact: data.contact,
      hadPhoto: !!data.photoUrl,
    });

    const priceLabel = details.tiers.length
      ? `From ₹${details.tiers.map((t) => Number(t.price) || 0).filter(Boolean).sort((a, b) => a - b)[0] ?? ""}`
      : details.flatPrice
        ? `₹${details.flatPrice}`
        : null;

    const [poster, copy] = await Promise.all([
      svc.generateServicePoster({
        browserId: data.browserId,
        name,
        category: details.category,
        photoUrl: data.photoUrl ?? null,
        priceLabel,
      }),
      svc.generateServiceCopy({ userId, name, details }),
    ]);

    details.ctaLine = copy.ctaLine;

    const images = [
      { kind: "poster", ratio: "1:1", url: poster.url },
      { kind: "poster", ratio: "9:16", url: poster.url },
    ];

    const priceNumber = details.flatPrice
      ? Number(details.flatPrice)
      : details.tiers.length
        ? Number(details.tiers[0].price)
        : null;

    const { data: row, error } = await supabaseAdmin
      .from("generations")
      .insert({
        browser_id: data.browserId,
        user_id: userId ?? null,
        kind: "service",
        service_details: details as unknown as Record<string, unknown>,
        original_image_url: data.photoUrl ?? null,
        product_name: name,
        price: Number.isFinite(priceNumber as number) ? priceNumber : null,
        detail: details.description,
        category: details.category,
        generated_images: images,
        copy: {
          seoTitle: copy.seoTitle,
          description: copy.description,
          bullets: copy.bullets,
          tags: copy.tags,
          instagram: copy.instagram,
          instagramHashtags: copy.instagramHashtags,
          whatsapp: copy.whatsapp,
          festival: "",
        },
        gen_metadata: {
          image_model: svc.SERVICE_IMAGE_MODEL,
          image_count: 1,
          image_resolution: 2048,
          service_path: poster.hadPhoto ? "photo" : "no_photo",
        },
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not save this service.");

    await supabaseAdmin
      .from("generation_jobs")
      .update({ status: "succeeded", error: null })
      .eq("id", data.jobId)
      .eq("browser_id", data.browserId)
      .eq("status", "reserved");

    console.info(`[service] saved id=${row.id} path=${poster.hadPhoto ? "photo" : "no_photo"}`);
    return { id: row.id as string };
  });
