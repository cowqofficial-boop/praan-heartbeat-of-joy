import JSZip from "jszip";
import { slugify } from "@/lib/csv";

type GenImage = { kind: string; ratio: string; url: string };
type Copy = {
  seoTitle: string;
  description: string;
  bullets: string[];
  tags: string[];
  instagram?: string;
  instagramHashtags?: string[];
  whatsapp?: string;
  festival?: string;
};

export type BulkProduct = {
  productName: string;
  price: string;
  category: string;
  images: GenImage[];
  copy: Copy;
};

function esc(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const HEADERS = [
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

export function buildCombinedShopifyCsv(products: BulkProduct[]): string {
  const rows: string[][] = [HEADERS];
  for (const p of products) {
    const handle = slugify(p.productName);
    const sku = handle.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "SKU001";
    const bodyHtml =
      `<p>${(p.copy.description || "").replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br/>")}</p>` +
      `<ul>${(p.copy.bullets || []).map((b) => `<li>${b}</li>`).join("")}</ul>`;
    const imgs = p.images.length ? p.images.map((i) => i.url) : [""];
    imgs.forEach((url, i) => {
      const first = i === 0;
      rows.push([
        handle,
        first ? p.copy.seoTitle : "",
        first ? bodyHtml : "",
        first ? "" : "",
        first ? p.category : "",
        first ? (p.copy.tags || []).join(", ") : "",
        first ? "TRUE" : "",
        first ? sku : "",
        first ? p.price : "",
        url,
        String(i + 1),
        first ? p.copy.seoTitle : "",
        first ? (p.copy.description || "").slice(0, 160) : "",
      ]);
    });
  }
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

async function fetchBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

function extFromMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

export async function downloadBulkZip(products: BulkProduct[], zipName = "cowq-products.zip") {
  const zip = new JSZip();
  zip.file("products.csv", buildCombinedShopifyCsv(products));

  for (const p of products) {
    const handle = slugify(p.productName);
    const folder = zip.folder(handle);
    if (!folder) continue;
    let i = 0;
    for (const img of p.images) {
      const blob = await fetchBlob(img.url);
      if (!blob) continue;
      const ratio = img.ratio.replace(":", "x");
      const name = `${String(++i).padStart(2, "0")}-${img.kind}-${ratio}.${extFromMime(blob.type)}`;
      folder.file(name, blob);
    }
  }

  const out = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(out);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
