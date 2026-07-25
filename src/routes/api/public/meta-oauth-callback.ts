// Meta OAuth callback (Instagram + Facebook Page).
// Public route — Meta redirects the user's browser here with ?code=&state=.
// We validate `state`, exchange the code for a long-lived token, resolve the
// user's Facebook Page and linked Instagram Business Account, then upsert
// encrypted rows into social_connections.
import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

function html(body: string, status = 200): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CowQ — Instagram</title><style>
      body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#FAF7F2;color:#1a1a1a;padding:32px 20px;max-width:480px;margin:0 auto;line-height:1.5}
      h1{font-size:22px;margin:0 0 12px}
      p{font-size:15px;color:#555;margin:0 0 20px}
      a.btn{display:inline-block;background:#3D5AFE;color:#fff;text-decoration:none;padding:14px 20px;border-radius:12px;font-weight:600}
    </style></head><body>${body}</body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function ok(msg: string) {
  return html(`<h1>Connected ✓</h1><p>${msg}</p><a class="btn" href="/connect">Back to CowQ</a><script>setTimeout(()=>{location.href="/connect"},1500)</script>`);
}
function fail(msg: string) {
  return html(`<h1>Couldn't connect</h1><p>${msg}</p><a class="btn" href="/connect">Try again</a>`, 400);
}

export const Route = createFileRoute("/api/public/meta-oauth-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const err = url.searchParams.get("error_description") ?? url.searchParams.get("error");
        if (err) return fail(err);
        if (!code || !state) return fail("Missing code or state.");

        const appId = process.env.META_APP_ID;
        const appSecret = process.env.META_APP_SECRET;
        if (!appId || !appSecret) return fail("Instagram isn't set up on this app yet.");

        // 1. Validate + consume state.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: st, error: stErr } = await supabaseAdmin
          .from("oauth_states")
          .select("user_id, expires_at")
          .eq("state", state)
          .maybeSingle();
        if (stErr) return fail("Session lookup failed.");
        if (!st) return fail("Session expired. Please try again.");
        if (new Date(st.expires_at).getTime() < Date.now()) {
          await supabaseAdmin.from("oauth_states").delete().eq("state", state);
          return fail("Session expired. Please try again.");
        }
        await supabaseAdmin.from("oauth_states").delete().eq("state", state);
        const userId = st.user_id;

        const redirectUri = `${process.env.APP_PUBLIC_ORIGIN ?? "https://praan-heartbeat-of-joy.lovable.app"}/api/public/meta-oauth-callback`;

        try {
          // 2. Short-lived token.
          const short = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`,
          ).then((r) => r.json() as Promise<{ access_token?: string; error?: { message: string } }>);
          if (!short.access_token) throw new Error(short.error?.message ?? "Token exchange failed");

          // 3. Long-lived (~60 day) token.
          const long = await fetch(
            `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${short.access_token}`,
          ).then((r) => r.json() as Promise<{ access_token?: string; expires_in?: number; error?: { message: string } }>);
          if (!long.access_token) throw new Error(long.error?.message ?? "Long-lived token failed");

          const userToken = long.access_token;
          const userExpiresAt = long.expires_in
            ? new Date(Date.now() + long.expires_in * 1000).toISOString()
            : null;

          // 4. List pages the user manages.
          type Page = { id: string; name: string; access_token: string };
          const pages = await fetch(
            `https://graph.facebook.com/v18.0/me/accounts?access_token=${userToken}`,
          ).then((r) => r.json() as Promise<{ data?: Page[]; error?: { message: string } }>);
          if (pages.error) throw new Error(pages.error.message);
          if (!pages.data?.length) {
            return fail("No Facebook Page found on this account. Create a Page first, then try again.");
          }
          const page = pages.data[0];

          // 5. Find IG Business Account linked to the page.
          const igLink = await fetch(
            `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account{id,username}&access_token=${page.access_token}`,
          ).then((r) => r.json() as Promise<{ instagram_business_account?: { id: string; username: string }; error?: { message: string } }>);

          const { upsertConnection } = await import("@/lib/social.server");

          // Facebook Page — always saved on success.
          await upsertConnection({
            userId,
            channel: "facebook_page",
            accountId: page.id,
            accountName: page.name,
            accessToken: page.access_token, // Page tokens are long-lived when derived from a long-lived user token.
            tokenExpiresAt: userExpiresAt,
            meta: { page_id: page.id },
          });

          // Instagram — only if the page has an IG Business account linked.
          if (igLink.instagram_business_account) {
            await upsertConnection({
              userId,
              channel: "instagram",
              accountId: igLink.instagram_business_account.id,
              accountName: igLink.instagram_business_account.username,
              accessToken: page.access_token,
              tokenExpiresAt: userExpiresAt,
              meta: { page_id: page.id, ig_user_id: igLink.instagram_business_account.id },
            });
            return ok(`Instagram @${igLink.instagram_business_account.username} and Facebook Page “${page.name}” are connected.`);
          }

          return fail(`We connected your Facebook Page “${page.name}”, but Instagram isn't linked to it. In Instagram, switch to a Professional account and link it to this Page, then try again.`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          return fail(`We couldn't finish connecting. ${msg}`);
        }
      },
    },
  },
});
