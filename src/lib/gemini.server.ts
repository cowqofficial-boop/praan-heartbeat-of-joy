// Direct Google Gemini API client (no gateway). Runs server-only.

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export const GEMINI_TEXT_MODEL = "gemini-3.6-flash";
export const GEMINI_IMAGE_MODEL = "gemini-3-pro-image";

export function geminiKey(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("Missing GEMINI_API_KEY");
  return k;
}

export type InlineImage = { mimeType: string; b64: string };

export class GeminiError extends Error {
  status: number;
  body: string;
  code: "rate_limited" | "quota" | "bad_request" | "server" | "network" | "unknown";
  constructor(status: number, body: string, code: GeminiError["code"], message: string) {
    super(message);
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

function classify(status: number, body: string): GeminiError["code"] {
  if (status === 429) return "rate_limited";
  if (status === 402 || /quota|billing|credit/i.test(body)) return "quota";
  if (status >= 500) return "server";
  if (status >= 400) return "bad_request";
  return "unknown";
}

const GEMINI_TIMEOUT_MS = 60_000;
const GEMINI_MAX_ATTEMPTS = 3;

async function postJSON(model: string, payload: unknown): Promise<unknown> {
  const url = `${BASE}/models/${model}:generateContent`;
  let lastErr: GeminiError | null = null;
  for (let attempt = 0; attempt < GEMINI_MAX_ATTEMPTS; attempt++) {
    let res: Response;
    const started = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
      res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey(),
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      clearTimeout(timeoutId);
      const duration = Date.now() - started;
      const aborted = controller.signal.aborted;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `[gemini] ${aborted ? "timeout" : "network error"} model=${model} attempt=${attempt + 1}/${GEMINI_MAX_ATTEMPTS} duration_ms=${duration} status=0 body=${msg}`,
      );
      const human = aborted
        ? "Gemini took too long to respond. Try again."
        : "Network error calling Gemini.";
      lastErr = new GeminiError(0, msg, "network", `${human} ||DETAIL|| ${msg}`);
      await sleep(400 * (attempt + 1));
      continue;
    }
    clearTimeout(timeoutId);
    const duration = Date.now() - started;
    if (res.ok) {
      console.info(
        `[gemini] ok model=${model} attempt=${attempt + 1}/${GEMINI_MAX_ATTEMPTS} duration_ms=${duration} status=${res.status}`,
      );
      const body = await res.text();
      try {
        return JSON.parse(body) as unknown;
      } catch {
        console.error(
          `[gemini] malformed json model=${model} attempt=${attempt + 1}/${GEMINI_MAX_ATTEMPTS} duration_ms=${duration} status=${res.status} body=${body}`,
        );
        lastErr = new GeminiError(res.status, body, "unknown", "Gemini returned a malformed response.");
        await sleep(600 * (attempt + 1));
        continue;
      }
    }
    const body = await res.text();
    const code = classify(res.status, body);
    console.error(
      `[gemini] fail model=${model} attempt=${attempt + 1}/${GEMINI_MAX_ATTEMPTS} duration_ms=${duration} status=${res.status} code=${code} body=${body}`,
    );
    const human = humanMessage(code, res.status, body);
    const detail = `[${code} ${res.status || "net"}] ${body.slice(0, 300).replace(/\s+/g, " ")}`;
    lastErr = new GeminiError(res.status, body, code, `${human} ||DETAIL|| ${detail}`);
    await sleep(600 * (attempt + 1));
  }
  throw lastErr ?? new GeminiError(0, "", "unknown", "Gemini call failed");
}

function humanMessage(code: GeminiError["code"], status: number, body: string): string {
  if (code === "quota") return "Out of Gemini API credit. Add billing to your Google AI key.";
  if (code === "rate_limited") return "Gemini is rate-limiting us right now. Try again in a moment.";
  if (code === "server") return "Google's servers had a temporary problem. Try again.";
  if (code === "bad_request") {
    if (/API key not valid|API_KEY_INVALID|invalid api key/i.test(body)) return "Gemini API key is invalid.";
    if (/billing|not enabled|permission denied|PERMISSION_DENIED/i.test(body)) return "Billing isn't enabled on the Gemini API key.";
    if (/not found|NOT_FOUND|does not exist|is not supported/i.test(body)) return "Gemini model ID is wrong or unavailable.";
    if (/too large|payload|size/i.test(body)) return "Image is too large. Try a smaller photo.";
    if (/unsupported|mime|format/i.test(body)) return "That image format isn't supported. Use JPG or PNG.";
    return "Gemini rejected the request.";
  }
  return `Gemini call failed (${status || "network"}).`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------- Text (with optional inline image) ----------

export async function geminiGenerateText(opts: {
  systemInstruction?: string;
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>;
  responseMimeType?: "application/json" | "text/plain";
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
}): Promise<string> {
  const payload: Record<string, unknown> = {
    contents: [{ role: "user", parts: opts.parts }],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxOutputTokens ?? 2048,
      ...(opts.responseMimeType ? { responseMimeType: opts.responseMimeType } : {}),
    },
  };
  if (opts.systemInstruction) {
    payload.systemInstruction = { role: "system", parts: [{ text: opts.systemInstruction }] };
  }
  const json = (await postJSON(opts.model ?? GEMINI_TEXT_MODEL, payload)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();
}

export function parseJsonLoose<T = unknown>(text: string): T | null {
  let t = text.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(t) as T;
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as T;
    } catch {
      return null;
    }
  }
}

// ---------- Image generation (edit-from-reference) ----------

export async function geminiGenerateImage(opts: {
  prompt: string;
  reference: InlineImage;
  extraReferences?: InlineImage[];
  model?: string;
}): Promise<{ mimeType: string; b64: string }> {
  const refs = [opts.reference, ...(opts.extraReferences ?? [])];
  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          ...refs.map((r) => ({ inlineData: { mimeType: r.mimeType, data: r.b64 } })),
          { text: opts.prompt },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ["IMAGE"],
    },
  };
  const model = opts.model ?? GEMINI_IMAGE_MODEL;
  const json = (await postJSON(model, payload)) as {
    candidates?: {
      content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> };
    }[];
  };
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    if (p.inlineData?.data) {
      return { mimeType: p.inlineData.mimeType || "image/png", b64: p.inlineData.data };
    }
  }
  const body = JSON.stringify(json);
  console.error(`[gemini] no image data model=${model} status=200 body=${body}`);
  throw new GeminiError(200, body.slice(0, 400), "unknown", "Gemini returned no image data.");
}

