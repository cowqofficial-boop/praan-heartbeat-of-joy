import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Camera,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Share2,
  SquarePen,
  UserRound,
} from "lucide-react";
import { uploadAvatar, type Profile } from "@/lib/profile.functions";
import { COBALT, MAGENTA, AMBER } from "@/lib/page-accent";
import { GlassCard, Pill } from "./primitives";

type Props = {
  profile: (Profile & { email: string | null; joined_at: string }) | undefined;
  businessName: string | null;
  sellsWhat: string | null;
  planName: string;
  loading: boolean;
};

function initials(name: string | null, email: string | null): string {
  const src = (name || email || "You").trim();
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "Y").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
}

export function ProfileHeaderCard({ profile, businessName, sellsWhat, planName, loading }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const upload = useServerFn(uploadAvatar);
  const qc = useQueryClient();

  const avatarMut = useMutation({
    mutationFn: async (dataUrl: string) => upload({ data: { dataUrl } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => avatarMut.mutate(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    const text = `${businessName || profile?.display_name || "My shop"} — product photos and listings made with CowQ.`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: businessName || "My shop", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareNote("Copied — paste it into WhatsApp.");
      setTimeout(() => setShareNote(null), 3000);
    } catch {
      /* the seller dismissed the share sheet */
    }
  }

  const facts: Array<{ icon: typeof Mail; text: string | null }> = [
    { icon: Mail, text: profile?.email ?? null },
    { icon: Phone, text: profile?.phone ?? null },
    { icon: MapPin, text: [profile?.location, profile?.country].filter(Boolean).join(", ") || null },
    { icon: Globe, text: profile?.website ?? null },
    { icon: Building2, text: sellsWhat || null },
  ];

  return (
    <GlassCard tint={COBALT} className="rise-in overflow-hidden p-0">
      {/* Cobalt → Magenta wash behind the identity block */}
      <div
        className="h-[86px] w-full"
        style={{
          background: `radial-gradient(120% 160% at 10% 0%, color-mix(in oklab, ${COBALT} 42%, transparent) 0%, transparent 60%), radial-gradient(120% 160% at 90% 0%, color-mix(in oklab, ${MAGENTA} 34%, transparent) 0%, transparent 62%)`,
        }}
        aria-hidden
      />
      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <div className="-mt-11 grid grid-cols-[auto_minmax(0,1fr)] items-end gap-4">
          <div className="relative shrink-0">
            <div
              className="grid h-[88px] w-[88px] place-items-center overflow-hidden rounded-full"
              style={{
                background: "var(--raised)",
                border: "2px solid color-mix(in oklab, var(--surface) 60%, #fff 12%)",
                boxShadow: `0 10px 34px color-mix(in oklab, ${COBALT} 32%, transparent)`,
              }}
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name ? `${profile.display_name}'s photo` : "Your photo"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-mono text-[26px] font-semibold text-ink">
                  {initials(profile?.display_name ?? null, profile?.email ?? null)}
                </span>
              )}
            </div>
            <span
              className="absolute bottom-1.5 right-1.5 h-3.5 w-3.5 rounded-full"
              style={{ background: "#2ED47A", border: "2px solid var(--surface)" }}
              title="Signed in"
              aria-label="Signed in"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarMut.isPending}
              aria-label="Upload a profile photo"
              className="absolute -bottom-1 -left-1 grid h-8 w-8 place-items-center rounded-full transition-transform hover:scale-105 disabled:opacity-60"
              style={{ background: COBALT, color: "#fff", boxShadow: `0 6px 18px color-mix(in oklab, ${COBALT} 55%, transparent)` }}
            >
              {avatarMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => pickPhoto(e.target.files?.[0])}
            />
          </div>

          <div className="min-w-0 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-[22px] font-semibold text-ink">
                {loading ? "…" : profile?.display_name || "Add your name"}
              </h2>
              <Pill tint={AMBER}>{planName}</Pill>
            </div>
            <p className="mt-0.5 truncate text-[14px] text-muted">
              {[profile?.role_title || "Shop owner", businessName].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {facts
            .filter((f) => f.text)
            .map((f) => (
              <div key={f.text} className="flex min-w-0 items-center gap-2 text-[13px] text-muted">
                <f.icon className="h-4 w-4 shrink-0" strokeWidth={1.6} style={{ color: COBALT }} />
                <span className="truncate">{f.text}</span>
              </div>
            ))}
          <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted">
            <UserRound className="h-4 w-4 shrink-0" strokeWidth={1.6} style={{ color: COBALT }} />
            <span className="truncate">
              With CowQ since{" "}
              {profile
                ? new Date(profile.joined_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
                : "—"}
            </span>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link
            to="/profile/account"
            className="btn-accent inline-flex h-11 items-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold"
          >
            <SquarePen className="h-4 w-4" /> Edit profile
          </Link>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-11 items-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold text-ink"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)" }}
          >
            <Camera className="h-4 w-4" /> Upload photo
          </button>
          <button
            type="button"
            onClick={share}
            className="inline-flex h-11 items-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold text-ink"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--line)" }}
          >
            <Share2 className="h-4 w-4" /> Share shop
          </button>
          {shareNote && <span className="text-[12px] text-muted">{shareNote}</span>}
          {avatarMut.isError && (
            <span className="text-[12px]" style={{ color: MAGENTA }}>
              {(avatarMut.error as Error).message}
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
