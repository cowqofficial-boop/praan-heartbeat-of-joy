// Real before/after pairs shown on the landing page and in the upload box.
// `before` is the phone photo a seller would actually send; `after` is the
// studio image CowQ produces from it.

import stoleBefore from "@/assets/showcase/stole-before.jpg.asset.json";
import stoleAfter from "@/assets/showcase/stole-after.jpg.asset.json";
import diyaBefore from "@/assets/showcase/diya-before.jpg.asset.json";
import diyaAfter from "@/assets/showcase/diya-after.jpg.asset.json";
import speakerBefore from "@/assets/showcase/speaker-before.jpg.asset.json";
import speakerAfter from "@/assets/showcase/speaker-after.jpg.asset.json";

export type ShowcasePair = {
  before: string;
  after: string;
  productName: string;
  location: string;
};

export const showcasePairs: ShowcasePair[] = [
  {
    before: stoleBefore.url,
    after: stoleAfter.url,
    productName: "Handwoven cotton stole",
    location: "Jaipur",
  },
  {
    before: diyaBefore.url,
    after: diyaAfter.url,
    productName: "Brass diya set of six",
    location: "Moradabad",
  },
  {
    before: speakerBefore.url,
    after: speakerAfter.url,
    productName: "Portable bluetooth speaker",
    location: "Bengaluru",
  },
];

/** Studio results only — used for the fading carousel inside the upload box. */
export const studioSamples: { url: string; label: string }[] = showcasePairs.map((p) => ({
  url: p.after,
  label: p.productName,
}));
