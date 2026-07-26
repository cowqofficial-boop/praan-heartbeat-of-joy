// Invoice helpers — pure, safe on browser and server.

/**
 * Seller details printed on every invoice.
 * FOUNDER: replace these three placeholders with your registered details.
 */
export const SELLER = {
  legalName: "SELLER_LEGAL_NAME",
  gstin: "SELLER_GSTIN",
  address: "SELLER_ADDRESS",
  /** First two digits of the seller GSTIN — used to decide IGST vs CGST+SGST. */
  stateCode: "29",
  email: "hello@cowq.app",
} as const;

export const GST_RATE = 0.18;

/** Loose GSTIN check — 15 alphanumeric characters. Never used to block saving. */
export function looksLikeGstin(value: string): boolean {
  return /^[0-9A-Z]{15}$/.test(value.trim().toUpperCase());
}

export function stateCodeFromGstin(gstin: string | null | undefined): string | null {
  const v = (gstin ?? "").trim().toUpperCase();
  return /^\d{2}/.test(v) ? v.slice(0, 2) : null;
}

export type GstSplit = {
  total_paise: number;
  taxable_paise: number;
  cgst_paise: number;
  sgst_paise: number;
  igst_paise: number;
  interState: boolean;
};

/** Amount paid is GST-inclusive; reverse-compute the taxable value at 18%. */
export function splitGst(totalPaise: number, buyerStateCode: string | null): GstSplit {
  const taxable = Math.round(totalPaise / (1 + GST_RATE));
  const tax = totalPaise - taxable;
  const interState = !!buyerStateCode && buyerStateCode !== SELLER.stateCode;
  if (interState) {
    return { total_paise: totalPaise, taxable_paise: taxable, cgst_paise: 0, sgst_paise: 0, igst_paise: tax, interState: true };
  }
  const half = Math.floor(tax / 2);
  return {
    total_paise: totalPaise,
    taxable_paise: taxable,
    cgst_paise: half,
    sgst_paise: tax - half,
    igst_paise: 0,
    interState: false,
  };
}

/** Indian financial year label, e.g. 2026-27. */
export function financialYear(d = new Date()): string {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

export function formatInvoiceNo(seq: number, d = new Date()): string {
  return `CowQ/${financialYear(d)}/${String(seq).padStart(6, "0")}`;
}

export function rupees(paise: number): string {
  return "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
