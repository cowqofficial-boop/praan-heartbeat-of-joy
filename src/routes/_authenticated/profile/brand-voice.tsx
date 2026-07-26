import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookHeart, Camera, MessageSquareQuote, Sparkles } from "lucide-react";
import {
  getMyBrandMemory,
  saveMyBrandMemory,
  getBrandMemoryInsights,
} from "@/lib/brand-memory.functions";
import {
  buildVoicePrompt,
  CTA_OPTIONS,
  EMOJI_OPTIONS,
  ENERGY_OPTIONS,
  FORMALITY_OPTIONS,
  LANGUAGE_OPTIONS,
  LOOK_OPTIONS,
  MOOD_OPTIONS,
  PRICE_OPTIONS,
  PROP_OPTIONS,
  SENTENCE_OPTIONS,
  TONE_OPTIONS,
  type BrandMemory,
} from "@/lib/brand-memory";
import { COBALT, MAGENTA, AMBER } from "@/lib/page-accent";
import {
  SectionCard,
  SelectField,
  TextField,
  SaveBadge,
  CardSkeleton,
  GlassCard,
  useAutosave,
} from "@/components/profile/primitives";

export const Route = createFileRoute("/_authenticated/profile/brand-voice")({
  head: () => ({
    meta: [
      { title: "Brand voice memory — CowQ" },
      {
        name: "description",
        content:
          "Tell CowQ once who your shop is and how it talks. Every photo, listing and caption after that remembers it.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BrandVoiceTab,
});

type Patch = Partial<BrandMemory>;

const opts = (o: [string, string][]) => o.map(([value, label]) => ({ value, label }));

function BrandVoiceTab() {
  const getFn = useServerFn(getMyBrandMemory);
  const saveFn = useServerFn(saveMyBrandMemory);
  const insightsFn = useServerFn(getBrandMemoryInsights);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["brand-memory"],
    queryFn: () => getFn({}),
  });
  const insightsQ = useQuery({
    queryKey: ["brand-memory", "insights"],
    queryFn: () => insightsFn({}),
  });

  const save = useCallback(
    async (patch: Patch) => {
      await saveFn({ data: patch });
      await qc.invalidateQueries({ queryKey: ["brand-memory"] });
    },
    [saveFn, qc],
  );
  const auto = useAutosave<BrandMemory>(save);

  if (isLoading || !data) {
    return (
      <div className="grid gap-4">
        <CardSkeleton rows={3} />
        <CardSkeleton rows={3} />
      </div>
    );
  }

  const m = data.memory;

  // Whole sections are sent each time so a fast typist can't drop a sibling field.
  const setIdentity = (k: keyof BrandMemory["identity"]) => (next: string, prev: string) =>
    auto.queue(
      { identity: { ...m.identity, [k]: next } },
      { identity: { ...m.identity, [k]: prev } },
    );
  const setVoice = (k: keyof BrandMemory["voice"]) => (next: string | number, prev: string | number) =>
    auto.queue(
      { voice: { ...m.voice, [k]: String(next) } },
      { voice: { ...m.voice, [k]: String(prev) } },
    );
  const setComms = (k: keyof BrandMemory["comms"]) => (next: string | number, prev: string | number) =>
    auto.queue(
      { comms: { ...m.comms, [k]: String(next) } },
      { comms: { ...m.comms, [k]: String(prev) } },
    );
  const setPhotos = (k: keyof BrandMemory["photos"]) => (next: string | number, prev: string | number) =>
    auto.queue(
      { photos: { ...m.photos, [k]: String(next) } },
      { photos: { ...m.photos, [k]: String(prev) } },
    );

  const insights = insightsQ.data;

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          Told once, used everywhere — photos, listings, captions and calendar posts.
        </p>
        <SaveBadge state={auto.state} error={auto.error} canUndo={auto.canUndo} onUndo={auto.undo} />
      </div>

      <SectionCard
        index={0}
        icon={BookHeart}
        title="Who your shop is"
        description="The fixed facts CowQ should never have to ask you again."
      >
        <div className="grid gap-4">
          <TextField
            label="What you sell"
            hint="Say it the way you'd say it to a customer at the counter."
            value={m.identity.what_we_sell}
            placeholder="Hand-pressed brass lamps and puja items"
            maxLength={300}
            onCommit={setIdentity("what_we_sell")}
          />
          <TextField
            label="Who buys from you"
            value={m.identity.who_we_serve}
            placeholder="Families buying for festivals, gift shops in Delhi NCR"
            maxLength={300}
            onCommit={setIdentity("who_we_serve")}
          />
          <TextField
            label="What makes your shop different"
            value={m.identity.what_makes_us_different}
            placeholder="Everything pressed by hand in our own workshop, no plating"
            maxLength={400}
            multiline
            onCommit={setIdentity("what_makes_us_different")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Your promise to buyers"
              value={m.identity.promise}
              placeholder="Replaced free if it arrives damaged"
              maxLength={300}
              onCommit={setIdentity("promise")}
            />
            <TextField
              label="City or region"
              value={m.identity.city}
              placeholder="Moradabad"
              maxLength={120}
              onCommit={setIdentity("city")}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        index={1}
        icon={Sparkles}
        title="How your shop sounds"
        description="Applied to every listing, caption and message CowQ writes."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Tone" value={m.voice.tone} options={opts(TONE_OPTIONS)} onCommit={setVoice("tone")} />
          <SelectField label="Formality" value={m.voice.formality} options={opts(FORMALITY_OPTIONS)} onCommit={setVoice("formality")} />
          <SelectField label="Energy" value={m.voice.energy} options={opts(ENERGY_OPTIONS)} onCommit={setVoice("energy")} />
          <SelectField label="Language" value={m.voice.language_mix} options={opts(LANGUAGE_OPTIONS)} onCommit={setVoice("language_mix")} />
          <SelectField label="Emoji" value={m.voice.emoji} options={opts(EMOJI_OPTIONS)} onCommit={setVoice("emoji")} />
          <SelectField label="Sentence length" value={m.voice.sentence_length} options={opts(SENTENCE_OPTIONS)} onCommit={setVoice("sentence_length")} />
        </div>
      </SectionCard>

      <SectionCard
        index={2}
        icon={MessageSquareQuote}
        title="Words and endings"
        description="Your regular opening and sign-off, plus anything CowQ must never say."
      >
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Usual greeting"
              value={m.comms.greeting}
              placeholder="Namaste!"
              maxLength={160}
              onCommit={setComms("greeting")}
            />
            <TextField
              label="Usual sign-off"
              value={m.comms.sign_off}
              placeholder="— Sharma Brass Works"
              maxLength={160}
              onCommit={setComms("sign_off")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Call to action" value={m.comms.cta_style} options={opts(CTA_OPTIONS)} onCommit={setComms("cta_style")} />
            <SelectField label="Price in captions" value={m.comms.price_style} options={opts(PRICE_OPTIONS)} onCommit={setComms("price_style")} />
          </div>
          <TextField
            label="Words you like"
            hint="Comma separated."
            value={m.comms.favourite_words}
            placeholder="hand-pressed, workshop, solid brass"
            maxLength={400}
            onCommit={setComms("favourite_words")}
          />
          <TextField
            label="Words CowQ must never use"
            hint="Comma separated. These are blocked on top of the phrases CowQ already avoids."
            value={m.comms.banned_words}
            placeholder="cheap, luxury, world-class"
            maxLength={400}
            onCommit={setComms("banned_words")}
          />
        </div>
      </SectionCard>

      <SectionCard
        index={0}
        icon={Camera}
        title="How your photos should look"
        description="Applied to every photo CowQ shoots for you, so you stop re-picking the same look."
      >
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Preferred look" value={m.photos.look} options={opts(LOOK_OPTIONS)} onCommit={setPhotos("look")} />
            <SelectField label="Light" value={m.photos.mood} options={opts(MOOD_OPTIONS)} onCommit={setPhotos("mood")} />
            <SelectField label="Props" value={m.photos.props} options={opts(PROP_OPTIONS)} onCommit={setPhotos("props")} />
            <TextField
              label="Surface or setting you like"
              value={m.photos.surface}
              placeholder="Dark wood table, plain cream wall"
              maxLength={300}
              onCommit={setPhotos("surface")}
            />
          </div>
          <TextField
            label="Never show"
            value={m.photos.avoid}
            placeholder="Marble floors, plastic flowers"
            maxLength={300}
            onCommit={setPhotos("avoid")}
          />
        </div>
      </SectionCard>

      <GlassCard tint={COBALT} hover={false} className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: COBALT }}>
          What CowQ remembers about you
        </p>
        <pre className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
          {buildVoicePrompt(m) || "Nothing yet — fill in the sections above."}
        </pre>
      </GlassCard>

      {insights && insights.total > 0 && (
        <GlassCard tint={MAGENTA} hover={false} className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: MAGENTA }}>
            What CowQ has noticed
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-ink">
            {insights.edits} edits, {insights.regenerates} regenerates and {insights.copies} copies so far
            {insights.topSurface ? `, mostly on ${insights.topSurface}` : ""}. CowQ uses this to spot where your
            writing keeps drifting from what it produces.
          </p>
          <p className="mt-2 text-[13px]" style={{ color: AMBER }}>
            Version {data.version} of your brand memory.
          </p>
        </GlassCard>
      )}
    </div>
  );
}
