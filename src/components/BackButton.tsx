import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

/**
 * Back arrow that returns to wherever the seller came from (router history),
 * falling back to a sensible route when there's nothing to go back to
 * (direct link, new tab, shared URL).
 */
export function BackButton({
  fallback = "/",
  label = "Back",
  className = "",
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const navigate = useNavigate();

  function goBack() {
    const canGoBack = router.history.length > 1;
    if (canGoBack) router.history.back();
    else navigate({ to: fallback });
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className={`inline-grid h-11 w-11 -ml-2 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-ink ${className}`}
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );
}
