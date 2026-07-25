import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteBrandModel,
  generateBrandModelPortrait,
  getMyBrandKit,
  listMyBrandModels,
  removeRealBrandModel,
  renameBrandModel,
  saveBrandModel,
  saveMyBrandKit,
  setActiveBrandModel,
  setBrandModelEnabled,
  uploadBrandLogo,
  type BrandKit,
  type SavedModel,
} from "@/lib/brand-kit.functions";
import { PrimaryButton } from "@/components/PrimaryButton";
import { PageHeader, HelpButton } from "@/components/PageHeader";
import { showAlert, showConfirm, showPrompt } from "@/components/Dialogs";

import { MessageCircle, Palette, Store, UserRound } from "lucide-react";


const searchSchema = z.object({ onboarding: z.boolean().optional() });

export const Route = createFileRoute("/brand-kit")({
 validateSearch: (s) => searchSchema.parse(s),
 head: () => ({
 meta: [
 { title: "Your brand kit — CowQ" },
 { name: "description", content: "Set your business name, logo, brand colours, voice, and AI model preferences so every listing CowQ writes and shoots sounds and looks like you." },
 { property: "og:title", content: "Your brand kit — CowQ" },
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

const TONE_SAMPLES: Record<string, string> = {
 friendly: "This one's a little beauty — you'll love it.",
 premium: "An exceptional piece, crafted with care.",
 value: "Great quality, honest price.",
 traditional: "A timeless classic for every home.",
};


const GENDER = [
 { value: "", label: "Let CowQ decide" },
 { value: "woman", label: "Woman" },
 { value: "man", label: "Man" },
 { value: "non-binary", label: "Non-binary" },
];
const AGE = [
 { value: "", label: "Let CowQ decide" },
 { value: "18-25", label: "18–25" },
 { value: "25-35", label: "25–35" },
 { value: "35-50", label: "35–50" },
 { value: "50+", label: "50+" },
];
const SKIN = [
 { value: "", label: "Let CowQ decide" },
 { value: "fair", label: "Fair" },
 { value: "wheatish", label: "Wheatish" },
 { value: "medium", label: "Medium" },
 { value: "deep", label: "Deep" },
];
const BODY = [
 { value: "", label: "Let CowQ decide" },
 { value: "slim", label: "Slim" },
 { value: "average", label: "Average" },
 { value: "curvy", label: "Curvy" },
 { value: "plus", label: "Plus" },
];
const REGION = [
 { value: "", label: "Let CowQ decide" },
 { value: "North Indian", label: "North Indian" },
 { value: "South Indian", label: "South Indian" },
 { value: "East Indian / North-east", label: "East / North-east" },
 { value: "West Indian", label: "West Indian" },
];

const CULTURAL = [
 { value: "", label: "Let CowQ decide" },
 { value: "hindu_traditional", label: "Traditional Hindu" },
 { value: "muslim_hijab", label: "Muslim / Hijab" },
 { value: "sikh_turban", label: "Sikh / Turban" },
 { value: "christian", label: "Christian" },
 { value: "south_indian", label: "South Indian traditional" },
 { value: "north_indian", label: "North Indian traditional" },
 { value: "modern_western", label: "Modern / Western" },
 { value: "none", label: "No preference" },
];
const OCCASION = [
 { value: "", label: "Everyday" },
 { value: "diwali", label: "Diwali" },
 { value: "wedding", label: "Wedding" },
 { value: "navratri", label: "Navratri" },
 { value: "eid", label: "Eid" },
 { value: "christmas", label: "Christmas" },
 { value: "summer", label: "Summer" },
 { value: "festive", label: "Festive / general" },
];
const HAIR = [
 { value: "", label: "Let CowQ decide" },
 { value: "short", label: "Short" },
 { value: "long", label: "Long" },
 { value: "tied", label: "Tied up" },
 { value: "covered", label: "Covered" },
];
const EXPRESSION = [
 { value: "", label: "Let CowQ decide" },
 { value: "smile", label: "Warm smile" },
 { value: "neutral", label: "Neutral / calm" },
 { value: "confident", label: "Confident" },
];
const POSE = [
 { value: "", label: "Let CowQ decide" },
 { value: "standing", label: "Standing" },
 { value: "closeup", label: "Close-up detail" },
 { value: "holding", label: "Showing the product in hand" },
];
const NATIONALITY = [
 { value: "", label: "Let CowQ decide" },
 { value: "indian", label: "Indian" },
 { value: "pakistani", label: "Pakistani" },
 { value: "bangladeshi", label: "Bangladeshi" },
 { value: "sri_lankan", label: "Sri Lankan" },
 { value: "nepali", label: "Nepali" },
 { value: "middle_eastern", label: "Middle Eastern / Arab" },
 { value: "southeast_asian", label: "Southeast Asian" },
 { value: "east_asian", label: "East Asian" },
 { value: "african", label: "African" },
 { value: "european", label: "European / Western" },
 { value: "latin_american", label: "Latin American" },
];

const EMPTY_KIT: BrandKit = {
 business_name: "",
 logo_url: null,
 primary_color: "#3D5AFE",
 accent_color: "#FF2FA3",
 sells_what: "",
 sells_to: "",
 tone: "friendly",
 model_gender: null,
 model_age: null,
 model_skin: null,
 model_body: null,
 model_region: null,
 model_nationality: null,
 model_cultural_style: null,
 model_occasion: null,
 model_hair: null,
 model_expression: null,
 model_pose: null,
 brand_model_enabled: false,
 brand_model_url: null,
 brand_model_source: "ai",
 brand_model_photos: [],
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
 // Turning on: default to AI-generated, save prefs, generate portrait.
 setModelBusy(true);
 try {
 await saveMyBrandKit({ data: { ...kit, brand_model_source: "ai" } });
 const { url } = await generateBrandModelPortrait({ data: {} });
 setKit((k) => ({ ...k, brand_model_url: url, brand_model_enabled: true, brand_model_source: "ai" }));
 } catch (e) {
 await showAlert({ title: "Couldn't generate your brand model", body: "Try again.\n\n" + (e as Error).message });
 } finally {
 setModelBusy(false);
 }
 }

 async function regenerateAiBrandModel() {
 setModelBusy(true);
 try {
 await saveMyBrandKit({ data: { ...kit, brand_model_source: "ai" } });
 const { url } = await generateBrandModelPortrait({ data: {} });
 setKit((k) => ({ ...k, brand_model_url: url, brand_model_enabled: true, brand_model_source: "ai", brand_model_photos: [] }));
 } catch (e) {
 await showAlert({ title: "Couldn't generate your brand model", body: "Try again.\n\n" + (e as Error).message });
 } finally {
 setModelBusy(false);
 }
 }

 async function removeRealModel() {
 if (!(await showConfirm({ title: "Delete your model's photos permanently?", body: "You can add new ones any time.", destructive: true, confirmLabel: "Delete" }))) return;
 setModelBusy(true);
 try {
 await removeRealBrandModel();
 setKit((k) => ({ ...k, brand_model_enabled: false, brand_model_source: "ai", brand_model_url: null, brand_model_photos: [] }));
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
 <main className="flex min-h-screen flex-col px-5 pb-32 pt-10 lg:px-0 lg:pt-12">
 <PageHeader
   icon={Palette}
   title={onboarding ? "Set up your brand" : "Your brand"}
   subtitle="Set this once. Every listing CowQ writes will sound like you."
   help={
     <>
       <p className="font-semibold text-ink">Why fill this in</p>
       <p className="mt-1 text-muted">CowQ uses your business name, what you sell and who buys from you to write copy in your voice instead of generic text. It takes two minutes and improves everything you make afterwards.</p>
     </>
   }
 />


 <div className="mt-8 flex flex-col gap-8">

 {/* ── Section 1 — Your business ───────────────────────── */}
 <Section tone="card-cobalt" icon={Store} title="Your business" subtitle="Who you are, in your customers' words.">
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-x-10">
 <Field label="Business name">
 <input
 className="h-12 w-full rounded-[12px] bg-raised px-4 text-[16px] text-ink"
 value={kit.business_name}
 onChange={(e) => setKit({ ...kit, business_name: e.target.value })}
 placeholder="e.g. Rani Handicrafts"
 />
 <div className="mt-1 rounded-[12px] px-3 py-3" style={{ background: "var(--surface)" }}>
 <p className="text-[11px] uppercase tracking-wide text-muted">Preview</p>
 <p className="mt-1 truncate font-display text-[24px] leading-tight text-ink">
 {kit.business_name.trim() || "Your business name"}
 </p>
 </div>
 </Field>

 <Field label="Logo">
 <div className="flex items-center gap-4">
 <button
 type="button"
 onClick={() => fileRef.current?.click()}
 className="grid h-20 w-20 place-items-center overflow-hidden rounded-[12px] bg-surface"
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

 <Field label="What you sell">
 <input
 className="h-12 w-full rounded-[12px] bg-raised px-4 text-[16px] text-ink"
 value={kit.sells_what}
 onChange={(e) => setKit({ ...kit, sells_what: e.target.value })}
 placeholder="e.g. Handmade brass diyas and puja items"
 maxLength={140}
 />
 </Field>

 <Field label="Who you sell to">
 <input
 className="h-12 w-full rounded-[12px] bg-raised px-4 text-[16px] text-ink"
 value={kit.sells_to}
 onChange={(e) => setKit({ ...kit, sells_to: e.target.value })}
 placeholder="e.g. Families in metros buying gifts for festivals"
 maxLength={140}
 />
 </Field>
 </div>
 </Section>

 {/* ── Section 2 — Your voice ──────────────────────────── */}
 <Section tone="card-magenta" icon={MessageCircle} title="Your voice" subtitle="How your listings sound, and the colours behind them.">
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-x-10">
 <Field label="Voice" help={<p className="text-muted">How your listings should sound to a customer.</p>}>
 <div className="grid grid-cols-2 gap-2">
 {TONES.map((t) => (
 <button
 type="button"
 key={t.value}
 onClick={() => setKit({ ...kit, tone: t.value })}
 className={`h-12 rounded-[12px] border text-[14px] font-semibold transition-colors ${
 kit.tone === t.value
 ? "border-primary bg-primary/10 text-ink"
 : "bg-raised text-ink"
 }`}
 >
 {t.label}
 </button>
 ))}
 </div>
 <div className="mt-1 rounded-[12px] px-3 py-3" style={{ background: "var(--surface)" }}>
 <p className="text-[11px] uppercase tracking-wide text-muted">Sounds like</p>
 <p className="mt-1 text-[15px] leading-relaxed text-ink">
 “{TONE_SAMPLES[kit.tone] ?? TONE_SAMPLES.friendly}”
 </p>
 </div>
 </Field>

 <Field label="Brand colours">
 <div className="flex gap-4">
 <ColorInput label="Primary" value={kit.primary_color} onChange={(v) => setKit({ ...kit, primary_color: v })} />
 <ColorInput label="Highlight" value={kit.accent_color} onChange={(v) => setKit({ ...kit, accent_color: v })} />
 </div>
 <div className="mt-1 flex gap-2">
 <span className="h-12 flex-1 rounded-[12px]" style={{ background: kit.primary_color }} />
 <span className="h-12 flex-1 rounded-[12px]" style={{ background: kit.accent_color }} />
 </div>
 </Field>
 </div>
 </Section>

 {/* ── Section 3 — Your model ──────────────────────────── */}
 <Section tone="card-amber" icon={UserRound} title="Your model" subtitle="Only used when a product needs a person — clothing, jewellery, footwear, bags, cosmetics.">
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-x-10">
 <div className="flex flex-col gap-4">
 <div className="flex items-center gap-2">
 <h3 className="text-[15px] font-medium text-ink">Model preferences</h3>
 <HelpButton content={<p className="text-muted">All optional — leave blank to let CowQ decide.</p>} />
 </div>
 <SelectField label="Gender" options={GENDER} value={kit.model_gender ?? ""} onChange={(v) => setKit({ ...kit, model_gender: v || null })} />
 <SelectField label="Age range" options={AGE} value={kit.model_age ?? ""} onChange={(v) => setKit({ ...kit, model_age: v || null })} />
 <SelectField label="Skin tone" options={SKIN} value={kit.model_skin ?? ""} onChange={(v) => setKit({ ...kit, model_skin: v || null })} />
 <SelectField label="Body type" options={BODY} value={kit.model_body ?? ""} onChange={(v) => setKit({ ...kit, model_body: v || null })} />
 <SelectField label="Regional look" options={REGION} value={kit.model_region ?? ""} onChange={(v) => setKit({ ...kit, model_region: v || null })} />
 <div className="flex items-center gap-2 pt-1">
 <span className="text-[14px] font-medium text-ink">Nationality</span>
 <HelpButton content={<p className="text-muted">Shapes the model's overall appearance for that nationality. Optional.</p>} />
 </div>
 <SelectField label="Nationality" options={NATIONALITY} value={kit.model_nationality ?? ""} onChange={(v) => setKit({ ...kit, model_nationality: v || null })} />
 <div className="flex items-center gap-2 pt-1">
 <span className="text-[14px] font-medium text-ink">Cultural style</span>
 <HelpButton content={<p className="text-muted">Dresses and styles the model to suit your customers. About visible attire and presentation, not a person's faith.</p>} />
 </div>
 <SelectField label="Attire" options={CULTURAL} value={kit.model_cultural_style ?? ""} onChange={(v) => setKit({ ...kit, model_cultural_style: v || null })} />
 <div className="flex items-center gap-2 pt-1">
 <span className="text-[14px] font-medium text-ink">Occasion</span>
 <HelpButton content={<p className="text-muted">Styles the shot for a season or festival when it fits the product.</p>} />
 </div>
 <SelectField label="Styling" options={OCCASION} value={kit.model_occasion ?? ""} onChange={(v) => setKit({ ...kit, model_occasion: v || null })} />
 <SelectField label="Hair" options={HAIR} value={kit.model_hair ?? ""} onChange={(v) => setKit({ ...kit, model_hair: v || null })} />
 <SelectField label="Expression" options={EXPRESSION} value={kit.model_expression ?? ""} onChange={(v) => setKit({ ...kit, model_expression: v || null })} />
 <SelectField label="Pose" options={POSE} value={kit.model_pose ?? ""} onChange={(v) => setKit({ ...kit, model_pose: v || null })} />
 </div>

 <div className="flex flex-col gap-4">
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1">
 <div className="flex items-center gap-2">
 <h3 className="text-[15px] font-medium text-ink">Brand model</h3>
 <HelpButton content={<p className="text-muted">Use the same person across every photo so your shop looks like one brand — CowQ can generate a consistent AI model, or you can upload real photos.</p>} />
 </div>
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
 <span className="absolute left-0.5 h-6 w-6 rounded-full bg-raised shadow transition-transform peer-checked:translate-x-5" />
 </label>
 </div>

 {kit.brand_model_enabled && kit.brand_model_url && (
 <div className="overflow-hidden rounded-[12px] bg-surface">
 <img
 src={kit.brand_model_url}
 alt="Your brand model"
 className="aspect-[4/5] w-full object-cover"
 />
 </div>
 )}

 {kit.brand_model_enabled && (
 <BrandModelPanel
 kit={kit}
 setKit={setKit}
 modelBusy={modelBusy}
 onRegenerateAi={regenerateAiBrandModel}
 onRemoveReal={removeRealModel}
 onUploadedReal={(urls) => setKit((k) => ({
 ...k,
 brand_model_photos: urls,
 brand_model_source: "user",
 brand_model_url: urls[0],
 brand_model_enabled: true,
 }))}
 setModelBusy={setModelBusy}
 />
 )}
 </div>
 </div>
 </Section>
 </div>

 <div className="mt-10 flex flex-col gap-3">
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

function Section({
 icon: Icon,
 title,
 subtitle,
 children,
 tone = "card-cobalt",
}: {
 icon: React.ComponentType<{ className?: string }>;
 title: string;
 subtitle: string;
 children: React.ReactNode;
 tone?: string;
}) {
 return (
 <section className={`${tone} p-5 lg:p-6`}>
 <div className="flex items-start gap-3">
 <span
 className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]"
 style={{ background: "color-mix(in oklab, var(--card-accent) 16%, transparent)", color: "var(--card-accent)" }}
 >
 <Icon className="h-6 w-6" />
 </span>
 <div>
 <h2 className="font-display text-[20px] leading-tight text-ink">{title}</h2>
 <p className="mt-1 text-[13px] text-muted">{subtitle}</p>
 </div>
 </div>
 <div className="mt-6">{children}</div>
 </section>
 );
}

function Field({ label, children, help }: { label: string; children: React.ReactNode; help?: React.ReactNode }) {

 return (
 <div className="flex flex-col gap-2">
 <span className="flex items-center gap-1.5 text-[15px] font-medium text-ink">
   {label}
   {help && <HelpButton content={help} />}
 </span>
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
 className="h-11 min-w-[180px] rounded-[10px] bg-raised px-3 text-[14px] text-ink"
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
 <label className="flex flex-1 items-center gap-3 rounded-[12px] bg-raised px-3 py-2">
 <input
 type="color"
 value={value}
 onChange={(e) => onChange(e.target.value)}
 className="h-9 w-9 cursor-pointer rounded-md bg-raised"
 />
 <div className="flex flex-col">
 <span className="text-[12px] text-muted">{label}</span>
 <span className="text-[13px] font-medium text-ink">{value.toUpperCase()}</span>
 </div>
 </label>
 );
}

function BrandModelPanel({
  kit,
  setKit,
  modelBusy,
  setModelBusy,
  onRegenerateAi,
  onRemoveReal,
  onUploadedReal,
}: {
  kit: BrandKit;
  setKit: React.Dispatch<React.SetStateAction<BrandKit>>;
  modelBusy: boolean;
  setModelBusy: (v: boolean) => void;
  onRegenerateAi: () => Promise<void>;
  onRemoveReal: () => Promise<void>;
  onUploadedReal: (urls: string[]) => void;
}) {
  const source = kit.brand_model_source;
  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        {(["ai", "user"] as const).map((v) => (
          <button
            type="button"
            key={v}
            onClick={() => setKit((k) => ({ ...k, brand_model_source: v }))}
            className={`h-11 rounded-[10px] border text-[13px] font-semibold transition-colors ${
              source === v
                ? "border-primary bg-primary/10 text-ink"
                : "bg-raised text-ink"
            }`}
          >
            {v === "ai" ? "AI model" : "My own model"}
          </button>
        ))}
      </div>

      {source === "ai" ? (
        <div className="card-list flex items-center gap-4 p-3">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-raised">
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
              onClick={onRegenerateAi}
              disabled={modelBusy}
              className="h-10 rounded-[10px] bg-raised text-[13px] font-semibold text-ink disabled:opacity-60"
            >
              {modelBusy ? "Generating…" : "Change model"}
            </button>
          </div>
        </div>
      ) : (
        <SavedModelsPanel
          modelBusy={modelBusy}
          setModelBusy={setModelBusy}
          onActivePhotos={onUploadedReal}
          onNoModels={onRemoveReal}
        />
      )}
    </div>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function SavedModelsPanel({
  modelBusy,
  setModelBusy,
  onActivePhotos,
  onNoModels,
}: {
  modelBusy: boolean;
  setModelBusy: (v: boolean) => void;
  onActivePhotos: (urls: string[]) => void;
  onNoModels: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<SavedModel[]>([]);
  const [slots, setSlots] = useState(0);
  const [saveCost, setSaveCost] = useState(30);
  const [adding, setAdding] = useState(false);

  async function refresh(activate = false) {
    try {
      const res = await listMyBrandModels();
      setModels(res.models);
      setSlots(res.slots);
      setSaveCost(res.save_cost);
      if (activate) {
        const active = res.models.find((m) => m.is_active);
        onActivePhotos(active?.photos ?? []);
      }
    } catch (e) {
      await showAlert({ title: "Couldn't load your saved models", body: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  if (loading) {
    return <p className="text-[13px] text-muted">Loading your saved models…</p>;
  }

  if (slots === 0) {
    return (
      <div className="card-list flex flex-col gap-3 p-4">
        <p className="text-[14px] font-semibold text-ink">Saved models are on Growth &amp; Pro</p>
        <p className="text-[13px] text-muted">
          Save real people as reusable models — Growth keeps 3, Pro keeps 10 — so the same person appears
          across every product you shoot.
        </p>
        <button
          type="button"
          onClick={() => navigate({ to: "/pricing" })}
          className="h-11 rounded-[10px] bg-primary text-[14px] font-semibold text-white"
        >
          See Growth &amp; Pro
        </button>
      </div>
    );
  }

  async function activate(id: string) {
    setModelBusy(true);
    try {
      await setActiveBrandModel({ data: { id } });
      await refresh(true);
    } catch (e) {
      await showAlert({ title: "Couldn't switch model", body: (e as Error).message });
    } finally {
      setModelBusy(false);
    }
  }

  async function rename(m: SavedModel) {
    const name = await showPrompt({
      title: "Name this model",
      placeholder: "Priya, Store model…",
      defaultValue: m.name,
      confirmLabel: "Save name",
    });
    if (!name) return;
    setModelBusy(true);
    try {
      await renameBrandModel({ data: { id: m.id, name } });
      await refresh();
    } finally {
      setModelBusy(false);
    }
  }

  async function remove(m: SavedModel) {
    const ok = await showConfirm({
      title: `Delete ${m.name}?`,
      body: "Their photos are deleted permanently from storage. You can add them again any time.",
      destructive: true,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setModelBusy(true);
    try {
      await deleteBrandModel({ data: { id: m.id } });
      const res = await listMyBrandModels();
      setModels(res.models);
      const active = res.models.find((x) => x.is_active);
      if (active) onActivePhotos(active.photos);
      else await onNoModels();
    } catch (e) {
      await showAlert({ title: "Couldn't remove that model", body: (e as Error).message });
    } finally {
      setModelBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-muted">
        {models.length} of {slots} model slots used · {saveCost} credits to save a model
      </p>

      {models.map((m) => (
        <div
          key={m.id}
          className={`card-list flex flex-col gap-3 p-3 ${m.is_active ? "ring-1 ring-primary" : ""}`}
        >
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              {m.photos.slice(0, 3).map((p, i) => (
                <img key={i} src={p} alt={`${m.name} ${i + 1}`} className="h-14 w-14 rounded-[10px] object-cover" />
              ))}
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-ink">{m.name}</p>
              <p className="text-[12px] text-muted">
                {m.photos.length} photo{m.photos.length === 1 ? "" : "s"}
                {m.is_active ? " · in use" : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!m.is_active && (
              <button
                type="button"
                onClick={() => activate(m.id)}
                disabled={modelBusy}
                className="h-9 rounded-[10px] bg-primary px-3 text-[13px] font-semibold text-white disabled:opacity-60"
              >
                Use this model
              </button>
            )}
            <button
              type="button"
              onClick={() => rename(m)}
              disabled={modelBusy}
              className="h-9 rounded-[10px] bg-raised px-3 text-[13px] font-semibold text-ink disabled:opacity-60"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={() => remove(m)}
              disabled={modelBusy}
              className="h-9 px-1 text-[13px] font-medium text-muted underline disabled:opacity-60"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {adding ? (
        <RealModelUploader
          modelBusy={modelBusy}
          setModelBusy={setModelBusy}
          saveCost={saveCost}
          onSaved={async () => {
            setAdding(false);
            await refresh(true);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : models.length < slots ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="h-11 rounded-[10px] bg-raised text-[13px] font-semibold text-ink"
        >
          {models.length === 0 ? "Add your own model" : "Add another model"}
        </button>
      ) : (
        <p className="text-[12px] text-muted">
          All {slots} slots are full. Remove a model to add a different person.
        </p>
      )}
    </div>
  );
}

function RealModelUploader({
  modelBusy,
  setModelBusy,
  saveCost,
  onSaved,
  onCancel,
}: {
  modelBusy: boolean;
  setModelBusy: (v: boolean) => void;
  saveCost: number;
  onSaved: () => void | Promise<void>;
  onCancel?: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const consentGiven = c1 && c2 && c3;

  function addFiles(fl: FileList | null) {
    if (!fl) return;
    const arr = Array.from(fl).slice(0, 5 - files.length);
    Promise.all(arr.map(fileToDataUrl)).then((urls) => {
      setFiles((f) => [...f, ...arr].slice(0, 5));
      setPreviews((p) => [...p, ...urls].slice(0, 5));
    });
  }

  const canSubmit = files.length > 0 && consentGiven && !modelBusy;

  async function submit() {
    if (!canSubmit) return;
    setModelBusy(true);
    try {
      const dataUrls = await Promise.all(files.map(fileToDataUrl));
      await saveBrandModel({
        data: {
          name: name.trim() || "My model",
          dataUrls,
          consentAgreed: c1,
          consentAdult: c2,
          consentNotPublicFigure: c3,
        },
      });
      await onSaved();
    } catch (e) {
      const msg = (e as Error).message;
      const m = /^NO_CREDITS:(\d+):(\d+)$/.exec(msg);
      await showAlert({
        title: m ? "Not enough credits" : "Couldn't save your model photos",
        body: m
          ? `Saving a model costs ${m[1]} credits and you have ${m[2]}. Top up in Billing and try again.`
          : msg,
      });
    } finally {
      setModelBusy(false);
    }
  }

  return (
    <div className="card-list flex flex-col gap-4 p-3">
      <p className="text-[13px] text-muted">
        Add up to 5 clear photos of the person — at least one clear face shot, and a full-length one if you can.
        More angles means the same person stays consistent across every product.
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink">Model name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Priya, Store model…"
          className="h-11 rounded-[10px] bg-raised px-3 text-[14px] text-ink"
        />
      </label>

      {/* Consent gate — photo picker stays disabled until all three are ticked */}
      <div className="flex flex-col gap-2 rounded-[10px] bg-raised p-3">
        <ConsentRow checked={c1} onChange={setC1}>
          This person has agreed to their photos being used to create product images for my shop.
        </ConsentRow>
        <ConsentRow checked={c2} onChange={setC2}>
          This person is 18 or older.
        </ConsentRow>
        <ConsentRow checked={c3} onChange={setC3}>
          This person is not a celebrity or public figure.
        </ConsentRow>
      </div>
      <p className="text-[12px] text-muted">
        You're responsible for having this person's permission. We delete these photos whenever you ask.
      </p>

      <div className="flex flex-wrap gap-2">
        {previews.map((p, i) => (
          <div key={i} className="relative h-20 w-20">
            <img src={p} alt={`Model ${i + 1}`} className="h-20 w-20 rounded-[10px] object-cover" />
            <button
              type="button"
              onClick={() => {
                setFiles((f) => f.filter((_, j) => j !== i));
                setPreviews((pp) => pp.filter((_, j) => j !== i));
              }}
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-[11px] font-bold text-white"
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        ))}
        {previews.length < 5 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!consentGiven}
            aria-label="Add photos"
            className="grid h-20 w-20 place-items-center rounded-[10px] bg-raised text-[22px] text-muted disabled:opacity-40"
          >
            +
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={!consentGiven}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
      {!consentGiven && (
        <p className="text-[12px] text-muted">Tick all three boxes above to add photos.</p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="h-11 rounded-[10px] bg-primary text-[14px] font-semibold text-white disabled:opacity-50"
        >
          {modelBusy ? "Saving…" : `Save my model · ${saveCost} credits`}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={modelBusy}
            className="h-10 rounded-[10px] text-[13px] font-medium text-muted underline disabled:opacity-60"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}


function ConsentRow({
 checked,
 onChange,
 children,
}: {
 checked: boolean;
 onChange: (v: boolean) => void;
 children: React.ReactNode;
}) {
 return (
 <label className="flex items-start gap-3 text-[13px] leading-snug text-ink">
 <input
 type="checkbox"
 checked={checked}
 onChange={(e) => onChange(e.target.checked)}
 className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
 />
 <span>{children}</span>
 </label>
 );
}
