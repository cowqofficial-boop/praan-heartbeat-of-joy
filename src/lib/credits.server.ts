// Server-only credit helpers.
// The signed-in user is ALWAYS derived from the request bearer token — never
// from client-supplied input — so generations can't be run for free by simply
// omitting a userId.

import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { COSTS, type ActionKey } from "./plans";

export type Spend = { sub: number; pack: number };

/** Returns the authenticated user id from the request, or null for anonymous callers. */
export async function currentUserId(): Promise<string | null> {
  let header: string | null | undefined;
  try {
    header = getRequestHeader("authorization");
  } catch {
    return null;
  }
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (token.split(".").length !== 3) return null;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const sb = createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data, error } = await sb.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return String(data.claims.sub);
  } catch {
    return null;
  }
}

/**
 * Deduct credits for an action. Throws `NO_CREDITS:<cost>:<balance>` when the
 * balance is short, and throws on any RPC error — it never silently proceeds.
 */
export async function spendOrThrow(userId: string, action: ActionKey, units = 1): Promise<Spend> {
  const amount = COSTS[action] * units;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("spend_credits", {
    _user_id: userId,
    _amount: amount,
  });
  if (error) throw new Error(`credit check failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.ok) throw new Error(`NO_CREDITS:${amount}:${row?.balance ?? 0}`);
  console.info(`[credits] spent user=${userId} action=${action} amount=${amount}`);
  return { sub: row.took_sub ?? 0, pack: row.took_pack ?? 0 };
}

/** Put back a previous reservation after a failure. Never throws. */
export async function refundSpend(userId: string, spend: Spend | null): Promise<void> {
  if (!spend || (spend.sub === 0 && spend.pack === 0)) return;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("refund_credits", {
      _user_id: userId,
      _sub: spend.sub,
      _pack: spend.pack,
    });
    console.info(`[credits] refunded user=${userId} sub=${spend.sub} pack=${spend.pack}`);
  } catch (e) {
    console.error("[credits] refund failed", e);
  }
}
