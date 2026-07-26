import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Check, Copy, Download, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState as UiEmptyState, IllustrationCalendar } from "@/components/EmptyState";

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
import { listMyProducts } from "@/lib/library.functions";
import { COSTS } from "@/lib/plans";

import { CreditBadge } from "@/components/CreditBadge";
import { Lock } from "lucide-react";

type Post = Awaited<ReturnType<typeof listPlanPosts>>[number];

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Content calendar — CowQ" },
      {
        name: "description",
        content:
          "A month of ready-to-post product content, generated from your CowQ library.",
      },
      { property: "og:title", content: "Content calendar — CowQ" },
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
            qc.invalidateQueries({ queryKey: ["my-credits"] });
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
    <main className="flex min-h-screen flex-col px-6 pb-16 pt-8 lg:px-0 lg:pt-12">
      <div className="flex items-center justify-between lg:hidden">
        <Link to="/library" className="grid h-10 w-10 -ml-2 place-items-center text-muted hover:text-ink" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <CreditBadge />
      </div>
      <PageHeader
        icon={CalendarDays}
        title="Your posting month"
        subtitle="Thirty days of posts, planned from the products in your library."
        help={
          <>
            <p className="font-semibold text-ink">How the calendar works</p>
            <p className="mt-1 text-muted">CowQ picks a product for each day and writes a different kind of post — a close-up, an offer, a festival post, a question. Open any day to copy the caption and download the image.</p>
          </>
        }
        action={!planId ? { label: `Plan my month — ${COSTS.calendar_month} credits`, onClick: handleCreate, icon: Sparkles, disabled: creating } : undefined}
      />

      <CalendarExplainer />


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
        <div className="card-list mt-4 flex items-center gap-3 px-4 py-3">
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
  const { data: products = [] } = useQuery({
    queryKey: ["library-products"],
    queryFn: () => listMyProducts(),
    staleTime: 60_000,
  });

  const tiles = products
    .map((p) => p.generated_images?.[0]?.url ?? p.original_image_url)
    .filter((u): u is string => !!u)
    .slice(0, 9);

  const hasProducts = products.length > 0;

  return (
    <div className="mt-8">
      {hasProducts ? (
        <>
          <h2 className="text-center font-display text-[22px] leading-tight text-ink">
            Your {products.length} product{products.length === 1 ? "" : "s"}, ready to post
          </h2>
          <ul className="pointer-events-none mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {tiles.map((url, i) => (
              <li key={i} className="card-list relative aspect-square overflow-hidden p-0">
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  style={{ filter: "blur(14px)", transform: "scale(1.15)" }}
                />
                <span className="absolute inset-0 grid place-items-center">
                  <Lock className="h-4 w-4 text-muted" />
                </span>
                <span className="absolute left-1 top-1 rounded-md bg-black/50 px-1.5 py-[1px] text-[10px] font-semibold leading-none text-white">
                  {i + 1}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="pointer-events-none grid grid-cols-3 gap-2 opacity-60 blur-[2px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-list aspect-square p-2">
              <div className="h-2/3 w-full rounded-[8px]" style={{ background: "var(--raised)" }} />
              <div className="mt-2 h-2 w-2/3 rounded-full" style={{ background: "var(--raised)" }} />
              <div className="mt-1 h-2 w-1/2 rounded-full" style={{ background: "var(--raised)" }} />
            </div>
          ))}
        </div>
      )}

      <div className="card-feature mt-6 flex flex-col items-center p-6 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-surface">
          <Lock className="h-7 w-7 text-muted" />
        </div>
        <h3 className="mt-4 font-display text-[22px] leading-tight text-ink">
          Calendar is on Growth &amp; Pro
        </h3>
        <p className="mt-1 max-w-xs text-[14px] text-muted">
          {hasProducts
            ? `Thirty days of posts, planned from these. You're on ${planName}.`
            : "Add products first, then CowQ plans a month from them."}
        </p>
        <Link
          to="/pricing"
          className="mt-5 inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-[12px] px-5 text-[15px] font-semibold"
          style={{ background: "#3D5AFE", color: "#F5F7FF" }}
        >
          See plans
        </Link>
        <p className="mt-3 max-w-xs text-[12px] text-muted">
          Plan and download every post yourself now — automatic posting to Instagram &amp; Facebook arrives in September.
        </p>
      </div>
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
    <>
      <UiEmptyState
        illustration={<IllustrationCalendar />}
        title="No month planned yet"
        body="CowQ will fill thirty days with posts made from your products. One tap to start."
        action={{ label: creating ? "Starting…" : `Plan my month — ${COSTS.calendar_month} credits`, onClick: onCreate }}
        help={
          <>
            <p className="font-semibold text-ink">How planning works</p>
            <p className="mt-1 text-muted">CowQ picks a product for each day, writes a different kind of post — close-up, offer, festival, question — and prepares an image and caption you can copy.</p>
          </>
        }
      />
      {error && <p className="mt-4 text-center text-[14px] text-primary">{error}</p>}
    </>
  );
}

function TodayCard({ post, onOpen }: { post: Post; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="card-list mt-2 flex w-full items-center gap-3 overflow-hidden p-3 text-left"
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
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-green/15 text-green">
          <Check className="h-4 w-4" />
        </div>
      )}
    </button>
  );
}

function MonthGrid({ posts, onOpen }: { posts: Post[]; onOpen: (id: string) => void }) {
  // 6 rows x 5-day rows keeps thumbs bigger and one-handed friendly
  return (
    <ul className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-7">
      {posts.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onOpen(p.id)}
            className="relative block aspect-square w-full overflow-hidden rounded-[10px] bg-surface"
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
              <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-green text-white">
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar", planId] });
      qc.invalidateQueries({ queryKey: ["my-credits"] });
    },
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
    a.download = `cowq-${post.post_date}-${post.post_type}.png`;
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
      <div className="relative flex max-h-[92vh] w-full max-w-[440px] flex-col overflow-hidden rounded-[16px] bg-raised">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-raised/90 text-ink shadow"
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
                  className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-raised text-[14px] font-medium text-ink disabled:opacity-50"
                >
                  {copied ? <Check className="h-4 w-4 text-green" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy caption"}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!post.image_url}
                  className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-raised text-[14px] font-medium text-ink disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Download image
                </button>
                <button
                  type="button"
                  onClick={() => regen.mutate()}
                  disabled={regen.isPending}
                  className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-raised text-[14px] font-medium text-ink disabled:opacity-50"
                >
                  {regen.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Regenerate · {COSTS.calendar_post}
                </button>
                <button
                  type="button"
                  onClick={() => toggle.mutate()}
                  className={`flex h-11 items-center justify-center gap-2 rounded-[10px] text-[14px] font-medium ${
                    post.posted
                      ? "bg-green/15 text-green"
                      : "bg-raised text-ink"
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
