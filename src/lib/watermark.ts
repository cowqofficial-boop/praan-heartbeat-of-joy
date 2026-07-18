// Client-side watermark for free-tier downloads.
// Draws "Made with PRAAN" pill in the bottom-right corner.

export async function watermarkImageUrl(url: string): Promise<Blob> {
  const res = await fetch(url);
  const blob = await res.blob();
  const img = await blobToImage(blob);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  drawWatermark(ctx, canvas.width, canvas.height);

  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), "image/png", 0.95);
  });
}

function blobToImage(b: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(b);
    const i = new Image();
    i.onload = () => {
      resolve(i);
      URL.revokeObjectURL(url);
    };
    i.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    i.src = url;
  });
}

function drawWatermark(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const scale = Math.max(1, Math.min(w, h) / 512);
  const padX = 14 * scale;
  const padY = 8 * scale;
  const fontSize = 16 * scale;
  const margin = 20 * scale;
  const text = "Made with PRAAN";
  ctx.font = `600 ${fontSize}px Inter, system-ui, -apple-system, sans-serif`;
  const metrics = ctx.measureText(text);
  const boxW = metrics.width + padX * 2;
  const boxH = fontSize + padY * 2;
  const x = w - boxW - margin;
  const y = h - boxH - margin;

  // Pill background
  ctx.fillStyle = "rgba(15,15,15,0.72)";
  roundRect(ctx, x, y, boxW, boxH, boxH / 2);
  ctx.fill();

  // Text
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + padX, y + boxH / 2 + 1);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
