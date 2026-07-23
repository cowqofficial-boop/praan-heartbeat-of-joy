import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getBrowserId } from "@/lib/browser-id";
import { claimAnonProducts } from "@/lib/library.functions";
import { clearFreeGenerationFlag } from "@/lib/use-auth";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — CowQ Ai" },
      { name: "description", content: "Sign in or create a free CowQ Ai account to save your products, download files, and generate more listings." },
      { property: "og:title", content: "Sign in — CowQ Ai" },
      { property: "og:description", content: "Save your products, download files, and generate more listings." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const { mode: initial = "signup", next } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  async function afterAuth() {
    try {
      await claimAnonProducts({ data: { browserId: getBrowserId() } });
    } catch { /* ignore */ }
    clearFreeGenerationFlag();
    if (next) {
      navigate({ to: next });
    } else if (mode === "signup") {
      navigate({ to: "/brand-kit", search: { onboarding: true } });
    } else {
      navigate({ to: "/library" });
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setErr("Check your email to confirm, then sign in.");
          setMode("signin");
          setBusy(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await afterAuth();
    } catch (e) {
      setErr((e as Error).message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setErr(null);
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth/callback",
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      await afterAuth();
    } catch (e) {
      setErr((e as Error).message || "Google sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col px-5 pb-16 pt-10">
      <Link to="/" className="text-[14px] font-medium text-muted">← Back</Link>
      <h1 className="mt-6 font-display text-[32px] leading-tight text-ink">
        {mode === "signup" ? "Save your work." : "Welcome back."}
      </h1>
      <p className="mt-2 text-[15px] text-muted">
        {mode === "signup"
          ? "Create a free account to keep your products and download files."
          : "Sign in to your CowQ Ai account."}
      </p>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={busy}
        className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-[12px] border border-[color:var(--color-border)] bg-raised text-[15px] font-semibold text-ink disabled:opacity-60"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3 text-[13px] text-muted">
        <div className="h-px flex-1 bg-[color:var(--color-border)]" />
        <span>or</span>
        <div className="h-px flex-1 bg-[color:var(--color-border)]" />
      </div>

      <form onSubmit={handleEmail} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-[15px] font-medium text-ink">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-[12px] border border-[color:var(--color-border)] bg-raised px-4 text-[16px] text-ink"
            placeholder="you@example.com"
          />
        </label>
        <label className="flex flex-col gap-2 text-[15px] font-medium text-ink">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-[12px] border border-[color:var(--color-border)] bg-raised px-4 text-[16px] text-ink"
            placeholder="At least 6 characters"
          />
        </label>
        {err && <p className="text-[14px] text-primary">{err}</p>}
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? "One moment…" : mode === "signup" ? "Create account" : "Sign in"}
        </PrimaryButton>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
        className="mt-6 text-center text-[14px] font-medium text-muted underline"
      >
        {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
      </button>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
