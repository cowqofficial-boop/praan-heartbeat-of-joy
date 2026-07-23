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
import { PageHeader, HelpButton } from "@/components/PageHeader";
import { showAlert, showConfirm } from "@/components/Dialogs";
import { Palette } from "lucide-react";


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
 alert("Couldn't generate your brand model. Try again.\n\n" + (e as Error).message);
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
 alert("Couldn't generate your brand model. Try again.\n\n" + (e as Error).message);
 } finally {
 setModelBusy(false);
 }
 }

 async function removeRealModel() {
 if (!confirm("Delete your model's photos permanently?")) return;
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


 <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-x-10">

 <Field label="Business name">
 <input
 className="h-12 w-full rounded-[12px] bg-raised px-4 text-[16px] text-ink"
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

 <Field label="Brand colours">
 <div className="flex gap-4">
 <ColorInput label="Primary" value={kit.primary_color} onChange={(v) => setKit({ ...kit, primary_color: v })} />
 <ColorInput label="Highlight" value={kit.accent_color} onChange={(v) => setKit({ ...kit, accent_color: v })} />
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
 </Field>

 <div className="mt-2 border-t pt-6">
 <div className="flex items-center gap-2">
   <h2 className="font-display text-[20px] leading-tight text-ink">Model preferences</h2>
   <HelpButton content={<p className="text-muted">Only used when a product needs a person in the photo, like clothing or jewellery. All optional — leave blank to let CowQ decide.</p>} />
 </div>
 <p className="mt-1 text-[13px] text-muted">
 Only used when CowQ needs a person in the shot — clothing, jewellery, footwear, bags, cosmetics. All optional.
 </p>

 <div className="mt-5 flex flex-col gap-4">
 <SelectField label="Gender" options={GENDER} value={kit.model_gender ?? ""} onChange={(v) => setKit({ ...kit, model_gender: v || null })} />
 <SelectField label="Age range" options={AGE} value={kit.model_age ?? ""} onChange={(v) => setKit({ ...kit, model_age: v || null })} />
 <SelectField label="Skin tone" options={SKIN} value={kit.model_skin ?? ""} onChange={(v) => setKit({ ...kit, model_skin: v || null })} />
 <SelectField label="Body type" options={BODY} value={kit.model_body ?? ""} onChange={(v) => setKit({ ...kit, model_body: v || null })} />
 <SelectField label="Regional look" options={REGION} value={kit.model_region ?? ""} onChange={(v) => setKit({ ...kit, model_region: v || null })} />
 </div>
 </div>

 <div className="border-t pt-6">
 <div className="flex items-start justify-between gap-4">
 <div className="flex-1">
 <div className="flex items-center gap-2">
   <h2 className="font-display text-[20px] leading-tight text-ink">Brand model</h2>
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
 const realPhotos = kit.brand_model_photos ?? [];
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
 <div className="flex items-center gap-4 rounded-[12px] bg-surface p-3">
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
 ) : realPhotos.length > 0 ? (
 <RealModelSaved
 photos={realPhotos}
 modelBusy={modelBusy}
 setModelBusy={setModelBusy}
 onRemove={onRemoveReal}
 onReplaced={onUploadedReal}
 />
 ) : (
 <RealModelUploader
 modelBusy={modelBusy}
 setModelBusy={setModelBusy}
 onUploaded={onUploadedReal}
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

function RealModelSaved({
 photos,
 modelBusy,
 setModelBusy,
 onRemove,
 onReplaced,
}: {
 photos: string[];
 modelBusy: boolean;
 setModelBusy: (v: boolean) => void;
 onRemove: () => Promise<void>;
 onReplaced: (urls: string[]) => void;
}) {
 const [changing, setChanging] = useState(false);
 if (changing) {
 return (
 <RealModelUploader
 modelBusy={modelBusy}
 setModelBusy={setModelBusy}
 onUploaded={(urls) => { setChanging(false); onReplaced(urls); }}
 onCancel={() => setChanging(false)}
 />
 );
 }
 return (
 <div className="flex flex-col gap-3 rounded-[12px] bg-surface p-3">
 <div className="flex gap-2">
 {photos.map((p, i) => (
 <img
 key={i}
 src={p}
 alt={`Your model ${i + 1}`}
 className="h-20 w-20 rounded-[10px] object-cover"
 />
 ))}
 </div>
 <div className="flex flex-col gap-2">
 <button
 type="button"
 onClick={() => setChanging(true)}
 disabled={modelBusy}
 className="h-10 rounded-[10px] bg-raised text-[13px] font-semibold text-ink disabled:opacity-60"
 >
 Change model
 </button>
 <button
 type="button"
 onClick={onRemove}
 disabled={modelBusy}
 className="h-10 rounded-[10px] text-[13px] font-medium text-muted underline disabled:opacity-60"
 >
 Remove model
 </button>
 </div>
 </div>
 );
}

function RealModelUploader({
 modelBusy,
 setModelBusy,
 onUploaded,
 onCancel,
}: {
 modelBusy: boolean;
 setModelBusy: (v: boolean) => void;
 onUploaded: (urls: string[]) => void;
 onCancel?: () => void;
}) {
 const [files, setFiles] = useState<File[]>([]);
 const [previews, setPreviews] = useState<string[]>([]);
 const [c1, setC1] = useState(false);
 const [c2, setC2] = useState(false);
 const [c3, setC3] = useState(false);
 const inputRef = useRef<HTMLInputElement>(null);

 function addFiles(fl: FileList | null) {
 if (!fl) return;
 const arr = Array.from(fl).slice(0, 3 - files.length);
 Promise.all(arr.map(fileToDataUrl)).then((urls) => {
 setFiles((f) => [...f, ...arr].slice(0, 3));
 setPreviews((p) => [...p, ...urls].slice(0, 3));
 });
 }

 const canSubmit = files.length > 0 && c1 && c2 && c3 && !modelBusy;

 async function submit() {
 if (!canSubmit) return;
 setModelBusy(true);
 try {
 const dataUrls = await Promise.all(files.map(fileToDataUrl));
 const { urls } = await uploadBrandModelPhotos({
 data: {
 dataUrls,
 consentAgreed: c1,
 consentAdult: c2,
 consentNotPublicFigure: c3,
 },
 });
 onUploaded(urls);
 } catch (e) {
 alert("Couldn't save your model photos.\n\n" + (e as Error).message);
 } finally {
 setModelBusy(false);
 }
 }

 return (
 <div className="flex flex-col gap-4 rounded-[12px] bg-surface p-3">
 <p className="text-[13px] text-muted">
 Upload 1–3 clear photos of your model. One good face shot, and if possible a full-length shot.
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
 {previews.length < 3 && (
 <button
 type="button"
 onClick={() => inputRef.current?.click()}
 className="grid h-20 w-20 place-items-center rounded-[10px] bg-raised text-[22px] text-muted"
 >
 +
 </button>
 )}
 <input
 ref={inputRef}
 type="file"
 accept="image/*"
 multiple
 className="hidden"
 onChange={(e) => addFiles(e.target.files)}
 />
 </div>

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

 <div className="flex flex-col gap-2">
 <button
 type="button"
 onClick={submit}
 disabled={!canSubmit}
 className="h-11 rounded-[10px] bg-primary text-[14px] font-semibold text-white disabled:opacity-50"
 >
 {modelBusy ? "Saving…" : "Save my model"}
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
