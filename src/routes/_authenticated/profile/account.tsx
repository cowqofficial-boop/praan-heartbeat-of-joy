import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Globe2, IdCard, KeyRound, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getMyProfile, saveMyProfile, type Profile } from "@/lib/profile.functions";
import { showAlert, showPrompt } from "@/components/Dialogs";
import { COBALT, MAGENTA, AMBER } from "@/lib/page-accent";
import {
  SectionCard,
  TextField,
  SelectField,
  SaveBadge,
  CardSkeleton,
  useAutosave,
} from "@/components/profile/primitives";

export const Route = createFileRoute("/_authenticated/profile/account")({
  head: () => ({
    meta: [
      { title: "Account settings — CowQ" },
      { name: "description", content: "Your name, contact details, language, currency and password." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountTab,
});

const TIMEZONES = [
  "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York",
];
const LANGUAGES = [
  ["en", "English"], ["hi", "हिन्दी Hindi"], ["mr", "मराठी Marathi"], ["bn", "বাংলা Bengali"],
  ["ta", "தமிழ் Tamil"], ["te", "తెలుగు Telugu"], ["gu", "ગુજરાતી Gujarati"], ["kn", "ಕನ್ನಡ Kannada"],
] as const;
const CURRENCIES = ["INR", "USD", "AED", "GBP", "SGD"];
const DATE_FORMATS = [
  ["dd/mm/yyyy", "25/07/2026"], ["mm/dd/yyyy", "07/25/2026"], ["yyyy-mm-dd", "2026-07-25"],
] as const;
const COUNTRIES = ["India", "United Arab Emirates", "United Kingdom", "United States", "Singapore", "Other"];

function AccountTab() {
  const getFn = useServerFn(getMyProfile);
  const saveFn = useServerFn(saveMyProfile);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["profile"], queryFn: () => getFn({}) });

  const save = useCallback(
    async (patch: Partial<Profile>) => {
      await saveFn({ data: patch });
      await qc.invalidateQueries({ queryKey: ["profile"] });
    },
    [saveFn, qc],
  );
  const auto = useAutosave<Profile>(save);

  const passwordMut = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => showAlert({ title: "Password changed", body: "Use the new one next time you sign in." }),
    onError: (e) => showAlert({ title: "Could not change it", body: (e as Error).message }),
  });

  async function changePassword() {
    const value = await showPrompt({
      title: "New password",
      body: "At least 8 characters. Write it down somewhere safe.",
      label: "New password",
      placeholder: "New password",
      confirmLabel: "Change password",
    });
    if (value === null) return;
    if (value.length < 8) {
      await showAlert({ title: "Too short", body: "Use at least 8 characters." });
      return;
    }
    passwordMut.mutate(value);
  }

  if (isLoading || !data) return <div className="grid gap-4"><CardSkeleton rows={4} /><CardSkeleton rows={3} /></div>;

  const T = (field: keyof Profile) => (next: string, previous: string) =>
    auto.queue({ [field]: next } as Partial<Profile>, { [field]: previous } as Partial<Profile>);

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <SaveBadge state={auto.state} error={auto.error} canUndo={auto.canUndo} onUndo={auto.undo} />
      </div>

      <SectionCard
        index={0}
        icon={IdCard}
        title="Who you are"
        description="This is what shows on your profile and in anything you share."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Your name" value={data.display_name ?? ""} maxLength={120} placeholder="Meera Iyer" onCommit={T("display_name")} />
          <TextField label="What you do" value={data.role_title ?? ""} maxLength={120} placeholder="Shop owner" onCommit={T("role_title")} />
          <TextField label="Email" value={data.email ?? ""} type="email" onCommit={() => {}} hint="Email changes go through sign-in. Contact us if you need to move accounts." />
          <TextField label="Phone" value={data.phone ?? ""} maxLength={32} placeholder="+91 98765 43210" onCommit={T("phone")} />
        </div>
      </SectionCard>

      <SectionCard
        index={1}
        icon={Building2}
        title="Your shop"
        description="Where you are and how customers reach you."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="City / area" value={data.location ?? ""} maxLength={120} placeholder="Jaipur, Rajasthan" onCommit={T("location")} />
          <SelectField
            label="Country"
            value={data.country ?? "India"}
            options={COUNTRIES.map((c) => ({ value: c, label: c }))}
            onCommit={T("country")}
          />
          <TextField label="Website" value={data.website ?? ""} maxLength={240} placeholder="https://myshop.in" onCommit={T("website")} />
          <TextField label="Years in business" value={data.years_in_business ?? ""} maxLength={20} placeholder="6" onCommit={T("years_in_business")} />
          <TextField label="Team size" value={data.team_size ?? ""} maxLength={20} placeholder="Just me" onCommit={T("team_size")} />
        </div>
        <div className="mt-4 grid gap-4">
          <TextField
            label="About your shop"
            value={data.bio ?? ""}
            maxLength={600}
            multiline
            placeholder="We hand-press brass diyas in Moradabad. Third generation."
            hint="CowQ uses this so your listings sound like you, not like a template."
            onCommit={T("bio")}
          />
          <TextField
            label="What you're trying to do"
            value={data.mission ?? ""}
            maxLength={400}
            multiline
            placeholder="Get our brass work in front of buyers outside Moradabad."
            onCommit={T("mission")}
          />
        </div>
      </SectionCard>

      <SectionCard
        index={2}
        icon={Globe2}
        title="Language, money and dates"
        description="How numbers and dates are shown to you across CowQ."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Language" value={data.language ?? "en"} options={LANGUAGES.map(([v, l]) => ({ value: v, label: l }))} onCommit={T("language")} />
          <SelectField label="Time zone" value={data.timezone ?? "Asia/Kolkata"} options={TIMEZONES.map((t) => ({ value: t, label: t.replace("_", " ") }))} onCommit={T("timezone")} />
          <SelectField label="Currency" value={data.currency ?? "INR"} options={CURRENCIES.map((c) => ({ value: c, label: c }))} onCommit={T("currency")} />
          <SelectField label="Date format" value={data.date_format ?? "dd/mm/yyyy"} options={DATE_FORMATS.map(([v, l]) => ({ value: v, label: l }))} onCommit={T("date_format")} />
        </div>
      </SectionCard>

      <SectionCard
        index={0}
        icon={Share2}
        title="Your links"
        description="Added to shareable listings so buyers can find you."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Instagram" value={data.social_instagram ?? ""} maxLength={240} placeholder="https://instagram.com/…" onCommit={T("social_instagram")} />
          <TextField label="WhatsApp / X" value={data.social_twitter ?? ""} maxLength={240} placeholder="https://x.com/…" onCommit={T("social_twitter")} />
          <TextField label="YouTube" value={data.social_youtube ?? ""} maxLength={240} placeholder="https://youtube.com/@…" onCommit={T("social_youtube")} />
          <TextField label="LinkedIn" value={data.social_linkedin ?? ""} maxLength={240} placeholder="https://linkedin.com/in/…" onCommit={T("social_linkedin")} />
        </div>
      </SectionCard>

      <SectionCard
        index={1}
        icon={KeyRound}
        title="Password"
        description="Change the password you use to sign in."
        aside={
          <button
            type="button"
            onClick={changePassword}
            disabled={passwordMut.isPending}
            className="inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-[14px] font-semibold text-ink disabled:opacity-60"
            style={{ background: `color-mix(in oklab, ${MAGENTA} 16%, transparent)`, border: `1px solid color-mix(in oklab, ${MAGENTA} 34%, transparent)` }}
          >
            {passwordMut.isPending ? "Changing…" : "Change password"}
          </button>
        }
      >
        <p className="text-[13px] text-muted">
          If you signed in with Google, you don't have a password here — keep using the Google button.{" "}
          <span style={{ color: AMBER }}>Never share it with anyone, including us.</span>
        </p>
      </SectionCard>

      <p className="text-center text-[12px] text-muted" style={{ color: COBALT }}>
        Everything on this page saves by itself.
      </p>
    </div>
  );
}
