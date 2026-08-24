"use client";

import * as React from "react";
import { useNav } from "@/lib/nav-store";
import { OverviewView } from "@/components/views/overview";
import { LibraryView } from "@/components/views/library";
import { InstructionsView } from "@/components/views/instructions";
import { HistoryView } from "@/components/views/history";
import { EditorView } from "@/components/views/editor";
import { PlaygroundView } from "@/components/views/playground";
import { ExperimentsView } from "@/components/views/experiments";
import { DeploymentView } from "@/components/views/deployment";
import { AuditView } from "@/components/views/audit";
import { SettingsView } from "@/components/views/settings";

export function ViewRouter() {
  const { view } = useNav();
  switch (view) {
    case "overview":
      return <OverviewView />;
    case "library":
      return <LibraryView />;
    case "instructions":
      return <InstructionsView />;
    case "history":
      return <HistoryView />;
    case "editor":
      return <EditorView />;
    case "playground":
      return <PlaygroundView />;
    case "experiments":
      return <ExperimentsView />;
    case "deployment":
      return <DeploymentView />;
    case "audit":
      return <AuditView />;
    case "settings":
      return <SettingsView />;
    default:
      return <OverviewView />;
  }
}
