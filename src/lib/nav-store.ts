"use client";

import { create } from "zustand";

export type ViewKey =
  | "overview"
  | "library"
  | "instructions"
  | "history"
  | "editor"
  | "playground"
  | "experiments"
  | "deployment"
  | "audit";

interface NavState {
  view: ViewKey;
  promptId: string | null;
  versionId: string | null;
  experimentId: string | null;
  navigate: (view: ViewKey, params?: Partial<Omit<NavState, "view" | "navigate">>) => void;
}

export const useNav = create<NavState>((set) => ({
  view: "overview",
  promptId: null,
  versionId: null,
  experimentId: null,
  navigate: (view, params) =>
    set({
      view,
      promptId: params?.promptId ?? null,
      versionId: params?.versionId ?? null,
      experimentId: params?.experimentId ?? null,
    }),
}));
