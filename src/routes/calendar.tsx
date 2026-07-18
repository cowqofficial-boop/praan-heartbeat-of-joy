import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar as CalendarIcon, Check, Copy, Download, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { PostThisButton } from "@/components/PostThisButton";
import { supabase } from "@/integrations/supabase/client";
import {
  POST_TYPE_LABELS,
  generateOnePost,
  getOrCreatePlan,
  listPlanPosts,
  markPosted,
  type PostType,
} from "@/lib/calendar.functions";
import { getMyCredits } from "@/lib/billing.functions";
import { CreditBadge } from "@/components/CreditBadge";
import { Lock } from "lucide-react";

type Post = Awaited<ReturnType<typeof listPlanPosts>>[number];

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Content calendar — PRAAN" },
      {
        name: "description",
        content:
          "A month of ready-to-post product content, generated from your PRAAN library.",
      },
      { property: "og:title", content: "Content calendar — PRAAN" },
      { property: "og:description", content: "30 days of posts, images and captions, done." },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: CalendarPage,
});

function monthStartISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function CalendarPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [authReady, setAuthReady] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const month = monthStartISO();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", search: { mode: "signin", next: "/calendar" }, replace: true });
      } else {
        setAuthReady(true);
      }
    });
  }, [navigate]);

  // Try to find an existing plan on load — silent, non-creating.
  useEffect(() => {
    if (!authReady) return;
    (async () => {
      const { data } = await supabase
        .from("content_plans")
        .select("id")
        .eq("month", month)
        .maybeSingle();
      if (data?.id) setPlanId(data.id);
    })();
  }, [authReady, month]);

  const { data: posts = [] } = useQuery({
    queryKey: ["calendar", planId],
    queryFn: () => listPlanPosts({ data: { plan_id: planId! } }),
    enabled: !!planId,
    refetchInterval: (q) => {
      const rows = (q.state.data as Post[] | undefined) ?? [];
      if (!rows.length) return 1500;
      const anyPending = rows.some((r) => r.status === "pending" || r.status === "generating");
      return anyPending ? 1500 : false;
    },
  });

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await getOrCreatePlan({ data: { month } });
      setPlanId(res.plan_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("NO_PRODUCTS")) {
        setCreateError("Add at least one product first, then plan your month.");
      } else {
        setCreateError("Couldn't start the plan. Try again in a moment.");
      }
    } finally {
      setCreating(false);
    }
  }

  // Background worker: fill posts in as they complete, up to 2 in parallel.
  const runningRef = useRef(false);
  useEffect(() => {
    if (!planId || !posts.length || runningRef.current) return;
    const anyPending = posts.some((p) => p.status === "pending");
    if (!anyPending) return;
    runningRef.current = true;
    let cancelled = false;

    (async () => {
      const CONCURRENCY = 2;
      let idle = 0;
      const worker = async () => {
        while (!cancelled) {
          try {
            const r = await generateOnePost({ data: { plan_id: planId } });
            qc.invalidateQueries({ queryKey: ["calendar", planId] });
            if ("done" in r && r.done) return;
          } catch {
            // brief pause on error, then continue
            await new Promise((res) => setTimeout(res, 1500));
            idle++;
            if (idle > 5) return;
          }
        }
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      runningRef.current = false;
    })();

    return () => {
      cancelled = true;
    };
  }, [planId, posts, qc]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[15px] text-muted">Loading…</p>
      </div>
    );
  }

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayPost = posts.find((p) => p.post_date === todayISO) ?? null;
  const readyCount = posts.filter((p) => p.status === "ready").length;
  const totalCount = posts.length;
  const openPost = posts.find((p) => p.id === openPostId) ?? null;

  return (
    <main className="flex min-h-screen flex-col px-5 pb-16 pt-8">
      <header className="flex items-center justify-between">
        <Link to="/library" className="grid h-10 w-10 -ml-2 place-items-center text-muted hover:text-ink" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-display text-[22px] leading-tight text-ink">Content calendar</h1>
        <CreditBadge />
      </header>

      <CalendarBody
        planId={planId}
        posts={posts}
        todayPost={todayPost}
        readyCount={readyCount}
        totalCount={totalCount}
        onCreate={handleCreate}
        creating={creating}
        createError={createError}
        onOpen={setOpenPostId}
      />

      {openPost && (
        <PostSheet post={openPost} planId={planId!} onClose={() => setOpenPostId(null)} />
      )}
    </main>
  );
}

function CalendarBody({
  planId,
  posts,
  todayPost,
  readyCount,
  totalCount,
  onCreate,
  creating,
  createError,
  onOpen,
}: {
  planId: string | null;
  posts: Post[];
  todayPost: Post | null;
  readyCount: number;
  totalCount: number;
  onCreate: () => void;
  creating: boolean;
  createError: string | null;
  onOpen: (id: string) => void;
}) {
  const { data: credits, isLoading } = useQuery({
    queryKey: ["my-credits"],
    queryFn: () => getMyCredits(),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="mt-10 text-center text-[14px] text-muted">Loading…</div>
    );
  }

  if (credits && !credits.features.calendar) {
    return <CalendarLocked planName={credits.plan_name} />;
  }

  if (!planId) {
    return <EmptyState onCreate={onCreate} creating={creating} error={createError} />;
  }

  return (
    <>
      {totalCount > 0 && readyCount < totalCount && (
        <div className="mt-4 flex items-center gap-3 rounded-[12px] bg-surface px-4 py-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className="flex-1 text-[13px] text-ink">
            Building your month… <span className="text-muted">{readyCount}/{totalCount} ready</span>
          </p>
        </div>
      )}

      {todayPost && (
        <section className="mt-5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Today</p>
          <TodayCard post={todayPost} onOpen={() => onOpen(todayPost.id)} />
        </section>
      )}

      <section className="mt-6">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">This month</p>
        <MonthGrid posts={posts} onOpen={onOpen} />
      </section>
    </>
  );
}

function CalendarLocked({ planName }: { planName: string }) {
  return (
    <div className="mt-10 flex flex-1 flex-col items-center justify-center text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-surface">
        <Lock className="h-8 w-8 text-muted" />
      </div>
      <h2 className="mt-5 font-display text-[26px] leading-tight text-ink">Calendar is on Growth &amp; Pro.</h2>
      <p className="mt-2 max-w-xs text-[15px] text-muted">
        A month of ready-to-post product content — image, caption, hashtags — built from your library. You're on {planName}.
      </p>
      <Link
        to="/pricing"
        className="mt-8 inline-flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-[12px] bg-primary text-[16px] font-semibold text-primary-foreground"
      >
        See plans
      </Link>
    </div>
  );
}

function EmptyState({
  onCreate,
  creating,
  error,
}: {
  onCreate: () => void;
  creating: boolean;
  error: string | null;
}) {
  return (
    <div className="mt-10 flex flex-1 flex-col items-center justify-center text-center">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-surface">
        <CalendarIcon className="h-9 w-9 text-primary" />
      </div>
      <h2 className="mt-5 font-display text-[26px] leading-tight text-ink">A month, sorted.</h2>
      <p className="mt-2 max-w-xs text-[15px] text-muted">
        One post a day for 30 days — image, caption, hashtags — built from your product library.
      </p>
      <button
        type="button"
        onClick={onCreate}
        disabled={creating}
        className="mt-8 flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-[12px] bg-primary px-5 text-[16px] font-semibold text-primary-foreground disabled:opacity-60"
      >
        {creating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> Starting…
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" /> Plan my month
          </>
        )}
      </button>
      {error && <p className="mt-4 text-[14px] text-primary">{error}</p>}
    </div>
  );
}

function TodayCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-2 flex w-full items-center gap-3 overflow-hidden rounded-[16px] border border-[color:var(--color-border)] bg-white p-3 text-left"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[10px] bg-surface">
        {post.image_url ? (
          <img src={post.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-primary">
          {POST_TYPE_LABELS[post.post_type as PostType]}
        </p>
        <p className="mt-0.5 truncate text-[14px] font-semibold text-ink">
          {post.product_name ?? "Product"}
        </p>
        <p className="mt-1 line-clamp-2 text-[12px] text-muted">
          {post.caption ?? (post.status === "error" ? "Couldn't generate. Tap to retry." : "Preparing…")}
        </p>
      </div>
      {post.posted && (
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e8f6ea] text-[#2f8f3d]">
          <Check className="h-4 w-4" />
        </div>
      )}
    </button>
  );
}

function MonthGrid({ posts, onOpen }: { posts: Post[]; onOpen: (id: string) => void }) {
  // 6 rows x 5-day rows keeps thumbs bigger and one-handed friendly
  return (
    <ul className="mt-2 grid grid-cols-5 gap-2">
      {posts.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onOpen(p.id)}
            className="relative block aspect-square w-full overflow-hidden rounded-[10px] border border-[color:var(--color-border)] bg-surface"
          >
            {p.image_url ? (
              <img src={p.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="grid h-full w-full place-items-center">
                {p.status === "error" ? (
                  <X className="h-4 w-4 text-primary" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                )}
              </div>
            )}
            <span className="absolute left-1 top-1 rounded-md bg-black/60 px-1.5 py-[1px] text-[10px] font-semibold leading-none text-white">
              {new Date(p.post_date + "T00:00:00").getDate()}
            </span>
            {p.posted && (
              <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-[#2f8f3d] text-white">
                <Check className="h-2.5 w-2.5" />
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function PostSheet({
  post,
  planId,
  onClose,
}: {
  post: Post;
  planId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const regen = useMutation({
    mutationFn: () => generateOnePost({ data: { plan_id: planId, post_id: post.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar", planId] }),
  });

  const toggle = useMutation({
    mutationFn: () => markPosted({ data: { post_id: post.id, posted: !post.posted } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar", planId] }),
  });

  async function handleCopy() {
    const text = [post.caption ?? "", post.hashtags ?? ""].filter(Boolean).join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleDownload() {
    if (!post.image_url) return;
    const r = await fetch(post.image_url);
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `praan-${post.post_date}-${post.post_type}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const dateLabel = new Date(post.post_date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/40 px-3 py-6 sm:items-center">
      <div className="relative flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-[16px] bg-white">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="overflow-y-auto">
          <div className="aspect-square w-full bg-surface">
            {post.image_url ? (
              <img src={post.image_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center">
                {post.status === "error" ? (
                  <p className="px-6 text-center text-[14px] text-primary">
                    Couldn't generate this post.
                  </p>
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin text-muted" />
                )}
              </div>
            )}
          </div>
          <div className="p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-primary">
              {POST_TYPE_LABELS[post.post_type as PostType]}
            </p>
            <p className="mt-0.5 text-[15px] font-semibold text-ink">{post.product_name}</p>
            <p className="mt-0.5 text-[12px] text-muted">{dateLabel}</p>

            {post.caption && (
              <p className="mt-4 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
                {post.caption}
              </p>
            )}
            {post.hashtags && (
              <p className="mt-3 text-[12px] leading-relaxed text-muted">{post.hashtags}</p>
            )}

            <div className="mt-5 flex flex-col gap-3">
              <PostThisButton
                imageUrl={post.image_url ?? null}
                caption={[post.caption ?? "", post.hashtags ?? ""].filter(Boolean).join("\n\n")}
                productName={post.product_name ?? undefined}
                filenameHint={`${post.post_date}-${post.post_type}`}
                onPosted={() => {
                  if (!post.posted) toggle.mutate();
                }}
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!post.caption}
                  className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[color:var(--color-border)] bg-white text-[14px] font-medium text-ink disabled:opacity-50"
                >
                  {copied ? <Check className="h-4 w-4 text-[#2f8f3d]" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy caption"}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!post.image_url}
                  className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[color:var(--color-border)] bg-white text-[14px] font-medium text-ink disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Download image
                </button>
                <button
                  type="button"
                  onClick={() => regen.mutate()}
                  disabled={regen.isPending}
                  className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[color:var(--color-border)] bg-white text-[14px] font-medium text-ink disabled:opacity-50"
                >
                  {regen.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => toggle.mutate()}
                  className={`flex h-11 items-center justify-center gap-2 rounded-[10px] text-[14px] font-medium ${
                    post.posted
                      ? "bg-[#e8f6ea] text-[#2f8f3d]"
                      : "border border-[color:var(--color-border)] bg-white text-ink"
                  }`}
                >
                  <Check className="h-4 w-4" />
                  {post.posted ? "Posted" : "Mark as posted"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
