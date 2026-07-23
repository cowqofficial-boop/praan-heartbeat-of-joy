import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, Check, Instagram, Facebook, MessageCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  disconnectChannel,
  getSocialConfig,
  listMyChannels,
  type ChannelStatus,
} from "@/lib/social.functions";

const searchSchema = z.object({ onboarding: z.boolean().optional() });

export const Route = createFileRoute("/connect")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Connect your channels — CowQ" },
      { name: "description", content: "Connect Instagram, Facebook Page, and WhatsApp so CowQ can post for you." },
      { property: "og:title", content: "Connect your channels — CowQ" },
      { property: "og:description", content: "Link Instagram, Facebook Page, and WhatsApp to CowQ." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: ConnectPage,
});

function ConnectPage() {
  const { onboarding } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", search: { mode: "signin", next: "/connect" }, replace: true });
      } else {
        setAuthReady(true);
      }
    });
  }, [navigate]);

  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: () => listMyChannels(),
    enabled: authReady,
  });
  const { data: config } = useQuery({
    queryKey: ["social-config"],
    queryFn: () => getSocialConfig(),
    enabled: authReady,
  });

  async function handleDisconnect(channel: ChannelStatus["channel"]) {
    if (!confirm("Disconnect this channel?")) return;
    await disconnectChannel({ data: { channel } });
    qc.invalidateQueries({ queryKey: ["channels"] });
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[15px] text-muted">Loading…</p>
      </div>
    );
  }

  const get = (c: ChannelStatus["channel"]) => channels.find((x) => x.channel === c);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[720px] flex-col px-5 pb-16 pt-8">
      <header className="flex items-center gap-3">
        <Link
          to={onboarding ? "/library" : "/library"}
          className="grid h-10 w-10 place-items-center rounded-full text-muted hover:text-ink lg:hidden"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-[40px] leading-[1.02] text-ink sm:text-[56px]">Connect your channels</h1>
      </header>

      <p className="mt-2 text-[15px] text-muted">
        Link the places you sell. CowQ keeps working even if you skip this.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <ChannelCard
          icon={<Instagram className="h-5 w-5" />}
          title="Instagram"
          status={get("instagram")}
          ctaHref="/connect/instagram"
          ctaLabel="Connect Instagram"
          onDisconnect={() => handleDisconnect("instagram")}
        />
        <ChannelCard
          icon={<Facebook className="h-5 w-5" />}
          title="Facebook Page"
          status={get("facebook_page")}
          hint="Connects automatically with Instagram."
          ctaHref="/connect/instagram"
          ctaLabel="Connect via Instagram"
          onDisconnect={() => handleDisconnect("facebook_page")}
        />
        <ChannelCard
          icon={<MessageCircle className="h-5 w-5" />}
          title="WhatsApp"
          status={get("whatsapp")}
          hint={config?.whatsapp_ready ? undefined : "Coming soon — we'll open this up once WhatsApp Business approval is ready."}
          ctaHref="/connect"
          ctaLabel="Notify me"
          disabled={!config?.whatsapp_ready}
        />
      </div>

      {onboarding && (
        <button
          type="button"
          onClick={() => navigate({ to: "/library" })}
          className="mt-8 h-12 text-[14px] font-medium text-muted underline"
        >
          Skip for now
        </button>
      )}
    </main>
  );
}

function ChannelCard(props: {
  icon: React.ReactNode;
  title: string;
  status: ChannelStatus | undefined;
  ctaHref: string;
  ctaLabel: string;
  hint?: string;
  disabled?: boolean;
  onDisconnect?: () => void;
}) {
  const connected = props.status?.connected;
  const needsReconnect = props.status?.needs_reconnect;
  return (
    <section className="rounded-[12px] bg-raised p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-highlight/10 text-ink">
          {props.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold text-ink">{props.title}</h2>
            {connected && !needsReconnect && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E7F5EC] px-2 py-0.5 text-[11px] font-medium text-[#137a3d]">
                <Check className="h-3 w-3" /> Connected
              </span>
            )}
            {needsReconnect && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FDECEC] px-2 py-0.5 text-[11px] font-medium text-[#B33]">
                Needs reconnect
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-muted">
            {connected ? props.status?.account_name ?? "Connected" : props.hint ?? "Not connected"}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {connected && !needsReconnect ? (
          <button
            type="button"
            onClick={props.onDisconnect}
            className="h-10 rounded-[10px] px-3 text-[13px] font-medium text-ink"
          >
            Disconnect
          </button>
        ) : props.disabled ? (
          <button
            type="button"
            disabled
            className="h-10 rounded-[10px] bg-[#EEE] px-4 text-[13px] font-medium text-muted"
          >
            {props.ctaLabel}
          </button>
        ) : (
          <Link
            to={props.ctaHref}
            className="grid h-10 place-items-center rounded-[10px] bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
          >
            {needsReconnect ? "Reconnect" : props.ctaLabel}
          </Link>
        )}
      </div>
    </section>
  );
}

// Loader spinner exported so the wizard can reuse it.
export { Loader2 };
