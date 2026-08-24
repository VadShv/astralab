"use client";

import * as React from "react";
import { GitCommitHorizontal, GitBranch, Check, FileDiff } from "lucide-react";
import { StatusBadge } from "@/components/views/shared";
import { timeAgo, shortHash } from "@/lib/format";
import { cn } from "@/lib/utils";

const BRANCH_COLORS: Record<string, string> = {
  main: "#10b981",
};

const FALLBACK_COLORS = ["#f59e0b", "#06b6d4", "#a855f7", "#f43f5e", "#8b5cf6"];

function branchColor(name: string, index: number): string {
  return BRANCH_COLORS[name] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export interface VersionItem {
  id: string;
  versionHash: string;
  semver: string;
  branch: string;
  commitMessage: string;
  status: string;
  createdAt: string;
  author?: { id: string; name: string; avatarColor: string };
  model?: { id: string; displayName: string } | null;
}

export function VersionPanel({
  versions,
  selectedVersionId,
  onSelectVersion,
  onCompare,
}: {
  versions: VersionItem[];
  selectedVersionId: string | null;
  onSelectVersion: (v: VersionItem) => void;
  onCompare?: (v: VersionItem) => void;
}) {
  const [branchFilter, setBranchFilter] = React.useState<string | null>(null);

  const branches = React.useMemo(() => {
    const set = new Set<string>();
    versions.forEach((v) => set.add(v.branch));
    return [...set];
  }, [versions]);

  const filtered = branchFilter ? versions.filter((v) => v.branch === branchFilter) : versions;
  const reversed = [...filtered].reverse(); // newest first

  if (versions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <GitCommitHorizontal className="mb-2 h-8 w-8 opacity-30" />
        <p className="text-xs">Пока нет версий</p>
        <p className="mt-1 text-[10px]">Сохраните версию, чтобы увидеть историю</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Branch filter chips */}
      {branches.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b px-3 py-2">
          <button
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] transition-colors",
              !branchFilter ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
            onClick={() => setBranchFilter(null)}
          >
            Все ({versions.length})
          </button>
          {branches.map((b, i) => (
            <button
              key={b}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors",
                branchFilter === b ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
              onClick={() => setBranchFilter(branchFilter === b ? null : b)}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: branchColor(b, i) }} />
              {b}
            </button>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="relative">
          {/* vertical line */}
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-1">
            {reversed.map((v, idx) => {
              const isSelected = v.id === selectedVersionId;
              const isActive = v.status === "active";
              const bIdx = branches.indexOf(v.branch);
              const color = branchColor(v.branch, bIdx);

              return (
                <div
                  key={v.id}
                  className={cn(
                    "group relative flex gap-2.5 rounded-lg p-2 transition-colors cursor-pointer",
                    isSelected ? "bg-primary/10" : "hover:bg-muted/40"
                  )}
                  onClick={() => onSelectVersion(v)}
                >
                  {/* Node */}
                  <div className="relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border-2 bg-card",
                        isSelected ? "border-primary" : "border-border"
                      )}
                      style={isActive && !isSelected ? { borderColor: color } : undefined}
                    >
                      {isActive ? (
                        <Check className="h-3.5 w-3.5" style={{ color }} />
                      ) : (
                        <GitCommitHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold text-foreground">{v.semver}</span>
                      {v.branch !== "main" && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <GitBranch className="h-2.5 w-2.5" style={{ color }} />
                          {v.branch}
                        </span>
                      )}
                      <StatusBadge status={v.status} className="ml-auto text-[9px] px-1.5 py-0" />
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{v.commitMessage}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground/70">
                      <span>{v.author?.name?.split(" ").map(w => w[0]).join("") ?? "?"}</span>
                      <span>{timeAgo(v.createdAt)}</span>
                      <span className="font-mono">{shortHash(v.versionHash)}</span>
                      {v.model && <span className="truncate">· {v.model.displayName}</span>}
                    </div>
                  </div>

                  {/* Compare button */}
                  {onCompare && idx < reversed.length - 1 && (
                    <button
                      className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-primary group-hover:opacity-100 sm:flex"
                      title="Сравнить с предыдущей"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCompare(v);
                      }}
                    >
                      <FileDiff className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
