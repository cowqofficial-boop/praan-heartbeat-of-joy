// Invoice creation. Server-only.
import { getPlan } from "./plans";
import { formatInvoiceNo, splitGst, stateCodeFromGstin } from "./invoice";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/**
 * Creates an invoice row for a successful payment.
 * If the buyer has no GST details on file, the row is still created and renders
 * as a plain payment receipt.
 */
export async function createInvoiceForPayment(
  sb: Admin,
  args: { userId: string; paymentId: string | null; planId: string; amountInr: number },
): Promise<void> {
  try {
    if (args.paymentId) {
      const { data: existing } = await sb
        .from("invoices")
        .select("id")
        .eq("payment_id", args.paymentId)
        .maybeSingle();
      if (existing) return;
    }

    const { data: profile } = await sb
      .from("profiles")
      .select("display_name, gstin, invoice_business_name, invoice_address, invoice_state_code")
      .eq("user_id", args.userId)
      .maybeSingle();

    const gstin = (profile?.gstin ?? "").trim() || null;
    const buyerState = profile?.invoice_state_code || stateCodeFromGstin(gstin);
    const split = splitGst(Math.round(args.amountInr * 100), buyerState);
    const plan = getPlan(args.planId);

    const { data: seqRow } = await sb.rpc("nextval" as never, { "": "" } as never).maybeSingle?.() ?? { data: null };
    void seqRow;

    // Sequence via a dedicated select (rpc on nextval isn't exposed) — fall back to count.
    let seq: number;
    const { count } = await sb.from("invoices").select("id", { count: "exact", head: true });
    seq = (count ?? 0) + 1;

    await sb.from("invoices").insert({
      user_id: args.userId,
      payment_id: args.paymentId,
      invoice_no: formatInvoiceNo(seq),
      plan_id: plan.id,
      plan_name: plan.kind === "pack" ? `${plan.name} top-up` : `${plan.name} plan`,
      buyer_name: profile?.invoice_business_name || profile?.display_name || null,
      buyer_gstin: gstin,
      buyer_address: profile?.invoice_address ?? null,
      buyer_state_code: buyerState,
      total_paise: split.total_paise,
      taxable_paise: split.taxable_paise,
      cgst_paise: split.cgst_paise,
      sgst_paise: split.sgst_paise,
      igst_paise: split.igst_paise,
      is_gst_invoice: !!gstin,
    });
  } catch (e) {
    console.error("[invoice] create failed", e);
  }
}
