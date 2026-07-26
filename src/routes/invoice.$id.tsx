import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";
import { getMyInvoice, type InvoiceRow } from "@/lib/billing.functions";
import { SELLER, rupees } from "@/lib/invoice";

export const Route = createFileRoute("/invoice/$id")({
  head: () => ({
    meta: [
      { title: "Invoice — CowQ" },
      { name: "description", content: "Your CowQ payment invoice." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InvoicePage,
});

function InvoicePage() {
  const { id } = Route.useParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
  }, []);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => getMyInvoice({ data: { id } }),
    enabled: ready,
  });

  return (
    <main className="mx-auto w-full max-w-[820px] px-5 pb-16 pt-8">
      <div className="flex items-center justify-between print:hidden">
        <BackButton fallback="/billing" />
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-10 items-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold"
          style={{ background: "#3D5AFE", color: "#F5F7FF" }}
        >
          <Printer className="h-4 w-4" /> Download / print
        </button>
      </div>

      {!ready || isLoading ? (
        <p className="mt-10 text-[15px] text-muted">Loading…</p>
      ) : !invoice ? (
        <p className="mt-10 text-[15px] text-muted">We couldn't find that invoice.</p>
      ) : (
        <InvoiceDoc invoice={invoice} />
      )}
    </main>
  );
}

function InvoiceDoc({ invoice }: { invoice: InvoiceRow }) {
  const gst = invoice.is_gst_invoice;
  const date = new Date(invoice.invoice_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  return (
    <article
      className="mt-6 rounded-[12px] p-8 print:mt-0 print:p-0"
      style={{ background: "#FFFFFF", color: "#101014" }}
    >
      <header className="flex items-start justify-between gap-6 border-b pb-5" style={{ borderColor: "#E4E4E9" }}>
        <div>
          <p className="font-display text-[26px] leading-none">CowQ</p>
          <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "#4A4A55" }}>
            {SELLER.legalName}
            <br />
            GSTIN: {SELLER.gstin}
            <br />
            {SELLER.address}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#6A6A78" }}>
            {gst ? "Tax invoice" : "Payment receipt"}
          </p>
          <p className="mt-1 font-mono text-[14px]">{invoice.invoice_no}</p>
          <p className="mt-1 text-[13px]" style={{ color: "#4A4A55" }}>{date}</p>
        </div>
      </header>

      <section className="mt-5">
        <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#6A6A78" }}>Billed to</p>
        <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed">
          {invoice.buyer_name || "CowQ customer"}
          {invoice.buyer_gstin ? `\nGSTIN: ${invoice.buyer_gstin}` : ""}
          {invoice.buyer_address ? `\n${invoice.buyer_address}` : ""}
        </p>
      </section>

      <table className="mt-6 w-full text-[14px]">
        <thead>
          <tr style={{ background: "#F3F4F8" }}>
            <th className="p-3 text-left font-semibold">Description</th>
            <th className="p-3 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #E4E4E9" }}>
            <td className="p-3">
              {invoice.plan_name}
              <span className="block text-[12px]" style={{ color: "#6A6A78" }}>SAC 998439 · digital service</span>
            </td>
            <td className="p-3 text-right font-mono tabular-nums">{rupees(invoice.taxable_paise)}</td>
          </tr>
          {gst && invoice.igst_paise > 0 && (
            <Row label="IGST @ 18%" value={rupees(invoice.igst_paise)} />
          )}
          {gst && invoice.igst_paise === 0 && (
            <>
              <Row label="CGST @ 9%" value={rupees(invoice.cgst_paise)} />
              <Row label="SGST @ 9%" value={rupees(invoice.sgst_paise)} />
            </>
          )}
          {!gst && <Row label="Tax included @ 18%" value={rupees(invoice.total_paise - invoice.taxable_paise)} />}
          <tr>
            <td className="p-3 text-right font-semibold">Total paid</td>
            <td className="p-3 text-right font-mono text-[16px] font-semibold tabular-nums">{rupees(invoice.total_paise)}</td>
          </tr>
        </tbody>
      </table>

      <p className="mt-6 text-[12px] leading-relaxed" style={{ color: "#6A6A78" }}>
        {gst
          ? "This is a computer-generated tax invoice and does not require a signature."
          : "This is a payment receipt. Add your GST details in Billing to receive a GST invoice on future payments."}
        <br />
        Questions? {SELLER.email}
      </p>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr style={{ borderBottom: "1px solid #E4E4E9" }}>
      <td className="p-3">{label}</td>
      <td className="p-3 text-right font-mono tabular-nums">{value}</td>
    </tr>
  );
}
