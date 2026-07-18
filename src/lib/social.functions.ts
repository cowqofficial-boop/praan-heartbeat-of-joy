// Client-callable server functions for social channel connections.
// Never imports social.server.ts at module scope — loads it inside handlers.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { randomBytes } from "node:crypto";

export type Channel = "instagram" | "facebook_page" | "whatsapp";

export type ChannelStatus = {
  channel: Channel;
  connected: boolean;
  account_name: string | null;
  account_id: string | null;
  token_expires_at: string | null;
  needs_reconnect: boolean;
};

const CHANNELS: Channel[] = ["instagram", "facebook_page", "whatsapp"];

// Meta permissions we ask for on the Instagram connect flow.
// Covers Instagram publishing plus the linked Facebook Page.
const META_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_metadata",
  "business_management",
].join(",");

function metaAppId(): string | null {
  return process.env.META_APP_ID ?? null;
}
function siteOrigin(): string {
  return process.env.APP_PUBLIC_ORIGIN ?? "https://praan-heartbeat-of-joy.lovable.app";
}
function metaRedirectUri(): string {
  return `${siteOrigin()}/api/public/meta-oauth-callback`;
}

// -- list ------------------------------------------------------------
export const listMyChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ChannelStatus[]> => {
    const { data, error } = await context.supabase
      .from("my_social_connections")
      .select("channel, account_id, account_name, token_expires_at, needs_reconnect");
    if (error) throw new Error(error.message);
    const by: Record<string, (typeof data)[number]> = {};
    (data ?? []).forEach((r) => {
      by[r.channel] = r;
    });
    return CHANNELS.map((ch) => {
      const row = by[ch];
      return {
        channel: ch,
        connected: !!row,
        account_name: row?.account_name ?? null,
        account_id: row?.account_id ?? null,
        token_expires_at: row?.token_expires_at ?? null,
        needs_reconnect: row?.needs_reconnect ?? false,
      };
    });
  });

// -- disconnect ------------------------------------------------------
export const disconnectChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { channel: Channel }) => d)
  .handler(async ({ context, data }) => {
    const { deleteConnection } = await import("@/lib/social.server");
    await deleteConnection(context.userId, data.channel);
    return { ok: true };
  });

// -- start Instagram OAuth ------------------------------------------
// Returns a Meta authorize URL the client should navigate to (top-level, not iframe).
// If META_APP_ID isn't configured yet we return `{ configured: false }` so the UI
// can show a friendly "coming soon — needs setup" state instead of a broken redirect.
export const startInstagramConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ configured: false } | { configured: true; url: string }> => {
    const appId = metaAppId();
    if (!appId) return { configured: false };

    const state = randomBytes(24).toString("hex");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("oauth_states").insert({
      state,
      user_id: context.userId,
      channel: "instagram",
    });
    if (error) throw new Error(error.message);

    const url = new URL("https://www.facebook.com/v18.0/dialog/oauth");
    url.searchParams.set("client_id", appId);
    url.searchParams.set("redirect_uri", metaRedirectUri());
    url.searchParams.set("state", state);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", META_SCOPES);
    return { configured: true, url: url.toString() };
  });

// Config check used by the UI to hint setup status without leaking secrets.
export const getSocialConfig = createServerFn({ method: "GET" }).handler(async () => {
  return {
    instagram_ready: !!process.env.META_APP_ID && !!process.env.META_APP_SECRET,
    whatsapp_ready: false, // WhatsApp Business API integration is not enabled yet.
    redirect_uri: `${(process.env.APP_PUBLIC_ORIGIN ?? "https://praan-heartbeat-of-joy.lovable.app")}/api/public/meta-oauth-callback`,
  };
});
