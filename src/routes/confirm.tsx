import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePraanStore } from "@/lib/praan-store";
import { PrimaryButton } from "@/components/PrimaryButton";

export const Route = createFileRoute("/confirm")({
  head: () => ({
    meta: [
      { title: "Confirm your product details — PRAAN" },
      {
        name: "description",
        content:
          "Review the product name, price, and detail PRAAN picked up from your photo before generating your marketplace listing.",
      },
      { property: "og:title", content: "Confirm your product details — PRAAN" },
      {
        property: "og:description",
        content: "Review the product details PRAAN detected before generating your listing.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://praan-heartbeat-of-joy.lovable.app/confirm" },
      { name: "robots", content: "noindex, follow" },
    ],
    links: [{ rel: "canonical", href: "https://praan-heartbeat-of-joy.lovable.app/confirm" }],
  }),
  component: Confirm,
});

function Confirm() {
  const navigate = useNavigate();
  const { originalDataUrl, identified, setForm } = usePraanStore();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (!identified || !originalDataUrl) {
      navigate({ to: "/", replace: true });
      return;
    }
    setName(identified.name);
    setDetail(identified.features?.[0] ?? identified.material ?? "");
  }, [identified, originalDataUrl, navigate]);

  if (!identified || !originalDataUrl) return null;

  const canSubmit = name.trim().length > 0 && price.trim().length > 0;

  return (
    <main className="flex min-h-screen flex-col px-5 pb-28 pt-8">
      <h1 className="font-display text-[28px] leading-tight text-ink">
        Confirm your product details
      </h1>
      <p className="mt-1 text-[15px] text-muted">Change anything that's off.</p>

      <div className="mt-6 overflow-hidden rounded-[12px] bg-surface">
        <img
          src={originalDataUrl}
          alt="Your product"
          className="aspect-square w-full object-cover"
        />
      </div>

      <div className="mt-6 flex flex-col gap-5">
        <Field htmlFor="product-name" label="Product name">
          <input
            id="product-name"
            className="h-12 w-full rounded-[12px] border border-[color:var(--color-border)] bg-white px-4 text-[16px] text-ink"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Brass diya set"
          />
        </Field>
        <Field htmlFor="product-price" label="Price (₹)">
          <input
            id="product-price"
            inputMode="numeric"
            className="h-12 w-full rounded-[12px] border border-[color:var(--color-border)] bg-white px-4 text-[16px] text-ink"
            value={price}
            onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="499"
          />
        </Field>
        <Field htmlFor="product-detail" label="One detail worth knowing">
          <input
            id="product-detail"
            className="h-12 w-full rounded-[12px] border border-[color:var(--color-border)] bg-white px-4 text-[16px] text-ink"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Handmade, cotton, 6-inch, etc."
          />
        </Field>
      </div>

      <PrimaryButton
        fixed
        disabled={!canSubmit}
        onClick={() => {
          setForm({ name: name.trim(), price: price.trim(), detail: detail.trim() });
          navigate({ to: "/generating" });
        }}
      >
        Create my listing
      </PrimaryButton>
    </main>
  );
}

function Field({
  htmlFor,
  label,
  children,
}: {
  htmlFor: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[15px] font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}
