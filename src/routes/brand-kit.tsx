import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getMyBrandKit, saveMyBrandKit, uploadBrandLogo, type BrandKit } from "@/lib/brand-kit.functions";
import { PrimaryButton } from "@/components/PrimaryButton";

const searchSchema = z.object({ onboarding: z.boolean().optional() });

export const Route = createFileRoute("/brand-kit")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Your brand kit — PRAAN" },
      { name: "description", content: "Set your business name, logo, brand colours, and voice so every listing PRAAN writes sounds like you." },
      { property: "og:title", content: "Your brand kit — PRAAN" },
      { property: "og:description", content: "Business name, logo, colours, and voice — used in every future listing." },
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

function BrandKitPage() {
  const { onboarding } = Route.useSearch();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [kit, setKit] = useState<BrandKit>({
    business_name: "",
    logo_url: null,
    primary_color: "#E0402F",
    accent_color: "#F5A623",
    sells_what: "",
    sells_to: "",
    tone: "friendly",
  });
  const [busy, setBusy] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
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
        if (existing) {
          setKit({
            business_name: existing.business_name,
            logo_url: existing.logo_url,
            primary_color: existing.primary_color,
            accent_color: existing.accent_color,
            sells_what: existing.sells_what,
            sells_to: existing.sells_to,
            tone: existing.tone,
          });
        }
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
      navigate({ to: "/library" });
    } finally {
      setBusy(false);
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
