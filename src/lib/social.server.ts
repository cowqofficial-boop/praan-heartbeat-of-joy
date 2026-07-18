// Server-only helpers for the social_connections table.
// Never imported by client bundles.
import { encryptToken, decryptToken } from "./crypto.server";

export type Channel = "instagram" | "facebook_page" | "whatsapp";

export type SafeConnection = {
  id: string;
  channel: Channel;
  account_id: string;
  account_name: string | null;
  token_expires_at: string | null;
  needs_reconnect: boolean;
  last_refreshed_at: string | null;
};

export async function upsertConnection(input: {
  userId: string;
  channel: Channel;
  accountId: string;
  accountName: string | null;
  accessToken: string;
  tokenExpiresAt: string | null;
  meta?: Record<string, string | number | boolean | null>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const row = {
    user_id: input.userId,
    channel: input.channel,
    account_id: input.accountId,
    account_name: input.accountName,
    access_token_ciphertext: encryptToken(input.accessToken),
    token_expires_at: input.tokenExpiresAt,
    meta: input.meta ?? {},
    needs_reconnect: false,
    last_refreshed_at: new Date().toISOString(),
  };
  const { error } = await supabaseAdmin
    .from("social_connections")
    .upsert(row, { onConflict: "user_id,channel" });
  if (error) throw new Error(error.message);
}

export async function getConnectionWithToken(userId: string, channel: Channel) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("social_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("channel", channel)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...(data as Record<string, unknown>),
    access_token: decryptToken((data as { access_token_ciphertext: string }).access_token_ciphertext),
  };
}

export async function markNeedsReconnect(userId: string, channel: Channel) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("social_connections")
    .update({ needs_reconnect: true })
    .eq("user_id", userId)
    .eq("channel", channel);
}

export async function deleteConnection(userId: string, channel: Channel) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("social_connections")
    .delete()
    .eq("user_id", userId)
    .eq("channel", channel);
}
