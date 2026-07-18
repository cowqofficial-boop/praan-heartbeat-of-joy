import { create } from "zustand";

export type Identified = {
  name: string;
  category: string;
  material: string;
  color: string;
  features: string[];
};

type PraanState = {
  originalImageUrl: string | null;
  originalDataUrl: string | null; // for before/after preview
  identified: Identified | null;
  form: { name: string; price: string; detail: string } | null;
  setUpload: (data: { url: string; dataUrl: string; identified: Identified }) => void;
  setForm: (form: { name: string; price: string; detail: string }) => void;
  reset: () => void;
};

export const usePraanStore = create<PraanState>((set) => ({
  originalImageUrl: null,
  originalDataUrl: null,
  identified: null,
  form: null,
  setUpload: ({ url, dataUrl, identified }) =>
    set({ originalImageUrl: url, originalDataUrl: dataUrl, identified }),
  setForm: (form) => set({ form }),
  reset: () =>
    set({ originalImageUrl: null, originalDataUrl: null, identified: null, form: null }),
}));
