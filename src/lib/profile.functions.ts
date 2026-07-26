// Profile & settings server functions. Client-reachable, so nothing
// server-only is imported at module scope.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Profile = {
  display_name: string | null;
  role_title: string | null;
  phone: string | null;
  location: string | null;
  website: string | null;
  timezone: string | null;
  language: string | null;
  date_format: string | null;
  currency: string | null;
  country: string | null;
  bio: string | null;
  mission: string | null;
  years_in_business: string | null;
  team_size: string | null;
  social_linkedin: string | null;
  social_twitter: string | null;
  social_youtube: string | null;
  social_instagram: string | null;
  avatar_url: string | null;
  created_at?: string;
};

const short = z.string().trim().max(120).nullish();
const medium = z.string().trim().max(240).nullish();
const long = z.string().trim().max(1200).nullish();

const profileSchema = z.object({
  display_name: short,
  role_title: short,
  phone: z.string().trim().max(32).nullish(),
  location: short,
  website: medium,
  timezone: short,
  language: short,
  date_format: short,
  currency: short,
  country: short,
  bio: long,
  mission: long,
  years_in_business: short,
  team_size: short,
  social_linkedin: medium,
  social_twitter: medium,
  social_youtube: medium,
  social_instagram: medium,
  avatar_url: z.string().trim().max(2000).nullish(),
});

/** Empty strings collapse to null so "unset" is a single representation. */
function normalise<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) out[k] = v === "" || v === undefined ? null : v;
  return out as T;
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Profile & { email: string | null; joined_at: string }> => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const claims = context.claims as Record<string, unknown> | undefined;
    const row = (data ?? {}) as Partial<Profile>;
    return {
      display_name: row.display_name ?? null,
      role_title: row.role_title ?? null,
      phone: row.phone ?? null,
      location: row.location ?? null,
      website: row.website ?? null,
      timezone: row.timezone ?? null,
      language: row.language ?? null,
      date_format: row.date_format ?? null,
      currency: row.currency ?? null,
      country: row.country ?? null,
      bio: row.bio ?? null,
      mission: row.mission ?? null,
      years_in_business: row.years_in_business ?? null,
      team_size: row.team_size ?? null,
      social_linkedin: row.social_linkedin ?? null,
      social_twitter: row.social_twitter ?? null,
      social_youtube: row.social_youtube ?? null,
      social_instagram: row.social_instagram ?? null,
      avatar_url: row.avatar_url ?? null,
      email: (claims?.email as string | undefined) ?? null,
      joined_at: row.created_at ?? new Date().toISOString(),
    };
  });

export const saveMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<Profile>) => profileSchema.partial().parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .upsert({ user_id: context.userId, ...normalise(data) }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const uploadAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { dataUrl: string }) =>
    z.object({ dataUrl: z.string().min(32).max(8_000_000) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const m = /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/.exec(data.dataUrl);
    if (!m) throw new Error("Please choose a PNG, JPG or WEBP image.");
    const mime = m[1];
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
    const path = `profiles/${context.userId}/avatar-${Date.now()}.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage
      .from("praan")
      .upload(path, bytes, { contentType: mime, upsert: true });
    if (error) throw new Error(error.message);
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("praan")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (sErr || !signed) throw new Error(sErr?.message ?? "Could not save that photo.");
    await context.supabase
      .from("profiles")
      .upsert({ user_id: context.userId, avatar_url: signed.signedUrl }, { onConflict: "user_id" });
    return { url: signed.signedUrl };
  });

// ---------- Notifications ----------

export type NotificationPrefs = {
  email_enabled: boolean;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  push_enabled: boolean;
  marketing_enabled: boolean;
  reports_enabled: boolean;
  workflow_alerts: boolean;
  ai_alerts: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  email_enabled: true,
  sms_enabled: false,
  whatsapp_enabled: true,
  push_enabled: false,
  marketing_enabled: false,
  reports_enabled: true,
  workflow_alerts: true,
  ai_alerts: true,
};

export const getNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<NotificationPrefs> => {
    const { data, error } = await context.supabase
      .from("notification_prefs")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ...DEFAULT_PREFS, ...((data ?? {}) as Partial<NotificationPrefs>) };
  });

export const saveNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<NotificationPrefs>) =>
    z
      .object({
        email_enabled: z.boolean().optional(),
        sms_enabled: z.boolean().optional(),
        whatsapp_enabled: z.boolean().optional(),
        push_enabled: z.boolean().optional(),
        marketing_enabled: z.boolean().optional(),
        reports_enabled: z.boolean().optional(),
        workflow_alerts: z.boolean().optional(),
        ai_alerts: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("notification_prefs")
      .upsert({ user_id: context.userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Security ----------

export type SecurityOverview = {
  email: string | null;
  email_confirmed: boolean;
  provider: string;
  last_sign_in_at: string | null;
  created_at: string | null;
  score: number;
  checks: Array<{ label: string; done: boolean; weight: number }>;
};

export const getSecurityOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecurityOverview> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const u = data?.user;
    const provider = (u?.app_metadata?.provider as string | undefined) ?? "email";
    const [{ count: connCount }, { data: profile }] = await Promise.all([
      context.supabase
        .from("social_connections")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId),
      context.supabase.from("profiles").select("avatar_url, bio").eq("user_id", context.userId).maybeSingle(),
    ]);

    const checks = [
      { label: "Email confirmed", done: !!u?.email_confirmed_at, weight: 30 },
      { label: "Strong sign-in method", done: provider !== "email", weight: 25 },
      { label: "Profile filled in", done: !!(profile?.avatar_url && profile?.bio), weight: 15 },
      { label: "A shop connected", done: (connCount ?? 0) > 0, weight: 15 },
      { label: "Two-step sign-in", done: false, weight: 15 },
    ];
    const score = checks.reduce((s, c) => s + (c.done ? c.weight : 0), 0);

    return {
      email: u?.email ?? null,
      email_confirmed: !!u?.email_confirmed_at,
      provider,
      last_sign_in_at: u?.last_sign_in_at ?? null,
      created_at: u?.created_at ?? null,
      score,
      checks,
    };
  });

// ---------- Data & privacy ----------

export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, kit, generations, stock, payments, credits, prefs] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("brand_kits").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase
        .from("generations")
        .select("id, product_name, price, detail, created_at, copy_json")
        .eq("user_id", context.userId),
      context.supabase.from("stock_items").select("*").eq("user_id", context.userId),
      context.supabase.from("payments").select("*").eq("user_id", context.userId),
      context.supabase.from("user_credits").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("notification_prefs").select("*").eq("user_id", context.userId).maybeSingle(),
    ]);
    return {
      exported_at: new Date().toISOString(),
      profile: profile.data ?? null,
      brand_kit: kit.data ?? null,
      products: generations.data ?? [],
      stock: stock.data ?? [],
      payments: payments.data ?? [],
      credits: credits.data ?? null,
      notification_prefs: prefs.data ?? null,
    };
  });

/** Everything CowQ remembers about how you want your photos and copy made. */
export const exportAiMemory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [kit, models] = await Promise.all([
      context.supabase.from("brand_kits").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase
        .from("brand_models")
        .select("id, name, is_active, created_at")
        .eq("user_id", context.userId),
    ]);
    return {
      exported_at: new Date().toISOString(),
      brand_kit: kit.data ?? null,
      saved_models: models.data ?? [],
    };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { confirm: string }) => z.object({ confirm: z.string() }).parse(d))
  .handler(async ({ context, data }) => {
    if (data.confirm !== "DELETE") throw new Error("Type DELETE to confirm.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    for (const table of [
      "notification_prefs",
      "profiles",
      "brand_models",
      "brand_kits",
      "content_posts",
      "content_plans",
      "stock_movements",
      "stock_items",
      "social_connections",
      "generations",
      "user_preferences",
    ] as const) {
      await supabaseAdmin.from(table).delete().eq("user_id", uid);
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Activity + insights ----------

export type ActivityEvent = {
  id: string;
  kind: "product" | "payment" | "model" | "shop" | "account";
  title: string;
  detail: string | null;
  at: string;
};

export const getMyActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActivityEvent[]> => {
    const uid = context.userId;
    const [gens, pays, models, conns] = await Promise.all([
      context.supabase
        .from("generations")
        .select("id, product_name, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(10),
      context.supabase
        .from("payments")
        .select("id, plan_id, amount_inr, status, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(5),
      context.supabase
        .from("brand_models")
        .select("id, name, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(5),
      context.supabase
        .from("social_connections")
        .select("id, channel, account_name, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const events: ActivityEvent[] = [
      ...(gens.data ?? []).map((g) => ({
        id: `g-${g.id}`,
        kind: "product" as const,
        title: g.product_name ? `Photos made for ${g.product_name}` : "Photos made",
        detail: null,
        at: g.created_at,
      })),
      ...(pays.data ?? []).map((p) => ({
        id: `p-${p.id}`,
        kind: "payment" as const,
        title: p.status === "paid" ? "Payment received" : `Payment ${p.status}`,
        detail: `₹${(p.amount_inr ?? 0).toLocaleString("en-IN")} · ${p.plan_id}`,
        at: p.created_at,
      })),
      ...(models.data ?? []).map((m) => ({
        id: `m-${m.id}`,
        kind: "model" as const,
        title: `Model saved — ${m.name}`,
        detail: null,
        at: m.created_at,
      })),
      ...(conns.data ?? []).map((c) => ({
        id: `c-${c.id}`,
        kind: "shop" as const,
        title: `Connected ${c.channel.replace("_", " ")}`,
        detail: c.account_name,
        at: c.created_at,
      })),
    ];

    return events.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 20);
  });

export type ProfileInsights = {
  products: number;
  photos: number;
  posts: number;
  stock_items: number;
  shops_connected: number;
  saved_models: number;
  storage_bytes: number;
  storage_limit_bytes: number;
  retention_days: number | null;
  minutes_saved: number;
  rupees_saved: number;
};

/** Deliberately conservative estimates — never inflated. */
const MINUTES_PER_PRODUCT = 20;
const RUPEES_PER_PRODUCT = 300;
const BYTES_PER_PHOTO = 850_000;

const GB = 1024 ** 3;

/** Real storage limits, and how long generated files are kept, per plan. */
export function storagePolicy(planId: string): { limitBytes: number; retentionDays: number | null } {
  if (planId.startsWith("pro")) return { limitBytes: 200 * GB, retentionDays: null };
  if (planId.startsWith("growth")) return { limitBytes: 50 * GB, retentionDays: null };
  if (planId.startsWith("starter")) return { limitBytes: 10 * GB, retentionDays: null };
  return { limitBytes: 2 * GB, retentionDays: 30 };
}

export const getMyInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileInsights> => {
    const uid = context.userId;
    const [gens, posts, stock, conns, models] = await Promise.all([
      context.supabase.from("generations").select("generated_images").eq("user_id", uid),
      context.supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("user_id", uid),
      context.supabase.from("stock_items").select("id", { count: "exact", head: true }).eq("user_id", uid),
      context.supabase.from("social_connections").select("id", { count: "exact", head: true }).eq("user_id", uid),
      context.supabase.from("brand_models").select("id", { count: "exact", head: true }).eq("user_id", uid),
    ]);

    const { data: creditRow } = await context.supabase
      .from("user_credits")
      .select("plan_id")
      .eq("user_id", uid)
      .maybeSingle();
    const policy = storagePolicy(creditRow?.plan_id ?? "free");

    // Free plans keep generated files for 30 days; clear anything older.
    if (policy.retentionDays) {
      void import("./storage-retention.server").then((m) =>
        m.pruneExpiredGeneratedFiles(uid, policy.retentionDays!),
      ).catch(() => { /* pruning is best-effort */ });
    }

    const rows = gens.data ?? [];
    const photos = rows.reduce((n, r) => {
      const imgs = r.generated_images;
      return n + (Array.isArray(imgs) ? imgs.length : 0);
    }, 0);
    const products = rows.length;

    return {
      products,
      photos,
      posts: posts.count ?? 0,
      stock_items: stock.count ?? 0,
      shops_connected: conns.count ?? 0,
      saved_models: models.count ?? 0,
      storage_bytes: photos * BYTES_PER_PHOTO,
      storage_limit_bytes: policy.limitBytes,
      retention_days: policy.retentionDays,
      minutes_saved: products * MINUTES_PER_PRODUCT,
      rupees_saved: products * RUPEES_PER_PRODUCT,
    };
  });

// ---------- AI preferences ----------
// These live on brand_kits alongside the rest of the brand voice, but are
// patched on their own so saving here never clears the model preferences.

export type AiPrefs = {
  tone: string;
  ai_reply_style: string;
  ai_emoji_usage: string;
  ai_length: string;
  ai_creativity: number;
  ai_temperature: number;
};

const DEFAULT_AI: AiPrefs = {
  tone: "friendly",
  ai_reply_style: "helpful",
  ai_emoji_usage: "some",
  ai_length: "medium",
  ai_creativity: 50,
  ai_temperature: 40,
};

export const getAiPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiPrefs> => {
    const { data, error } = await context.supabase
      .from("brand_kits")
      .select("tone, ai_reply_style, ai_emoji_usage, ai_length, ai_creativity, ai_temperature")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const row = (data ?? {}) as Partial<AiPrefs>;
    return {
      tone: row.tone || DEFAULT_AI.tone,
      ai_reply_style: row.ai_reply_style || DEFAULT_AI.ai_reply_style,
      ai_emoji_usage: row.ai_emoji_usage || DEFAULT_AI.ai_emoji_usage,
      ai_length: row.ai_length || DEFAULT_AI.ai_length,
      ai_creativity: row.ai_creativity ?? DEFAULT_AI.ai_creativity,
      ai_temperature: row.ai_temperature ?? DEFAULT_AI.ai_temperature,
    };
  });

export const saveAiPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<AiPrefs>) =>
    z
      .object({
        tone: z.string().max(40).optional(),
        ai_reply_style: z.string().max(40).optional(),
        ai_emoji_usage: z.string().max(40).optional(),
        ai_length: z.string().max(40).optional(),
        ai_creativity: z.number().int().min(0).max(100).optional(),
        ai_temperature: z.number().int().min(0).max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    // brand_kits requires business_name; upsert would null it on a fresh row,
    // so update in place and only insert a seed row when none exists yet.
    const { data: existing } = await context.supabase
      .from("brand_kits")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase
        .from("brand_kits")
        .update(data)
        .eq("user_id", context.userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase
        .from("brand_kits")
        .insert({ user_id: context.userId, ...DEFAULT_AI, ...data });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
