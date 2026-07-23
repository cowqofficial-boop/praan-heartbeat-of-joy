import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, HelpCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSocialConfig, startInstagramConnect } from "@/lib/social.functions";

export const Route = createFileRoute("/connect/instagram")({
  head: () => ({
    meta: [
      { title: "Connect Instagram — CowQ Ai" },
      { name: "description", content: "Three quick steps to connect your Instagram to CowQ Ai." },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: InstagramWizard,
});

type Step = 0 | 1 | 2;

function InstagramWizard() {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [step, setStep] = useState<Step>(0);
  const [busy, setBusy] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", search: { mode: "signin", next: "/connect/instagram" }, replace: true });
      } else {
        setAuthReady(true);
      }
    });
  }, [navigate]);

  const { data: config } = useQuery({
    queryKey: ["social-config"],
    queryFn: () => getSocialConfig(),
    enabled: authReady,
  });

  async function beginOAuth() {
    setBusy(true);
    try {
      const res = await startInstagramConnect();
      if (!res.configured) {
        setNotConfigured(true);
        return;
      }
      window.location.href = res.url;
    } finally {
      setBusy(false);
    }
  }

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[15px] text-muted">Loading…</p>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col px-5 pb-24 pt-8">
      <header className="flex items-center gap-3">
        <Link to="/connect" className="grid h-10 w-10 place-items-center rounded-full text-muted" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-[12px] font-medium text-muted">Step {step + 1} of 3</p>
          <div className="mt-1 flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-[color:var(--color-border)]"}`}
              />
            ))}
          </div>
        </div>
      </header>

      {step === 0 && (
        <WizardStep
          illustration="📱"
          title="Switch Instagram to a Professional account"
          body="It's free and takes 30 seconds. On Instagram, tap:"
          path="Settings → Account type and tools → Switch to professional account → Business"
          why="Instagram only lets apps post to Professional accounts. This is Instagram's rule, not ours."
        />
      )}
      {step === 1 && (
        <WizardStep
          illustration="🔗"
          title="Link it to a Facebook Page"
          body="In Instagram, connect your Professional account to a Facebook Page. Don't have one? You can create it in the same screen — it takes a minute."
          path="Instagram → Edit profile → Page → Connect or Create"
          why="Instagram posts are published through a Facebook Page. That's how Meta's API works."
        />
      )}
      {step === 2 && (
        <div className="mt-8 flex flex-1 flex-col">
          <div className="grid h-32 place-items-center rounded-[16px] bg-[#FFF6EC] text-4xl">🎉</div>
          <h2 className="mt-6 font-display text-[24px] leading-tight text-ink">Now link it to CowQ Ai</h2>
          <p className="mt-2 text-[15px] text-muted">
            We'll open Facebook so you can approve access. You'll come right back here.
          </p>
          {notConfigured && (
            <div className="mt-4 rounded-[12px] border border-[color:var(--color-border)] bg-[#FDECEC] p-3 text-[13px] text-ink">
              Instagram connect isn't switched on yet on this app. Ask the CowQ Ai team to finish setup — you'll be able to connect right after.
            </div>
          )}
          <WhyLink text="Why do you need this? So CowQ Ai can publish posts on your behalf when you tap 'Post from CowQ Ai'." />
        </div>
      )}

      <div className="mt-auto pt-8">
        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s + 1) as Step)}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[12px] bg-primary text-[16px] font-semibold text-primary-foreground"
          >
            Next <ArrowRight className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={beginOAuth}
            disabled={busy || notConfigured}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[12px] bg-primary text-[16px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {busy ? "Opening Facebook…" : "Connect with Facebook"}
          </button>
        )}
      </div>
    </main>
  );
}

function WizardStep({
  illustration,
  title,
  body,
  path,
  why,
}: {
  illustration: string;
  title: string;
  body: string;
  path: string;
  why: string;
}) {
  return (
    <div className="mt-8 flex flex-1 flex-col">
      <div className="grid h-32 place-items-center rounded-[16px] bg-[#FFF6EC] text-4xl">{illustration}</div>
      <h2 className="mt-6 font-display text-[24px] leading-tight text-ink">{title}</h2>
      <p className="mt-2 text-[15px] text-muted">{body}</p>
      <div className="mt-3 rounded-[12px] bg-[#F5F1EA] p-3 text-[14px] font-medium text-ink">{path}</div>
      <WhyLink text={why} />
    </div>
  );
}

function WhyLink({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[13px] font-medium text-primary"
      >
        <HelpCircle className="h-4 w-4" />
        Why do I need this?
      </button>
      {open && <p className="mt-2 text-[13px] text-muted">{text}</p>}
    </div>
  );
}
