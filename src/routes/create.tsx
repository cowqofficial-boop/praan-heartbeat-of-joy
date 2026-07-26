import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LibraryBig } from "lucide-react";
import { UploadWidget } from "@/components/UploadWidget";
import { ServiceForm } from "@/components/ServiceForm";
import { TypeToggle } from "@/components/TypeToggle";
import type { ContentKind } from "@/lib/service";
import { HelpButton } from "@/components/PageHeader";
import { useAuth } from "@/lib/use-auth";


export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Add a product — CowQ" },
      {
        name: "description",
        content:
          "Upload a product photo and CowQ turns it into studio images, a full listing, social posts, and a website catalog file.",
      },
      { property: "og:title", content: "Add a product — CowQ" },
      {
        property: "og:description",
        content: "Upload a product photo. Get studio images, listing, and catalog file in under a minute.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  const { user } = useAuth();
  const [kind, setKind] = useState<ContentKind>("product");
  const isService = kind === "service";
  return (
    <main className="flex min-h-screen flex-col items-center px-5 pb-28 pt-16 lg:min-h-[calc(100vh-4rem)] lg:justify-center lg:pb-16 lg:pt-16">
      {user && (
        <Link
          to="/library"
          className="absolute left-5 top-5 flex items-center gap-1.5 text-[14px] font-medium text-muted lg:hidden"
        >
          <LibraryBig className="h-4 w-4" />
          Your library
        </Link>
      )}

      <div className="w-full max-w-sm lg:max-w-[640px]">
        <div className="flex items-start gap-2">
          <h1 className="font-display text-[40px] leading-[1.02] text-ink sm:text-[56px] lg:text-[72px]">
            {isService
              ? "One service. Everything you need to sell it."
              : "One photo. Everything you need to sell it."}
          </h1>
          <div className="mt-3 lg:mt-4">
            <HelpButton
              label={isService ? "Service tips" : "Photo tips"}
              content={
                isService ? (
                  <>
                    <p className="font-semibold text-ink">Service tips</p>
                    <p className="mt-1 text-muted">A photo is optional. If you have one of your work, your setup, or your tools, add it — the poster comes out stronger and costs fewer credits. Write what's included in plain words.</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-ink">Photo tips</p>
                    <p className="mt-1 text-muted">Take a normal photo on a normal table. Add two or three more angles if you can — the back, a close-up, the label. Better input, better output.</p>
                  </>
                )
              }
            />
          </div>
        </div>
        <p className="mt-4 text-[15px] text-muted lg:text-[17px]">
          {isService
            ? "A promotional poster, a listing, captions, and a booking line — from your phone."
            : "Studio photos, listing, and a catalog file — from your phone."}
        </p>

        <div className="mt-6">
          <TypeToggle value={kind} onChange={setKind} />
        </div>

        <div className="mt-6">{isService ? <ServiceForm /> : <UploadWidget />}</div>
      </div>
    </main>
  );

}

