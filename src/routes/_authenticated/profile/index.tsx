import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BadgeCheck,
  Bot,
  ChevronRight,
  Gauge,
  Palette,
  Quote,
  UserRound,
} from "lucide-react";
import { getMyProfile, getMyActivity } from "@/lib/profile.functions";
import { getMyBrandKit, listMyBrandModels } from "@/lib/brand-kit.functions";
import { listMyChannels } from "@/lib/social.functions";
import { getSecurityOverview } from "@/lib/profile.functions";
import { COBALT, MAGENTA, AMBER } from "@/lib/page-accent";
import {
  GlassCard,
  SectionCard,
  Pill,
  CardSkeleton,
  timeAgo,
} from "@/components/profile/primitives";
import { CompletionRing, CompletionChecklist } from "@/components/profile/CompletionRing";
import { ActivityCard } from "@/components/profile/ActivityTimeline";
import { ProfileEmptyState } from "@/components/profile/ProfileEmptyState";
import { NoModelArt } from "@/components/profile/illustrations";

export const Route = createFileRoute("/_authenticated/profile/")({
  head: () => ({
    meta: [
      { title: "Your profile — CowQ" },
      { name: "description", content: "Your details, your shop, your plan and how CowQ writes for you." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const profileFn = useServerFn(getMyProfile);
  const kitFn = useServerFn(getMyBrandKit);
  const modelsFn = useServerFn(listMyBrandModels);
  const channelsFn = useServerFn(listMyChannels);
  const activityFn = useServerFn(getMyActivity);
  const securityFn = useServerFn(getSecurityOverview);

  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => profileFn({}) });
  const kitQ = useQuery({ queryKey: ["brand-kit"], queryFn: () => kitFn({}) });
  const modelsQ = useQuery({ queryKey: ["brand-models"], queryFn: () => modelsFn({}) });
  const channelsQ = useQuery({ queryKey: ["channels"], queryFn: () => channelsFn({}) });
  const activityQ = useQuery({ queryKey: ["profile", "activity"], queryFn: () => activityFn({}) });
  const securityQ = useQuery({ queryKey: ["profile", "security"], queryFn: () => securityFn({}) });

  const p = profileQ.data;
  const kit = kitQ.data;
  const connected = (channelsQ.data ?? []).filter((c) => c.connected).length;

  const checklist = [
    { label: "Add a profile photo", done: !!p?.avatar_url },
    { label: "Write a short bio", done: !!p?.bio },
    { label: "Confirm your email", done: !!securityQ.data?.email_confirmed },
    { label: "Fill in your brand kit", done: !!kit?.business_name },
    { label: "Connect a shop", done: connected > 0 },
    { label: "Save a model", done: (modelsQ.data?.models.length ?? 0) > 0 },
  ];
  const percent = (checklist.filter((c) => c.done).length / checklist.length) * 100;

  const activeModel = modelsQ.data?.models.find((m) => m.is_active) ?? modelsQ.data?.models[0];

  return (
    <div className="grid gap-4">
      {/* -------- completion -------- */}
      <GlassCard tint={COBALT} hover={false} className="rise-in p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <CompletionRing percent={percent} />
          <div className="min-w-0">
            <h2 className="text-[17px] font-semibold text-ink">Your setup</h2>
            <p className="mt-1 text-[13px] text-muted">
              The more CowQ knows about your shop, the closer the photos and words land.
            </p>
            <div className="mt-4">
              <CompletionChecklist items={checklist} />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* -------- your model -------- */}
      {modelsQ.isLoading ? (
        <CardSkeleton rows={2} />
      ) : activeModel ? (
        <SectionCard
          index={1}
          icon={UserRound}
          title="Your model"
          description="The person CowQ puts your clothes on. Saved photos are used as reference on every on-model shot."
          aside={<Pill tint={MAGENTA}>{activeModel.is_active ? "In use" : "Saved"}</Pill>}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {activeModel.photos.slice(0, 4).map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt={`${activeModel.name}, reference photo ${i + 1}`}
                  className="h-16 w-16 rounded-[10px] object-cover"
                />
              ))}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] text-ink">{activeModel.name}</p>
              <p className="mt-0.5 text-[12px] text-muted">
                Saved {timeAgo(activeModel.created_at)} · {activeModel.photos.length} photos ·{" "}
                {modelsQ.data?.models.length} of {modelsQ.data?.slots} slots used
              </p>
            </div>
            <Link
              to="/brand-kit"
              className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-[14px] font-semibold text-ink"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)" }}
            >
              Manage <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </SectionCard>
      ) : (
        <ProfileEmptyState
          tint={MAGENTA}
          art={<NoModelArt tint={MAGENTA} className="w-full" />}
          title="No saved model yet"
          body="Upload photos of a real person once, and every clothing shot uses the same face. Or let CowQ pick a model for you."
          action={
            <Link
              to="/brand-kit"
              className="btn-accent inline-flex h-11 items-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold"
            >
              Set up your model <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        />
      )}

      {/* -------- how CowQ writes -------- */}
      <SectionCard
        index={2}
        icon={Bot}
        title="How CowQ writes for you"
        description="Your voice settings shape every caption, title and listing."
        aside={
          <Link
            to="/profile/ai"
            className="inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-[14px] font-semibold text-ink"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)" }}
          >
            Change <ChevronRight className="h-4 w-4" />
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Voice", value: kit?.tone ?? "friendly", tint: AMBER },
            { label: "Sells", value: kit?.sells_what || "Not set", tint: COBALT },
            { label: "Sells to", value: kit?.sells_to || "Not set", tint: MAGENTA },
          ].map((f) => (
            <div
              key={f.label}
              className="rounded-[12px] p-3"
              style={{
                background: `color-mix(in oklab, ${f.tint} 9%, rgba(255,255,255,0.02))`,
                border: `1px solid color-mix(in oklab, ${f.tint} 20%, transparent)`,
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: f.tint }}>
                {f.label}
              </p>
              <p className="mt-1 truncate text-[14px] capitalize text-ink">{f.value}</p>
            </div>
          ))}
        </div>
        {p?.bio && (
          <p className="mt-4 flex gap-2 text-[13px] leading-relaxed text-muted">
            <Quote className="h-4 w-4 shrink-0" style={{ color: MAGENTA }} />
            {p.bio}
          </p>
        )}
      </SectionCard>

      {/* -------- quick links -------- */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { to: "/profile/security", icon: BadgeCheck, label: "Security score", value: `${securityQ.data?.score ?? 0}/100`, tint: COBALT },
          { to: "/profile/apps", icon: Palette, label: "Shops connected", value: `${connected} of 3`, tint: MAGENTA },
          { to: "/profile/subscription", icon: Gauge, label: "Plan", value: kit ? "View usage" : "View usage", tint: AMBER },
        ].map((q, i) => (
          <Link key={q.to} to={q.to} className="rise-in" style={{ animationDelay: `${i * 60}ms` }}>
            <GlassCard tint={q.tint} className="h-full p-4">
              <q.icon className="h-5 w-5" strokeWidth={1.7} style={{ color: q.tint }} />
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{q.label}</p>
              <p className="mt-1 font-mono text-[18px] font-semibold text-ink">{q.value}</p>
            </GlassCard>
          </Link>
        ))}
      </div>

      <ActivityCard events={activityQ.data} loading={activityQ.isLoading} />
    </div>
  );
}
