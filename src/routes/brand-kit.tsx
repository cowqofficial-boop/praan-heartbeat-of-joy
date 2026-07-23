import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  generateBrandModelPortrait,
  getMyBrandKit,
  removeRealBrandModel,
  saveMyBrandKit,
  setBrandModelEnabled,
  uploadBrandLogo,
  uploadBrandModelPhotos,
  type BrandKit,
} from "@/lib/brand-kit.functions";
import { PrimaryButton } from "@/components/PrimaryButton";

const searchSchema = z.object({ onboarding: z.boolean().optional() });

export const Route = createFileRoute("/brand-kit")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Your brand kit — PRAAN" },
      { name: "description", content: "Set your business name, logo, brand colours, voice, and AI model preferences so every listing PRAAN writes and shoots sounds and looks like you." },
      { property: "og:title", content: "Your brand kit — PRAAN" },
      { property: "og:description", content: "Business name, logo, colours, voice, and model preferences — used in every future listing." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: BrandKitPage,
});

const TONES = [
  { value: "friendly", label: "Friendly" },
  { value: "premium", label: "Premium" },
  { value: "value", label: "Value-for-money" },
  { value: "traditional", label: "Traditional" },
];

const GENDER = [
  { value: "", label: "Let PRAAN decide" },
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non-binary", label: "Non-binary" },
];
const AGE = [
  { value: "", label: "Let PRAAN decide" },
  { value: "18-25", label: "18–25" },
  { value: "25-35", label: "25–35" },
  { value: "35-50", label: "35–50" },
  { value: "50+", label: "50+" },
];
const SKIN = [
  { value: "", label: "Let PRAAN decide" },
  { value: "fair", label: "Fair" },
  { value: "wheatish", label: "Wheatish" },
  { value: "medium", label: "Medium" },
  { value: "deep", label: "Deep" },
];
const BODY = [
  { value: "", label: "Let PRAAN decide" },
  { value: "slim", label: "Slim" },
  { value: "average", label: "Average" },
  { value: "curvy", label: "Curvy" },
  { value: "plus", label: "Plus" },
];
const REGION = [
  { value: "", label: "Let PRAAN decide" },
  { value: "North Indian", label: "North Indian" },
  { value: "South Indian", label: "South Indian" },
  { value: "East Indian / North-east", label: "East / North-east" },
  { value: "West Indian", label: "West Indian" },
];

const EMPTY_KIT: BrandKit = {
  business_name: "",
  logo_url: null,
  primary_color: "#E0402F",
  accent_color: "#F5A623",
  sells_what: "",
  sells_to: "",
  tone: "friendly",
  model_gender: null,
  model_age: null,
  model_skin: null,
  model_body: null,
  model_region: null,
  brand_model_enabled: false,
  brand_model_url: null,
};

function BrandKitPage() {
  const { onboarding } = Route.useSearch();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [kit, setKit] = useState<BrandKit>(EMPTY_KIT);
  const [busy, setBusy] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [modelBusy, setModelBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate({ to: "/auth", search: { mode: "signin", next: "/brand-kit" } });
        return;
      }
      try {
        const existing = await getMyBrandKit();
        if (existing) setKit({ ...EMPTY_KIT, ...existing });
      } catch { /* first-time user */ }
      setReady(true);
    })();
  }, [navigate]);

  async function handleLogo(file: File) {
    setLogoUploading(true);
    try {
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const { url } = await uploadBrandLogo({ data: { dataUrl } });
      setKit((k) => ({ ...k, logo_url: url }));
    } finally {
      setLogoUploading(false);
    }
  }

  async function save() {
    setBusy(true);
    try {
      await saveMyBrandKit({ data: kit });
      if (onboarding) {
        navigate({ to: "/connect", search: { onboarding: true } });
      } else {
        navigate({ to: "/library" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleBrandModel(next: boolean) {
    if (!next) {
      setKit((k) => ({ ...k, brand_model_enabled: false }));
      try { await setBrandModelEnabled({ data: { enabled: false } }); } catch { /* ignore */ }
      return;
    }
    // Turning on: save current prefs, then generate.
    setModelBusy(true);
    try {
      await saveMyBrandKit({ data: kit });
      const { url } = await generateBrandModelPortrait({ data: {} });
      setKit((k) => ({ ...k, brand_model_url: url, brand_model_enabled: true }));
    } catch (e) {
      alert("Couldn't generate your brand model. Try again.\n\n" + (e as Error).message);
    } finally {
      setModelBusy(false);
    }
  }

  async function regenerateBrandModel() {
    setModelBusy(true);
    try {
      await saveMyBrandKit({ data: kit });
      const { url } = await generateBrandModelPortrait({ data: {} });
      setKit((k) => ({ ...k, brand_model_url: url, brand_model_enabled: true }));
    } catch (e) {
      alert("Couldn't generate your brand model. Try again.\n\n" + (e as Error).message);
    } finally {
      setModelBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[15px] text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col px-5 pb-32 pt-10">
      <h1 className="font-display text-[28px] leading-tight text-ink">
        {onboarding ? "Set up your brand" : "Your brand kit"}
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        {onboarding
          ? "Takes 30 seconds. You can skip and edit later."
          : "Used in every listing PRAAN writes for you."}
      </p>

      <div className="mt-8 flex flex-col gap-6">
        <Field label="Business name">
          <input
            className="h-12 w-full rounded-[12px] border border-[color:var(--color-border)] bg-white px-4 text-[16px] text-ink"
            value={kit.business_name}
            onChange={(e) => setKit({ ...kit, business_name: e.target.value })}
            placeholder="e.g. Rani Handicrafts"
          />
        </Field>

        <Field label="Logo">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid h-20 w-20 place-items-center overflow-hidden rounded-[12px] border border-dashed border-[color:var(--color-border)] bg-surface"
            >
              {kit.logo_url ? (
                <img src={kit.logo_url} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <span className="text-[12px] text-muted">Add</span>
              )}
            </button>
            <div className="text-[13px] text-muted">
              {logoUploading ? "Uploading…" : "PNG or JPG. Square works best."}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLogo(f);
              }}
            />
          </div>
        </Field>

        <Field label="Brand colours">
          <div className="flex gap-4">
            <ColorInput label="Primary" value={kit.primary_color} onChange={(v) => setKit({ ...kit, primary_color: v })} />
            <ColorInput label="Highlight" value={kit.accent_color} onChange={(v) => setKit({ ...kit, accent_color: v })} />
          </div>
        </Field>

        <Field label="What you sell">
          <input
            className="h-12 w-full rounded-[12px] border border-[color:var(--color-border)] bg-white px-4 text-[16px] text-ink"
            value={kit.sells_what}
            onChange={(e) => setKit({ ...kit, sells_what: e.target.value })}
            placeholder="e.g. Handmade brass diyas and puja items"
            maxLength={140}
          />
        </Field>

        <Field label="Who you sell to">
          <input
            className="h-12 w-full rounded-[12px] border border-[color:var(--color-border)] bg-white px-4 text-[16px] text-ink"
            value={kit.sells_to}
            onChange={(e) => setKit({ ...kit, sells_to: e.target.value })}
            placeholder="e.g. Families in metros buying gifts for festivals"
            maxLength={140}
          />
        </Field>

        <Field label="Voice">
          <div className="grid grid-cols-2 gap-2">
            {TONES.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => setKit({ ...kit, tone: t.value })}
                className={`h-12 rounded-[12px] border text-[14px] font-semibold transition-colors ${
                  kit.tone === t.value
                    ? "border-primary bg-primary/10 text-ink"
                    : "border-[color:var(--color-border)] bg-white text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="mt-2 border-t border-[color:var(--color-border)] pt-6">
          <h2 className="font-display text-[20px] leading-tight text-ink">Model preferences</h2>
          <p className="mt-1 text-[13px] text-muted">
            Only used when PRAAN needs a person in the shot — clothing, jewellery, footwear, bags, cosmetics. All optional.
          </p>

          <div className="mt-5 flex flex-col gap-4">
            <SelectField label="Gender" options={GENDER} value={kit.model_gender ?? ""} onChange={(v) => setKit({ ...kit, model_gender: v || null })} />
            <SelectField label="Age range" options={AGE} value={kit.model_age ?? ""} onChange={(v) => setKit({ ...kit, model_age: v || null })} />
            <SelectField label="Skin tone" options={SKIN} value={kit.model_skin ?? ""} onChange={(v) => setKit({ ...kit, model_skin: v || null })} />
            <SelectField label="Body type" options={BODY} value={kit.model_body ?? ""} onChange={(v) => setKit({ ...kit, model_body: v || null })} />
            <SelectField label="Regional look" options={REGION} value={kit.model_region ?? ""} onChange={(v) => setKit({ ...kit, model_region: v || null })} />
          </div>
        </div>

        <div className="border-t border-[color:var(--color-border)] pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="font-display text-[20px] leading-tight text-ink">Brand model</h2>
              <p className="mt-1 text-[13px] text-muted">
                Use the same person in every photo, so your shop looks like one brand.
              </p>
            </div>
            <label className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={kit.brand_model_enabled}
                onChange={(e) => toggleBrandModel(e.target.checked)}
                disabled={modelBusy}
              />
              <span className="h-7 w-12 rounded-full bg-[color:var(--color-border)] transition-colors peer-checked:bg-primary" />
              <span className="absolute left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </label>
          </div>

          {kit.brand_model_enabled && (
            <div className="mt-4 flex items-center gap-4 rounded-[12px] border border-[color:var(--color-border)] bg-surface p-3">
              <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-white">
                {modelBusy ? (
                  <span className="text-[11px] text-muted">Making…</span>
                ) : kit.brand_model_url ? (
                  <img src={kit.brand_model_url} alt="Your brand model" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[11px] text-muted">No model yet</span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <button
                  type="button"
                  onClick={regenerateBrandModel}
                  disabled={modelBusy}
                  className="h-10 rounded-[10px] border border-[color:var(--color-border)] bg-white text-[13px] font-semibold text-ink disabled:opacity-60"
                >
                  {modelBusy ? "Generating…" : "Change model"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleBrandModel(false)}
                  disabled={modelBusy}
                  className="h-10 rounded-[10px] text-[13px] font-medium text-muted underline disabled:opacity-60"
                >
                  Turn off
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <PrimaryButton onClick={save} disabled={busy}>
          {busy ? "Saving…" : onboarding ? "Save brand kit" : "Save changes"}
        </PrimaryButton>
        {onboarding && (
          <button
            type="button"
            onClick={() => navigate({ to: "/library" })}
            className="h-12 text-[14px] font-medium text-muted underline"
          >
            Skip for now
          </button>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[15px] font-medium text-ink">{label}</span>
      {children}
    </div>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[14px] text-ink">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 min-w-[180px] rounded-[10px] border border-[color:var(--color-border)] bg-white px-3 text-[14px] text-ink"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-1 items-center gap-3 rounded-[12px] border border-[color:var(--color-border)] bg-white px-3 py-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-9 cursor-pointer rounded-md border border-[color:var(--color-border)] bg-white"
      />
      <div className="flex flex-col">
        <span className="text-[12px] text-muted">{label}</span>
        <span className="text-[13px] font-medium text-ink">{value.toUpperCase()}</span>
      </div>
    </label>
  );
}
