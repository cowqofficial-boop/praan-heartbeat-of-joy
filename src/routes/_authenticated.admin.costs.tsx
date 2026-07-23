import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listRecentGenerations } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/costs")({
  head: () => ({
    meta: [
      { title: "Admin — cost tracking | PRAAN" },
      { name: "description", content: "Recent generations with model and image counts to work out cost per product." },
      { property: "og:title", content: "PRAAN admin — cost tracking" },
      { property: "og:description", content: "Per-generation model + image usage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminCosts,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    const msg = error instanceof Error ? error.message : String(error);
    const forbidden = msg.includes("Forbidden") || msg.includes("Unauthorized");
    return (
      <main className="mx-auto max-w-[480px] px-4 py-10">
        <h1 className="text-lg font-semibold text-ink">
          {forbidden ? "Admin only" : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-mute">{forbidden ? "You don't have admin access." : msg}</p>
        {!forbidden && (
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="mt-4 h-11 rounded-[12px] border border-[color:var(--color-border)] px-4 text-sm font-semibold"
          >
            Retry
          </button>
        )}
      </main>
    );
  },
  notFoundComponent: () => (
    <main className="mx-auto max-w-[480px] px-4 py-10">
      <p className="text-sm text-mute">Not found.</p>
    </main>
  ),
});

function AdminCosts() {
  const fetchList = useServerFn(listRecentGenerations);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-costs"],
    queryFn: () => fetchList(),
  });

  const totalImages = (data ?? []).reduce((s, r) => s + (r.image_count ?? 0), 0);

  return (
    <main className="mx-auto max-w-[720px] px-4 py-6">
      <h1 className="text-lg font-semibold text-ink">Cost tracking</h1>
      <p className="mt-1 text-sm text-mute">
        Last 100 generations. Total images generated: <strong>{totalImages}</strong>
      </p>
      {isLoading ? (
        <p className="mt-6 text-sm text-mute">Loading…</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-[12px] border border-[color:var(--color-border)] bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-[color:var(--color-surface)] text-[11px] uppercase text-mute">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Image model</th>
                <th className="px-3 py-2">Imgs</th>
                <th className="px-3 py-2">Res</th>
                <th className="px-3 py-2">Text model</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((r) => (
                <tr key={r.id} className="border-t border-[color:var(--color-border)]">
                  <td className="px-3 py-2 whitespace-nowrap text-mute">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 truncate max-w-[140px]" title={r.product_name ?? ""}>
                    {r.product_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-mute">{r.image_model ?? "—"}</td>
                  <td className="px-3 py-2">{r.image_count ?? "—"}</td>
                  <td className="px-3 py-2">{r.image_resolution ?? "—"}</td>
                  <td className="px-3 py-2 text-mute">{r.text_model ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
