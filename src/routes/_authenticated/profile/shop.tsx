import { useCallback, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Globe, Link2, Phone, Share2, Store } from "lucide-react";
import { getMyShop, saveMyShop, type ShopSettings } from "@/lib/shop.functions";
import { SHOP_CONTACT_METHODS, SHOP_SOCIALS, shopUrl, slugError, slugify } from "@/lib/shop";
import { showAlert } from "@/components/Dialogs";
import { AMBER, COBALT, MAGENTA } from "@/lib/page-accent";
import {
  CardSkeleton,
  SaveBadge,
  SectionCard,
  SelectField,
  TextField,
  Toggle,
  useAutosave,
} from "@/components/profile/primitives";

export const Route = createFileRoute("/_authenticated/profile/shop")({
  head: () => ({
    meta: [
      { title: "My shop — CowQ" },
      { name: "description", content: "Your public shop page: address, contact button, links and whether it's live." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ShopTab,
});

function ShopTab() {
  const getFn = useServerFn(getMyShop);
  const saveFn = useServerFn(saveMyShop);
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [slugDraft, setSlugDraft] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["shop-settings"], queryFn: () => getFn({}) });

  const save = useCallback(
    async (patch: Partial<ShopSettings>) => {
      await saveFn({ data: patch });
      await qc.invalidateQueries({ queryKey: ["shop-settings"] });
    },
    [saveFn, qc],
  );
  const auto = useAutosave<ShopSettings>(save);

  const slugMut = useMutation({
    mutationFn: (slug: string) => saveFn({ data: { slug } }),
    onSuccess: () => {
      setSlugDraft(null);
      qc.invalidateQueries({ queryKey: ["shop-settings"] });
    },
    onError: (e) => showAlert({ title: "Could not save that address", body: (e as Error).message }),
  });

  const publishMut = useMutation({
    mutationFn: (published: boolean) => saveFn({ data: { published } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shop-settings"] }),
    onError: (e) => showAlert({ title: "Could not change this", body: (e as Error).message }),
  });

  if (isLoading || !data) return <div className="grid gap-4"><CardSkeleton rows={4} /><CardSkeleton rows={3} /></div>;

  const T = (field: keyof ShopSettings) => (next: string, previous: string) =>
    auto.queue({ [field]: next } as Partial<ShopSettings>, { [field]: previous } as Partial<ShopSettings>);

  const currentSlug = slugDraft ?? data.slug;
  const slugMsg = slugError(slugify(currentSlug));
  const url = data.slug ? shopUrl(data.slug) : "";

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      await showAlert({ title: "Copy it manually", body: url });
    }
  }

  async function shareLink() {
    if (!url) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: data!.shop_name || "My shop", url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    copyLink();
  }

  return (
    <div className="grid gap-4">
      <div className="flex justify-end">
        <SaveBadge state={auto.state} error={auto.error} canUndo={auto.canUndo} onUndo={auto.undo} />
      </div>

      <SectionCard
        index={0}
        icon={Store}
        title="Your public shop"
        description="One page you can send to anyone — WhatsApp, Instagram bio, a card, a QR code."
      >
        <Toggle
          label={data.published ? "Your shop is live" : "Your shop is off"}
          description={
            data.published
              ? "Anyone with the link can see it. Only the items you've switched on are shown."
              : "Nobody can see it yet. Turn this on when you're ready to share."
          }
          checked={data.published}
          tint={data.published ? MAGENTA : COBALT}
          onChange={(next) => publishMut.mutate(next)}
        />

        <div className="mt-3 grid gap-2">
          <label className="text-[12px] font-medium text-muted">Shop address</label>
          <div
            className="flex items-center gap-1 rounded-[10px] px-3"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)" }}
          >
            <span className="shrink-0 py-2.5 text-[14px] text-muted">cowq.app/shop/</span>
            <input
              aria-label="Shop address"
              value={currentSlug}
              placeholder="meera-brass"
              maxLength={40}
              onChange={(e) => setSlugDraft(slugify(e.target.value))}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-ink outline-none"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px]" style={{ color: slugMsg ? AMBER : "var(--muted)" }}>
              {slugMsg ?? "Lowercase letters, numbers and hyphens."}
            </p>
            {slugDraft !== null && !slugMsg && (
              <button
                type="button"
                onClick={() => slugMut.mutate(slugify(currentSlug))}
                disabled={slugMut.isPending}
                className="inline-flex h-9 items-center rounded-[10px] px-3 text-[13px] font-semibold text-ink disabled:opacity-60"
                style={{
                  background: `color-mix(in oklab, ${COBALT} 18%, transparent)`,
                  border: `1px solid color-mix(in oklab, ${COBALT} 36%, transparent)`,
                }}
              >
                {slugMut.isPending ? "Saving…" : "Save address"}
              </button>
            )}
          </div>
        </div>

        {url && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-[10px] px-3 py-2 font-mono text-[13px] text-ink" style={{ background: "rgba(255,255,255,0.04)" }}>
              {url}
            </code>
            <button type="button" onClick={copyLink} className="inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-[14px] font-semibold text-ink" style={{ background: "var(--raised)" }}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" onClick={shareLink} className="inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-[14px] font-semibold text-ink" style={{ background: "var(--raised)" }}>
              <Share2 className="h-4 w-4" />
              Share
            </button>
            <a href={`/shop/${data.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-[12px] px-3.5 text-[14px] font-semibold text-ink" style={{ background: "var(--raised)" }}>
              <ExternalLink className="h-4 w-4" />
              Preview
            </a>
          </div>
        )}
        <p className="mt-2 text-[12px] text-muted">
          Items stay hidden until you switch "Show on my shop" on for each one, in your library.
        </p>
      </SectionCard>

      <SectionCard
        index={1}
        icon={Globe}
        title="What buyers see"
        description="Only what you fill in here appears on the page."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Shop name" value={data.shop_name ?? ""} maxLength={80} placeholder="Meera Brass Works" onCommit={T("shop_name")} />
          <TextField label="Business category" value={data.category ?? ""} maxLength={60} placeholder="Handmade brass décor" onCommit={T("category")} />
          <TextField label="City / area" value={data.city ?? ""} maxLength={60} placeholder="Moradabad" onCommit={T("city")} />
          <TextField label="State / region" value={data.region ?? ""} maxLength={60} placeholder="Uttar Pradesh" onCommit={T("region")} />
          <TextField label="Country" value={data.country ?? ""} maxLength={60} placeholder="India" onCommit={T("country")} />
          <TextField label="Logo image link" value={data.logo_url ?? ""} maxLength={400} placeholder="https://…" onCommit={T("logo_url")} />
        </div>
        <div className="mt-4">
          <TextField
            label="Short bio"
            value={data.bio ?? ""}
            maxLength={400}
            multiline
            placeholder="Third-generation brass workshop. Everything is hand-pressed and finished in our own unit."
            onCommit={T("bio")}
          />
        </div>
      </SectionCard>

      <SectionCard
        index={2}
        icon={Phone}
        title="How buyers reach you"
        description="This is the big button on your shop page. Use a number you're happy to make public."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Contact method"
            value={data.contact_method ?? "whatsapp"}
            options={SHOP_CONTACT_METHODS.map((m) => ({ value: m.id, label: m.label }))}
            onCommit={T("contact_method")}
          />
          <TextField
            label="Number or email"
            value={data.contact_value ?? ""}
            maxLength={120}
            placeholder={SHOP_CONTACT_METHODS.find((m) => m.id === (data.contact_method ?? "whatsapp"))?.placeholder}
            onCommit={T("contact_value")}
          />
        </div>
      </SectionCard>

      <SectionCard
        index={0}
        icon={Link2}
        title="Your links"
        description="Leave anything blank and it simply won't show."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {SHOP_SOCIALS.map((s) => (
            <TextField
              key={s.key}
              label={s.label}
              value={(data[s.key] as string | null) ?? ""}
              maxLength={300}
              placeholder={`${s.prefix}…`}
              onCommit={T(s.key)}
            />
          ))}
        </div>
      </SectionCard>

      <p className="text-center text-[12px]" style={{ color: COBALT }}>
        Everything on this page saves by itself.
      </p>
    </div>
  );
}
