"use client";

import { create } from "zustand";

export type ViewKey =
  | "ide"
  | "overview"
  | "library"
  | "instructions"
  | "history"
  | "editor"
  | "playground"
  | "experiments"
  | "deployment"
  | "audit"
  | "settings";

interface NavState {
  view: ViewKey;
  promptId: string | null;
  versionId: string | null;
  experimentId: string | null;
  navigate: (view: ViewKey, params?: Partial<Omit<NavState, "view" | "navigate" | "setContext">>) => void;
  /** Update prompt/version/experiment context without leaving the current view. */
  setContext: (params: Partial<Pick<NavState, "promptId" | "versionId" | "experimentId">>) => void;
}

export const useNav = create<NavState>((set) => ({
  view: "ide",
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
  setContext: (params) => set(params),
}));
