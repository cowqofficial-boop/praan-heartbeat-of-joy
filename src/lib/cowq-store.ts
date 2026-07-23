import { create } from "zustand";

export type Identified = {
  name: string;
  category: string;
  material: string;
  color: string;
  features: string[];
};

export type CowqPhoto = { url: string; dataUrl: string };

type CowqState = {
  photos: CowqPhoto[]; // index 0 is the main photo
  identified: Identified | null;
  form: { name: string; price: string; detail: string } | null;
  // Legacy convenience accessors (main photo).
  originalImageUrl: string | null;
  originalDataUrl: string | null;
  setUpload: (data: { photos: CowqPhoto[]; identified: Identified }) => void;
  setForm: (form: { name: string; price: string; detail: string }) => void;
  reset: () => void;
};

export const useCowqStore = create<CowqState>((set) => ({
  photos: [],
  identified: null,
  form: null,
  originalImageUrl: null,
  originalDataUrl: null,
  setUpload: ({ photos, identified }) =>
    set({
      photos,
      identified,
      originalImageUrl: photos[0]?.url ?? null,
      originalDataUrl: photos[0]?.dataUrl ?? null,
    }),
  setForm: (form) => set({ form }),
  reset: () =>
    set({
      photos: [],
      identified: null,
      form: null,
      originalImageUrl: null,
      originalDataUrl: null,
    }),
}));
