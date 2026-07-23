// Real before/after pairs. Drop image files into /public/showcase/ and add entries here.
// Leave the array empty to show a single honest placeholder card on the landing page.
//
// Each entry:
//   before      — the phone photo the seller sent
//   after       — what CowQ made from it
//   productName — plain product name
//   location    — city or region, e.g. "Jaipur"

export type ShowcasePair = {
  before: string;
  after: string;
  productName: string;
  location: string;
};

export const showcasePairs: ShowcasePair[] = [
  // Example (uncomment when real files exist in /public/showcase/):
  // {
  //   before: "/showcase/stole-before.jpg",
  //   after: "/showcase/stole-after.jpg",
  //   productName: "Handwoven cotton stole",
  //   location: "Jaipur",
  // },
];
