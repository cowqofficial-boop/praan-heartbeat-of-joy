import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import {
  SHOP_SOCIALS,
  safeExternalUrl,
  slugError,
  slugify,
  type PublicListing,
  type PublicShop,
} from "@/lib/shop";

export type ShopSettings = {
  slug: string;
  published: boolean;
  shop_name: string;
  bio: string;
  category: string;
  city: string;
  region: string;
  country: string;
  logo_url: string | null;
  contact_method: string;
  contact_value: string;
  social_instagram: string | null;
  social_facebook: string | null;
  social_linkedin: string | null;
  social_x: string | null;
  social_youtube: string | null;
  social_website: string | null;
  exists: boolean;
};

const COLUMNS =
  "slug, published, shop_name, bio, category, city, region, country, logo_url, contact_method, contact_value, social_instagram, social_facebook, social_linkedin, social_x, social_youtube, social_website";

/** Server-side publishable client — public reads only, RLS applies as anon. */
function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** The seller's own shop settings, with sensible suggestions when none exist yet. */
export const getMyShop = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ShopSettings> => {
    const { data } = await context.supabase
      .from("shop_settings")
      .select(COLUMNS)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (data) return { ...(data as Omit<ShopSettings, "exists">), exists: true };

    const [{ data: kit }, { data: profile }] = await Promise.all([
      context.supabase
        .from("brand_kits")
        .select("business_name, logo_url, sells_what")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase
        .from("profiles")
        .select("bio, location, country")
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);

    const name = kit?.business_name?.trim() || "";
    return {
      slug: name ? slugify(name) : "",
      published: false,
      shop_name: name,
      bio: profile?.bio ?? "",
      category: kit?.sells_what ?? "",
      city: profile?.location ?? "",
      region: "",
      country: profile?.country ?? "India",
      logo_url: kit?.logo_url ?? null,
      contact_method: "whatsapp",
      contact_value: "",
      social_instagram: null,
      social_facebook: null,
      social_linkedin: null,
      social_x: null,
      social_youtube: null,
      social_website: null,
      exists: false,
    };
  });

function clean(v: unknown, max: number): string {
  return String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

export const saveMyShop = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<ShopSettings>) => d)
  .handler(async ({ context, data }) => {
    const patch: Record<string, unknown> = {};

    if (data.slug !== undefined) {
      const slug = slugify(data.slug);
      const err = slugError(slug);
      if (err) throw new Error(err);
      const { data: taken } = await context.supabase
        .from("shop_settings")
        .select("user_id")
        .eq("slug", slug)
        .neq("user_id", context.userId)
        .maybeSingle();
      if (taken) throw new Error("That shop address is already taken. Try another.");
      patch.slug = slug;
    }

    if (data.published !== undefined) patch.published = !!data.published;
    if (data.shop_name !== undefined) patch.shop_name = clean(data.shop_name, 80);
    if (data.bio !== undefined) patch.bio = clean(data.bio, 400);
    if (data.category !== undefined) patch.category = clean(data.category, 60);
    if (data.city !== undefined) patch.city = clean(data.city, 60);
    if (data.region !== undefined) patch.region = clean(data.region, 60);
    if (data.country !== undefined) patch.country = clean(data.country, 60);
    if (data.logo_url !== undefined) patch.logo_url = safeExternalUrl(data.logo_url);
    if (data.contact_method !== undefined) {
      const m = String(data.contact_method);
      patch.contact_method = ["whatsapp", "phone", "sms", "email"].includes(m) ? m : "whatsapp";
    }
    if (data.contact_value !== undefined) patch.contact_value = clean(data.contact_value, 120);
    for (const s of SHOP_SOCIALS) {
      const v = (data as Record<string, unknown>)[s.key];
      if (v !== undefined) patch[s.key] = safeExternalUrl(v as string);
    }

    // Publishing needs an address and a way to be reached — otherwise the page
    // would be live with a dead contact button.
    const { data: existing } = await context.supabase
      .from("shop_settings")
      .select("slug, contact_value")
      .eq("user_id", context.userId)
      .maybeSingle();

    const nextSlug = (patch.slug as string) ?? existing?.slug ?? "";
    const nextContact = (patch.contact_value as string) ?? existing?.contact_value ?? "";
    if (patch.published === true) {
      if (!nextSlug) throw new Error("Choose a shop address before publishing.");
      if (!nextContact) throw new Error("Add a contact number or email before publishing.");
    }
    if (!existing && !nextSlug) throw new Error("Choose a shop address first.");

    const { error } = await context.supabase
      .from("shop_settings")
      .upsert({ user_id: context.userId, slug: nextSlug, ...patch }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Per-listing "Show on my public shop". Server-side ownership check via RLS. */
export const setListingVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; table: "generations" | "stock_items"; visible: boolean }) => d)
  .handler(async ({ context, data }) => {
    const table = data.table === "stock_items" ? "stock_items" : "generations";
    const { error } = await context.supabase
      .from(table)
      .update({ public_visible: !!data.visible })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAllListingsVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { visible: boolean }) => d)
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("generations")
      .update({ public_visible: !!data.visible })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Public (unauthenticated) reads ----------------

type ImageRef = { kind?: string; ratio?: string; url?: string };

function pickImage(images: unknown, fallback: string | null): string | null {
  const list = Array.isArray(images) ? (images as ImageRef[]) : [];
  const square = list.find((i) => i?.ratio === "1:1" && i?.url);
  return square?.url ?? list.find((i) => i?.url)?.url ?? fallback ?? null;
}

export const getPublicShop = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: slugify(d.slug) }))
  .handler(async ({ data }): Promise<{ shop: PublicShop; listings: PublicListing[] } | null> => {
    if (!data.slug) return null;
    const sb = publicClient();

    const { data: shopRow } = await sb
      .from("shop_settings")
      .select(`${COLUMNS}, user_id, created_at`)
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (!shopRow) return null;

    const row = shopRow as unknown as Record<string, string | boolean | null>;

    const { data: gens } = await sb
      .from("generations")
      .select("id, kind, product_name, price, detail, category, generated_images, original_image_url, service_details, created_at")
      .eq("user_id", row.user_id as string)
      .eq("public_visible", true)
      .order("created_at", { ascending: false })
      .limit(200);

    const listings: PublicListing[] = (gens ?? []).map((g) => {
      const svc = (g.service_details ?? null) as {
        tiers?: Array<{ name: string; price: string; inclusions: string[] }>;
        ctaLine?: string | null;
      } | null;
      return {
        id: g.id as string,
        kind: g.kind === "service" ? "service" : "product",
        name: (g.product_name as string) ?? "Untitled",
        price: g.price == null ? null : Number(g.price),
        detail: ((g.detail as string) ?? "").slice(0, 240),
        category: (g.category as string) ?? "",
        image: pickImage(g.generated_images, (g.original_image_url as string) ?? null),
        tiers: Array.isArray(svc?.tiers) ? svc!.tiers.slice(0, 3) : [],
        cta: svc?.ctaLine ?? null,
      };
    });

    const socials = SHOP_SOCIALS.map((s) => {
      const url = safeExternalUrl(row[s.key] as string | null);
      return url ? { key: s.key, label: s.label, url } : null;
    }).filter(Boolean) as PublicShop["socials"];

    const shop: PublicShop = {
      slug: row.slug as string,
      shop_name: (row.shop_name as string) || (row.slug as string),
      bio: (row.bio as string) ?? "",
      category: (row.category as string) ?? "",
      city: (row.city as string) ?? "",
      region: (row.region as string) ?? "",
      country: (row.country as string) ?? "",
      logo_url: safeExternalUrl(row.logo_url as string | null),
      contact_method: (row.contact_method as string) ?? "whatsapp",
      contact_value: (row.contact_value as string) ?? "",
      joined: (row.created_at as string) ?? null,
      socials,
    };

    return { shop, listings };
  });

/** Slugs of every published shop — used by the sitemap. */
export const listPublishedShopSlugs = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data } = await sb
    .from("shop_settings")
    .select("slug")
    .eq("published", true)
    .limit(5000);
  return (data ?? []).map((r) => r.slug as string);
});
