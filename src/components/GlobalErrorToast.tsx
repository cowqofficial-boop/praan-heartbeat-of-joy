import { useEffect, useState } from "react";

type Toast = { id: number; message: string };

export function GlobalErrorToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let nextId = 1;
    const push = (message: string) => {
      const id = nextId++;
      setToasts((t) => [...t, { id, message }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 8000);
    };
    const onError = (e: ErrorEvent) => {
      push(e.message || "Unknown error");
    };
    const onRej = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      const msg =
        r instanceof Error ? r.message : typeof r === "string" ? r : "Unhandled promise rejection";
      push(msg);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRej);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRej);
    };
  }, []);

  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className="rounded-[12px] p-3 text-[13px] shadow-lg"
          style={{ background: "#2a0e14", color: "#FF2FA3", border: "1px solid #FF2FA3" }}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
