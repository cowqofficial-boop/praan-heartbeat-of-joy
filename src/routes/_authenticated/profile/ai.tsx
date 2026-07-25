import { useCallback } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Brain, MessagesSquare, Smile, Wand2 } from "lucide-react";
import { getAiPrefs, saveAiPrefs, type AiPrefs } from "@/lib/profile.functions";
import { COBALT, MAGENTA, AMBER } from "@/lib/page-accent";
import {
  SectionCard,
  SelectField,
  SliderField,
  SaveBadge,
  CardSkeleton,
  GlassCard,
  useAutosave,
} from "@/components/profile/primitives";

export const Route = createFileRoute("/_authenticated/profile/ai")({
  head: () => ({
    meta: [
      { title: "AI preferences — CowQ" },
      { name: "description", content: "Set the voice, length and emoji style CowQ uses when it writes for your shop." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AiTab,
});

const PERSONALITIES = [
  ["friendly", "Friendly — like talking across the counter"],
  ["professional", "Professional — plain and businesslike"],
  ["luxury", "Luxury — restrained and premium"],
  ["sales", "Sales expert — pushes the offer"],
  ["support", "Support agent — patient and helpful"],
  ["spiritual", "Spiritual — warm, traditional, respectful"],
  ["creative", "Creative — playful and unexpected"],
];

const REPLY_STYLES = [
  ["helpful", "Helpful — answers the question first"],
  ["direct", "Direct — no warm-up"],
  ["storyteller", "Storyteller — a line of context first"],
  ["listy", "Bullet points — scannable"],
];

const EMOJI = [
  ["none", "None"],
  ["rare", "Rare — one at most"],
  ["some", "Some — a few, where they help"],
  ["lots", "Lots — festive and lively"],
];

const LENGTH = [
  ["short", "Short — one or two lines"],
  ["medium", "Medium — three short paragraphs"],
  ["long", "Long — full detail for marketplaces"],
];

const SAMPLES: Record<string, string> = {
  friendly: "Solid brass diya, hand-pressed in Moradabad. Holds oil for about four hours. ₹450 a pair.",
  professional: "Hand-pressed brass diya. 8 cm diameter, 210 g. Burn time approximately four hours. ₹450 per pair.",
  luxury: "A brass diya, pressed by hand in Moradabad. Weighted base, four hours of steady flame.",
  sales: "Brass diyas at ₹450 a pair — hand-pressed, four-hour burn. Diwali stock moves fast.",
  support: "This is a hand-pressed brass diya. It holds enough oil for about four hours. Ask us anything before you order.",
  spiritual: "A hand-pressed brass diya from Moradabad, made for the evening lamp. Four hours of steady flame.",
  creative: "Four hours of flame, pressed out of one sheet of brass. Moradabad hands, your shelf.",
};

function AiTab() {
  const getFn = useServerFn(getAiPrefs);
  const saveFn = useServerFn(saveAiPrefs);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["ai-prefs"], queryFn: () => getFn({}) });

  const save = useCallback(
    async (patch: Partial<AiPrefs>) => {
      await saveFn({ data: patch });
      await qc.invalidateQueries({ queryKey: ["ai-prefs"] });
      await qc.invalidateQueries({ queryKey: ["brand-kit"] });
    },
    [saveFn, qc],
  );
  const auto = useAutosave<AiPrefs>(save);

  if (isLoading || !data) return <div className="grid gap-4"><CardSkeleton rows={3} /><CardSkeleton rows={3} /></div>;

  const S = (field: keyof AiPrefs) => (next: string | number, previous: string | number) =>
    auto.queue({ [field]: next } as Partial<AiPrefs>, { [field]: previous } as Partial<AiPrefs>);

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <SaveBadge state={auto.state} error={auto.error} canUndo={auto.canUndo} onUndo={auto.undo} />
      </div>

      <SectionCard
        index={0}
        icon={Brain}
        title="Voice"
        description="How CowQ sounds when it writes your titles, captions and listings."
      >
        <div className="grid gap-4">
          <SelectField
            label="Personality"
            value={data.tone}
            options={PERSONALITIES.map(([v, l]) => ({ value: v, label: l }))}
            onCommit={S("tone")}
          />
          <GlassCard tint={COBALT} hover={false} className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: COBALT }}>
              Sounds like this
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink">
              {SAMPLES[data.tone] ?? SAMPLES.friendly}
            </p>
          </GlassCard>
        </div>
      </SectionCard>

      <SectionCard
        index={1}
        icon={MessagesSquare}
        title="Shape"
        description="How long the writing runs and how it's laid out."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Reply style" value={data.ai_reply_style} options={REPLY_STYLES.map(([v, l]) => ({ value: v, label: l }))} onCommit={S("ai_reply_style")} />
          <SelectField label="Length" value={data.ai_length} options={LENGTH.map(([v, l]) => ({ value: v, label: l }))} onCommit={S("ai_length")} />
        </div>
      </SectionCard>

      <SectionCard
        index={2}
        icon={Smile}
        title="Emoji"
        description="Instagram likes a few. Amazon and Flipkart listings don't."
      >
        <SelectField label="Emoji usage" value={data.ai_emoji_usage} options={EMOJI.map(([v, l]) => ({ value: v, label: l }))} onCommit={S("ai_emoji_usage")} />
      </SectionCard>

      <SectionCard
        index={0}
        icon={Wand2}
        title="How far CowQ strays"
        description="Low keeps it factual and repeatable. High takes more swings — good for social, risky for listings."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <SliderField
            label="Creativity"
            value={data.ai_creativity}
            tint={MAGENTA}
            minLabel="Stick to the facts"
            maxLabel="Try something"
            onCommit={S("ai_creativity")}
          />
          <SliderField
            label="Variation"
            value={data.ai_temperature}
            tint={AMBER}
            minLabel="Same every time"
            maxLabel="Different each time"
            onCommit={S("ai_temperature")}
          />
        </div>
      </SectionCard>

      <p className="text-center text-[13px] text-muted">
        Model looks, attire and poses live in your{" "}
        <Link to="/brand-kit" className="underline" style={{ color: COBALT }}>
          Brand kit
        </Link>
        .
      </p>
    </div>
  );
}
