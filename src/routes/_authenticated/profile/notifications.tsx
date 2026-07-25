import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Mail, MessageSquare, Smartphone } from "lucide-react";
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  type NotificationPrefs,
} from "@/lib/profile.functions";
import { COBALT, MAGENTA, AMBER } from "@/lib/page-accent";
import {
  SectionCard,
  Toggle,
  SaveBadge,
  CardSkeleton,
  GlassCard,
  useAutosave,
} from "@/components/profile/primitives";

export const Route = createFileRoute("/_authenticated/profile/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CowQ" },
      { name: "description", content: "Choose how CowQ reaches you when your photos are ready." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsTab,
});

function NotificationsTab() {
  const getFn = useServerFn(getNotificationPrefs);
  const saveFn = useServerFn(saveNotificationPrefs);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["notification-prefs"], queryFn: () => getFn({}) });

  const save = useCallback(
    async (patch: Partial<NotificationPrefs>) => {
      await saveFn({ data: patch });
      await qc.invalidateQueries({ queryKey: ["notification-prefs"] });
    },
    [saveFn, qc],
  );
  const auto = useAutosave<NotificationPrefs>(save);

  if (isLoading || !data) return <div className="grid gap-4"><CardSkeleton rows={4} /><CardSkeleton rows={3} /></div>;

  const set = (key: keyof NotificationPrefs) => (next: boolean) =>
    auto.queue({ [key]: next } as Partial<NotificationPrefs>, { [key]: !next } as Partial<NotificationPrefs>);

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <SaveBadge state={auto.state} error={auto.error} canUndo={auto.canUndo} onUndo={auto.undo} />
      </div>

      <SectionCard
        index={0}
        icon={Mail}
        title="Where we reach you"
        description="We only message you about your own products. Turn off anything you don't want."
      >
        <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          <Toggle
            label="Email"
            description="Photos ready, payment receipts, anything that needs your attention."
            tint={COBALT}
            checked={data.email_enabled}
            onChange={set("email_enabled")}
          />
          <Toggle
            label="WhatsApp"
            description="A short message when a batch finishes. Not built yet — turning it on saves your choice for when it is."
            tint={MAGENTA}
            checked={data.whatsapp_enabled}
            onChange={set("whatsapp_enabled")}
          />
          <Toggle
            label="SMS"
            description="Text messages. Also not built yet."
            tint={AMBER}
            checked={data.sms_enabled}
            onChange={set("sms_enabled")}
          />
          <Toggle
            label="Push on this device"
            description="A browser notification when a long batch finishes."
            tint={COBALT}
            checked={data.push_enabled}
            onChange={set("push_enabled")}
          />
        </div>
      </SectionCard>

      <SectionCard
        index={1}
        icon={BellRing}
        title="What we tell you about"
        description="Pick the moments worth interrupting you for."
      >
        <div className="divide-y" style={{ borderColor: "var(--line)" }}>
          <Toggle
            label="Photos ready"
            description="When a product finishes generating in the background."
            tint={MAGENTA}
            checked={data.workflow_alerts}
            onChange={set("workflow_alerts")}
          />
          <Toggle
            label="Something went wrong"
            description="A generation failed and your credits came back."
            tint={AMBER}
            checked={data.ai_alerts}
            onChange={set("ai_alerts")}
          />
          <Toggle
            label="Monthly summary"
            description="How many products you made and roughly what it saved you."
            tint={COBALT}
            checked={data.reports_enabled}
            onChange={set("reports_enabled")}
          />
          <Toggle
            label="News from CowQ"
            description="New features and offers. Off by default — we won't sneak this on."
            tint={MAGENTA}
            checked={data.marketing_enabled}
            onChange={set("marketing_enabled")}
          />
        </div>
      </SectionCard>

      <GlassCard tint={AMBER} hover={false} className="rise-in p-5">
        <div className="flex items-start gap-3">
          <Smartphone className="h-7 w-7 shrink-0" strokeWidth={1.6} style={{ color: AMBER }} />
          <div>
            <h3 className="text-[16px] font-semibold text-ink">Honest note</h3>
            <p className="mt-1 flex items-start gap-1.5 text-[13px] leading-relaxed text-muted">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Email works today. WhatsApp and SMS are still being built — your choices here are saved and will apply the
              moment they go live. We'd rather show you the switch than pretend it doesn't exist.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
