import { useCallback, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { createCheckout } from "@/lib/billing.functions";
import type { Plan } from "@/lib/plans";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

export type RazorpayOptions = {
  key: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  order_id?: string;
  subscription_id?: string;
  prefill?: { email?: string | null };
  notes?: Record<string, string>;
  theme?: { color: string };
  handler?: (r: unknown) => void;
  modal?: { ondismiss?: () => void };
};

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** Shared Razorpay checkout used by both /pricing and /billing. */
export function useRazorpayCheckout(opts?: { signedIn?: boolean | null; next?: string; onDone?: () => void }) {
  const navigate = useNavigate();
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buy = useCallback(
    async (plan: Pick<Plan, "id">) => {
      setError(null);
      if (opts?.signedIn === false) {
        navigate({ to: "/auth", search: { mode: "signup", next: opts?.next ?? "/billing" } });
        return;
      }
      setBuying(plan.id);
      try {
        const ok = await loadRazorpayScript();
        if (!ok) throw new Error("Couldn't load payment window. Check your connection.");
        const params = await createCheckout({ data: { plan_id: plan.id } });
        const rz = new window.Razorpay!({
          key: params.key_id,
          amount: params.amount_paise,
          currency: params.currency,
          name: params.name,
          description: params.description,
          order_id: params.order_id,
          subscription_id: params.subscription_id,
          prefill: { email: params.prefill_email ?? undefined },
          notes: params.notes,
          theme: { color: "#3D5AFE" },
          handler: () => {
            setBuying(null);
            opts?.onDone?.();
            navigate({ to: "/billing" });
          },
          modal: { ondismiss: () => setBuying(null) },
        });
        rz.open();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg.includes("not configured") ? "Payments aren't switched on yet. The seller needs to add Razorpay keys." : msg);
        setBuying(null);
      }
    },
    [navigate, opts],
  );

  return { buy, buying, error, setError };
}
