import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

// OAuth landing route — Google popup path handles session via lovable helper,
// but a full-page redirect still lands here. Once the session is set, send the
// user to their library (or brand-kit onboarding if new).
export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing you in — CowQ Ai" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/library" }), 300);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-[15px] text-muted">Signing you in…</p>
    </main>
  );
}
