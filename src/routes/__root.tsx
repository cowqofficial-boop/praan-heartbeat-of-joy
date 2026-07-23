import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SITE_URL } from "@/lib/site";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode, type CSSProperties } from "react";
import { pageAccent } from "../lib/page-accent";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppSidebar } from "../components/AppSidebar";
import { QueueRunner } from "../lib/queue-runner";
import { QueueIndicator } from "../components/QueueIndicator";
import { Tour } from "../components/Tour";
import { Dialogs } from "../components/Dialogs";
import { useAuth } from "../lib/use-auth";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <h1 className="font-display text-[40px] sm:text-[56px] text-ink">Not here.</h1>
        <p className="mt-2 text-[15px] text-muted">This page doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-[12px] bg-primary px-5 py-3 text-[15px] font-medium text-primary-foreground"
        >
          Start over
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <h1 className="font-display text-[40px] sm:text-[56px] text-ink">Something didn't load.</h1>
        <p className="mt-2 text-[15px] text-muted">Try again in a moment.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 inline-flex items-center justify-center rounded-[12px] bg-primary px-5 py-3 text-[15px] font-medium text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#08090A" },
      { title: "CowQ — Complete Operations With Quality" },
      {
        name: "description",
        content:
          "CowQ — Complete Operations With Quality. Upload one product photo. Get studio photos, sales copy, and a catalog file — ready to sell on Amazon, Flipkart, Meesho, Instagram, and WhatsApp.",
      },
      { property: "og:title", content: "CowQ — Complete Operations With Quality" },
      {
        property: "og:description",
        content: "Complete Operations With Quality. Studio photos, listing, and catalog file from one product photo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "CowQ",
          url: `${SITE_URL}/`,
          logo: `${SITE_URL}/icon-512.png`,
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const accent = pageAccent(pathname);
  const accentStyle = {
    ["--page-accent" as string]: accent.color,
    ["--page-accent-2" as string]: accent.color2,
  } as CSSProperties;
  const shellClass = user
    ? "mx-auto min-h-screen w-full max-w-[520px] bg-transparent lg:ml-[240px] lg:max-w-none lg:pl-0"
    : "mx-auto min-h-screen w-full bg-transparent";
  const innerClass = user ? "lg:mx-auto lg:max-w-[1200px] lg:px-12" : "";
  return (
    <QueryClientProvider client={queryClient}>
      <div style={accentStyle}>
        <AppSidebar />
        <div className={shellClass}>
          <div className={innerClass}>
            <Outlet />
          </div>
        </div>
        <QueueRunner />
        <QueueIndicator />
        <Tour />
        <Dialogs />
      </div>
    </QueryClientProvider>
  );
}

