import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Plus, Trash2, X } from "lucide-react";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getBrowserId } from "@/lib/browser-id";
import { uploadOnePhoto } from "@/lib/photo-upload";
import { startGenerationJob, refundGenerationJob } from "@/lib/cowq.functions";
import { generateServiceAndSave } from "@/lib/service.functions";
import {
  CONTACT_METHODS,
  MAX_TIERS,
  SERVICE_CATEGORY_SUGGESTIONS,
  serviceActionKey,
  serviceCost,
  type ContactMethod,
} from "@/lib/service";
import { useAuth } from "@/lib/use-auth";

type Tier = { name: string; price: string; inclusions: string[] };

const Req = () => <span style={{ color: "var(--magenta)" }}> *</span>;

function Field({
  label,
  required,
  hint,
  children,
  error,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-semibold text-ink">
        {label}
        {required && <Req />}
      </span>
      {hint && <span className="mt-0.5 block text-[12px] text-muted">{hint}</span>}
      <div className="mt-1.5">{children}</div>
      {error && (
        <span className="mt-1 block text-[12px]" style={{ color: "var(--magenta)" }}>
          {error}
        </span>
      )}
    </label>
  );
}

const inputCls =
  "w-full rounded-[12px] bg-surface px-3.5 py-3 text-[15px] text-ink outline-none placeholder:text-muted focus:ring-2 focus:ring-primary/60";

export function ServiceForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [flatPrice, setFlatPrice] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [contactMethod, setContactMethod] = useState<ContactMethod>("whatsapp");
  const [contactValue, setContactValue] = useState("");

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasPhoto = !!photoUrl;
  const cost = serviceCost(hasPhoto);

  async function handleFile(file: File) {
    setError(null);
    setUploadPct(0);
    try {
      const { url, previewUrl } = await uploadOnePhoto(file, setUploadPct);
      setPhotoUrl(url);
      setPreview(previewUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That photo didn't upload. Try another one.");
    } finally {
      setUploadPct(null);
    }
  }

  function addTier() {
    if (tiers.length >= MAX_TIERS) return;
    setTiers((t) => [...t, { name: "", price: "", inclusions: [""] }]);
  }

  function updateTier(i: number, patch: Partial<Tier>) {
    setTiers((t) => t.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Give your service a name.";
    if (contactMethod !== "message" && !contactValue.trim())
      e.contact = "Add the number customers should use.";
    if (!flatPrice.trim() && tiers.length === 0)
      e.price = "Add a price or at least one package.";
    tiers.forEach((t, i) => {
      if (!t.name.trim() || !t.price.trim()) e[`tier${i}`] = "Package needs a name and a price.";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (busy) return;
    if (!validate()) return;
    setBusy(true);
    setError(null);
    const browserId = getBrowserId();
    let jobId: string | null = null;
    try {
      setStep("Reserving credits…");
      const job = await startGenerationJob({
        data: { browserId, action: serviceActionKey(hasPhoto) },
      });
      jobId = job.jobId;
      setStep(hasPhoto ? "Making your poster…" : "Designing your poster…");
      const out = await generateServiceAndSave({
        data: {
          jobId: job.jobId,
          browserId,
          name: name.trim(),
          category: category.trim(),
          description: description.trim(),
          photoUrl,
          flatPrice: flatPrice.trim() || null,
          tiers: tiers.map((t) => ({
            name: t.name.trim(),
            price: t.price.trim(),
            inclusions: t.inclusions.map((i) => i.trim()).filter(Boolean),
          })),
          contact: { method: contactMethod, value: contactValue.trim() },
        },
      });
      navigate({ to: "/results/$id", params: { id: out.id } });
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      if (jobId) {
        try {
          await refundGenerationJob({ data: { jobId, browserId, reason: raw.slice(0, 200) } });
        } catch { /* refund is best-effort */ }
      }
      if (raw.startsWith("NO_CREDITS:")) {
        const [, need, have] = raw.split(":");
        setError(`This needs ${need} credits and you have ${have}. Top up on the Pricing page.`);
      } else {
        setError(raw.split("||DETAIL||")[0].trim() || "That didn't work. Try again.");
      }
      setBusy(false);
      setStep(null);
    }
  }

  return (
    <div className="w-full space-y-5">
      {/* Photo — optional */}
      <div>
        {preview ? (
          <div className="relative overflow-hidden rounded-[16px] bg-surface">
            <img src={preview} alt="Service photo" className="aspect-square w-full object-cover" />
            <button
              type="button"
              onClick={() => {
                setPhotoUrl(null);
                setPreview(null);
              }}
              aria-label="Remove photo"
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-ink text-background"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-[16px] bg-surface text-ink"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground">
              <Camera className="h-6 w-6" />
            </span>
            <span className="text-[16px] font-semibold">
              {uploadPct !== null ? `Uploading ${uploadPct}%` : "Add a photo (optional)"}
            </span>
            <span className="px-6 text-center text-[13px] text-muted">
              A real photo of your work or setup makes a stronger poster — and costs fewer credits.
            </span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.currentTarget.value = "";
          }}
        />
      </div>

      <Field label="Service name" required error={errors.name}>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Home AC servicing"
          maxLength={120}
        />
      </Field>

      <Field label="Category" hint="Type your own, or pick a suggestion.">
        <input
          className={inputCls}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Repair & servicing"
          list="service-categories"
          maxLength={80}
        />
        <datalist id="service-categories">
          {SERVICE_CATEGORY_SUGGESTIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SERVICE_CATEGORY_SUGGESTIONS.slice(0, 6).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className="rounded-full bg-surface px-2.5 py-1 text-[12px] text-muted hover:text-ink"
            >
              {c}
            </button>
          ))}
        </div>
      </Field>

      <Field label="What's included" hint="Plain words. What you do, how long it takes, what's covered.">
        <textarea
          className={`${inputCls} min-h-[96px] resize-y`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deep cleaning of indoor and outdoor unit, gas check, filter wash. Takes about an hour per AC."
          maxLength={600}
        />
      </Field>

      {/* Pricing */}
      <div className="rounded-[16px] bg-surface p-4">
        <p className="text-[13px] font-semibold text-ink">
          Price<Req />
        </p>
        <p className="mt-0.5 text-[12px] text-muted">
          One price, or up to {MAX_TIERS} packages.
        </p>

        {tiers.length === 0 && (
          <div className="mt-3">
            <input
              className={inputCls}
              inputMode="numeric"
              value={flatPrice}
              onChange={(e) => setFlatPrice(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="₹ 499"
            />
          </div>
        )}

        <div className="mt-3 space-y-3">
          {tiers.map((t, i) => (
            <div key={i} className="rounded-[12px] bg-raised p-3">
              <div className="flex items-center gap-2">
                <input
                  className={inputCls}
                  value={t.name}
                  onChange={(e) => updateTier(i, { name: e.target.value })}
                  placeholder={`Package ${i + 1} name`}
                  maxLength={40}
                />
                <button
                  type="button"
                  onClick={() => setTiers((cur) => cur.filter((_, idx) => idx !== i))}
                  aria-label="Remove package"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-surface text-muted"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input
                className={`${inputCls} mt-2`}
                inputMode="numeric"
                value={t.price}
                onChange={(e) => updateTier(i, { price: e.target.value.replace(/[^\d.]/g, "") })}
                placeholder="₹ price"
              />
              <div className="mt-2 space-y-2">
                {t.inclusions.map((inc, j) => (
                  <input
                    key={j}
                    className={inputCls}
                    value={inc}
                    onChange={(e) =>
                      updateTier(i, {
                        inclusions: t.inclusions.map((x, k) => (k === j ? e.target.value : x)),
                      })
                    }
                    placeholder="What this package includes"
                    maxLength={120}
                  />
                ))}
                {t.inclusions.length < 3 && (
                  <button
                    type="button"
                    onClick={() => updateTier(i, { inclusions: [...t.inclusions, ""] })}
                    className="text-[12px] font-medium text-muted underline"
                  >
                    Add another line
                  </button>
                )}
              </div>
              {errors[`tier${i}`] && (
                <p className="mt-2 text-[12px]" style={{ color: "var(--magenta)" }}>
                  {errors[`tier${i}`]}
                </p>
              )}
            </div>
          ))}
        </div>

        {tiers.length < MAX_TIERS && (
          <button
            type="button"
            onClick={addTier}
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink"
          >
            <Plus className="h-4 w-4" />
            {tiers.length === 0 ? "Use packages instead" : "Add a package"}
          </button>
        )}

        {errors.price && (
          <p className="mt-2 text-[12px]" style={{ color: "var(--magenta)" }}>
            {errors.price}
          </p>
        )}
      </div>

      {/* Booking */}
      <div className="rounded-[16px] bg-surface p-4">
        <p className="text-[13px] font-semibold text-ink">
          How customers book<Req />
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CONTACT_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setContactMethod(m.id)}
              aria-pressed={contactMethod === m.id}
              className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${
                contactMethod === m.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-raised text-muted"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-muted">
          {CONTACT_METHODS.find((m) => m.id === contactMethod)?.hint}
        </p>
        {contactMethod !== "message" && (
          <>
            <input
              className={`${inputCls} mt-3`}
              inputMode="tel"
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              placeholder="98765 43210"
              maxLength={20}
            />
            {errors.contact && (
              <p className="mt-1 text-[12px]" style={{ color: "var(--magenta)" }}>
                {errors.contact}
              </p>
            )}
          </>
        )}
      </div>

      {error && <p className="text-[14px] text-primary">{error}</p>}

      <PrimaryButton disabled={busy || uploadPct !== null} onClick={handleSubmit}>
        {busy ? (step ?? "Working…") : user ? `Make my service post — ${cost} credits` : "Make my service post"}
      </PrimaryButton>
      <p className="text-center text-[12px] text-muted">
        {hasPhoto
          ? "With a photo we style your real photo into a poster — we never invent results."
          : "With no photo we design a text-and-graphic poster — no fake photos of your work."}
      </p>
    </div>
  );
}
