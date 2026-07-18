function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export type CsvInput = {
  handle: string;
  title: string;
  bodyHtml: string;
  vendor: string;
  type: string;
  tags: string[];
  price: string;
  seoTitle: string;
  seoDescription: string;
  imageUrls: string[];
};

export function buildShopifyCsv(input: CsvInput): string {
  const headers = [
    "Handle",
    "Title",
    "Body (HTML)",
    "Vendor",
    "Type",
    "Tags",
    "Published",
    "Variant SKU",
    "Variant Price",
    "Image Src",
    "Image Position",
    "SEO Title",
    "SEO Description",
  ];
  const rows: string[][] = [];
  const sku = input.handle.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "SKU001";
  const imgs = input.imageUrls.length ? input.imageUrls : [""];
  imgs.forEach((url, i) => {
    const first = i === 0;
    rows.push([
      input.handle,
      first ? input.title : "",
      first ? input.bodyHtml : "",
      first ? input.vendor : "",
      first ? input.type : "",
      first ? input.tags.join(", ") : "",
      first ? "TRUE" : "",
      first ? sku : "",
      first ? input.price : "",
      url,
      String(i + 1),
      first ? input.seoTitle : "",
      first ? input.seoDescription : "",
    ]);
  });
  return [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "product";
}
