import { createFileRoute, Link } from "@tanstack/react-router";
import { LibraryBig } from "lucide-react";
import { UploadWidget } from "@/components/UploadWidget";
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
            One photo. Everything you need to sell it.
          </h1>
          <div className="mt-3 lg:mt-4">
            <HelpButton
              label="Photo tips"
              content={
                <>
                  <p className="font-semibold text-ink">Photo tips</p>
                  <p className="mt-1 text-muted">Take a normal photo on a normal table. Add two or three more angles if you can — the back, a close-up, the label. Better input, better output.</p>
                </>
              }
            />
          </div>
        </div>
        <p className="mt-4 text-[15px] text-muted lg:text-[17px]">
          Studio photos, listing, and a catalog file — from your phone.
        </p>

        <div className="mt-10">
          <UploadWidget />
        </div>
      </div>
    </main>
  );
}

