import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { listMyChannels, type ChannelStatus } from "@/lib/social.functions";

// Quiet banner shown once a connection is expired/broken.
// Never blocks the app — user chooses when to reconnect.
export function ReconnectBanner() {
  const [expired, setExpired] = useState<ChannelStatus | null>(null);

  useEffect(() => {
    let alive = true;
    listMyChannels()
      .then((rows) => {
        if (!alive) return;
        const now = Date.now();
        const bad = rows.find(
          (r) =>
            r.connected &&
            (r.needs_reconnect ||
              (r.token_expires_at && new Date(r.token_expires_at).getTime() < now + 24 * 3600 * 1000)),
        );
        setExpired(bad ?? null);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!expired) return null;
  const label =
    expired.channel === "instagram"
      ? "Instagram"
      : expired.channel === "facebook_page"
      ? "Facebook Page"
      : "WhatsApp";
  return (
    <div className="mt-3 flex items-center justify-between gap-3 rounded-[12px] bg-amber/10 px-3 py-2 text-[13px] text-ink">
      <span>{label} needs reconnecting.</span>
      <Link
        to="/connect"
        className="rounded-[10px] bg-amber px-3 py-1.5 text-[13px] font-semibold text-void"
      >
        Reconnect
      </Link>
    </div>
  );
}
