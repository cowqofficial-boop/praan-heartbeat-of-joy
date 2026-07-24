import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { getBrowserId } from "@/lib/browser-id";
import { claimAnonProducts } from "@/lib/library.functions";
import { clearFreeGenerationFlag } from "@/lib/use-auth";

type Mode = "signup" | "signin";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  initialMode?: Mode;
  title?: string;
  subtitle?: string;
};

function scorePassword(pw: string): number {
  if (!pw) return 0;
  let variety = 0;
  if (/[a-z]/.test(pw)) variety++;
  if (/[A-Z]/.test(pw)) variety++;
  if (/\d/.test(pw)) variety++;
  if (/[^A-Za-z0-9]/.test(pw)) variety++;
  const len = pw.length;
  if (len < 8) return 1; // weak
  if (len >= 14 && variety >= 3) return 4;
  if (len >= 12 || variety >= 3) return 3;
  if (len >= 8) return 2;
  return 1;
}

const STRENGTH_META = [
  { label: "", color: "transparent" },
  { label: "Weak", color: "var(--color-highlight)" }, // Synth Magenta
  { label: "Fair", color: "#FF8A1E" }, // Toxic Amber
  { label: "Good", color: "var(--color-primary)" }, // Electric Cobalt
  { label: "Strong", color: "var(--color-primary)" },
];

export function AuthModal({
  open,
  onClose,
  onSuccess,
  initialMode = "signup",
  title,
  subtitle,
}: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  console.log("[AuthModal] render, open=", open);
  if (!open || typeof document === "undefined") return null;

  const strength = scorePassword(password);
  const passwordsMatch = password === confirm;
  const meetsMin = strength >= 2;
  const canSubmit =
    mode === "signin"
      ? email.trim().length > 3 && password.length >= 6
      : email.trim().length > 3 && meetsMin && passwordsMatch;

  async function afterAuth() {
    try {
      await claimAnonProducts({ data: { browserId: getBrowserId() } });
    } catch {
      /* ignore */
    }
    clearFreeGenerationFlag();
    await onSuccess();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
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
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
      await afterAuth();
      onClose();
    } catch (e) {
      setErr((e as Error).message || "Something went wrong.");
      setBusy(false);
    }
  }

  async function google() {
    setErr(null);
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth/callback",
      });
      if (result.error) throw result.error;
      if (result.redirected) return; // browser will navigate away
      await afterAuth();
      onClose();
    } catch (e) {
      setErr((e as Error).message || "Google sign-in failed.");
      setBusy(false);
    }
  }

  const isSignup = mode === "signup";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(6,7,10,0.72)", backdropFilter: "blur(10px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        ref={dialogRef}
        className="scale-in raised-lift relative w-full max-w-[420px] rounded-[16px] bg-raised p-6"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-muted hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 id="auth-modal-title" className="font-display text-[24px] leading-tight text-ink">
          {title ?? (isSignup ? "Create a free account" : "Welcome back")}
        </h2>
        <p className="mt-1 text-[14px] text-muted">
          {subtitle ??
            (isSignup
              ? "Your product details are saved. Sign up and make three more, free."
              : "Sign in to keep going.")}
        </p>

        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-[12px] text-[15px] font-semibold disabled:opacity-60"
          style={{ background: "var(--color-pearl, #F5F7FF)", color: "#06070A" }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-[12px] uppercase tracking-wide text-muted">
          <div className="h-px flex-1 bg-[color:var(--color-border)]" />
          <span>or</span>
          <div className="h-px flex-1 bg-[color:var(--color-border)]" />
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-[12px] bg-surface px-3 text-[15px] text-ink"
              placeholder="you@example.com"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink">
            Password
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-[12px] bg-surface px-3 pr-10 text-[15px] text-ink"
                placeholder={isSignup ? "At least 8 characters" : "Your password"}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-2 grid w-8 place-items-center text-muted hover:text-ink"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {isSignup && (
            <>
              <div className="flex items-center gap-1.5" aria-label="Password strength">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full bg-surface"
                    style={{
                      background:
                        strength >= i ? STRENGTH_META[strength].color : "var(--color-border)",
                      transition: "background 160ms",
                    }}
                  />
                ))}
                <span
                  className="ml-2 min-w-[44px] text-right text-[12px] font-medium"
                  style={{ color: STRENGTH_META[strength].color }}
                >
                  {STRENGTH_META[strength].label}
                </span>
              </div>
              <p className="-mt-1 text-[12px] text-muted">
                At least 8 characters. Longer is better than complicated.
              </p>

              <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink">
                Confirm password
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onBlur={() => setConfirmTouched(true)}
                    className="h-11 w-full rounded-[12px] bg-surface px-3 pr-10 text-[15px] text-ink"
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-2 grid w-8 place-items-center text-muted hover:text-ink"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              {confirmTouched && confirm.length > 0 && !passwordsMatch && (
                <p className="text-[12px]" style={{ color: "var(--color-highlight)" }}>
                  Passwords don't match
                </p>
              )}
            </>
          )}

          {err && (
            <p className="text-[13px]" style={{ color: "var(--color-highlight)" }}>
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || busy}
            className="btn-accent mt-1 flex h-12 w-full items-center justify-center rounded-[14px] text-[15px] font-semibold disabled:opacity-50"
          >
            {busy
              ? "One moment…"
              : isSignup
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-[13px] text-muted">
          {isSignup ? "Already have an account? " : "New here? "}
          <button
            type="button"
            onClick={() => {
              setMode(isSignup ? "signin" : "signup");
              setErr(null);
            }}
            className="font-medium underline"
            style={{ color: "var(--color-primary)" }}
          >
            {isSignup ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>
    </div>,
    document.body,
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
