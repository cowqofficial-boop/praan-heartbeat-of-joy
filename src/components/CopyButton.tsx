import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex items-center gap-1.5 rounded-[12px] bg-raised px-3 py-2 text-[13px] font-medium text-ink hover:brightness-110"
      aria-label={copied ? "Copied" : label}
    >
      {copied ? (
        <>
          <Check key="c" className="h-4 w-4 text-marigold scale-in" />
          <span className="text-marigold">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
