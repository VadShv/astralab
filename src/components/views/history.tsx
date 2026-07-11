"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  GitBranch,
  GitCommitHorizontal,
  Tag as TagIcon,
  Plus,
  ArrowLeft,
  Code2,
  Rocket,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge, EmptyState } from "./shared";
import { useNav } from "@/lib/nav-store";
import { timeAgo, shortHash } from "@/lib/format";
import { cn } from "@/lib/utils";

const BRANCH_COLORS = [
  "#10b981", // emerald (main)
  "#f59e0b", // amber
  "#06b6d4", // cyan
  "#a855f7", // violet
  "#f43f5e", // rose
];

const ROW_H = 84;
const LANE_W = 52;
const NODE_R = 9;

export function HistoryView() {
  const { promptId } = useNav();

  if (!promptId) {
    return (
      <Picker
        title="История версий"
        hint="Выберите промпт, чтобы увидеть граф коммитов (DAG)."
      />
    );
  }

  return <HistoryInner promptId={promptId} />;
}

function HistoryInner({ promptId }: { promptId: string }) {
  const { navigate } = useNav();

  const { data, isLoading } = useQuery({
    queryKey: ["versions", promptId],
    queryFn: () => fetch(`/api/prompts/${promptId}/versions`).then((r) => r.json()),
  });

  const { data: promptData } = useQuery({
    queryKey: ["prompt", promptId],
    queryFn: () => fetch(`/api/prompts/${promptId}`).then((r) => r.json()),
  });
  const prompt = promptData?.prompt;

  const versions: any[] = data?.versions ?? [];
  const branches: any[] = data?.branches ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 w-64 animate-pulse rounded bg-muted" />
        <div className="h-[500px] animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  // lane assignment
  const branchOrder = ["main", ...branches.filter((b) => b.name !== "main").map((b) => b.name)];
  const laneOf = (name: string) => {
    const i = branchOrder.indexOf(name);
    return i === -1 ? branchOrder.length : i;
  };
  const colorOf = (name: string) => BRANCH_COLORS[laneOf(name) % BRANCH_COLORS.length];

  const sorted = [...versions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const versionById = new Map(sorted.map((v) => [v.id, v]));

  const lanes = branchOrder.length;
  const railWidth = lanes * LANE_W + 24;
  const height = Math.max(sorted.length, 1) * ROW_H + 40;

  const nodePos = (v: any) => {
    const idx = sorted.findIndex((x) => x.id === v.id);
    const lane = laneOf(v.branch);
    return { x: 12 + lane * LANE_W + LANE_W / 2, y: idx * ROW_H + ROW_H / 2 + 12, lane, idx };
  };

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("library")} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-lg font-semibold text-primary">{prompt?.name}</h2>
              <StatusBadge status={prompt ? "active" : "draft"} />
            </div>
            <p className="text-sm text-muted-foreground">{prompt?.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("playground", { promptId })}>
            <Code2 className="mr-1.5 h-4 w-4" /> Песочница
          </Button>
          <Button size="sm" onClick={() => navigate("editor", { promptId, versionId: null })}>
            <Plus className="mr-1.5 h-4 w-4" /> Новая версия
          </Button>
        </div>
      </div>

      {/* branch legend */}
      <div className="flex flex-wrap items-center gap-3">
        {branchOrder.map((b, i) => (
          <div key={b} className="flex items-center gap-1.5 text-xs">
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full"
              style={{ background: BRANCH_COLORS[i % BRANCH_COLORS.length] }}
            />
            <span className="font-mono">{b}</span>
          </div>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {versions.length} коммитов · {branches.length} веток
        </span>
      </div>

      {/* DAG */}
      {versions.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title="Пока нет версий"
          description="Создайте первую версию, чтобы начать граф истории."
          action={
            <Button size="sm" onClick={() => navigate("editor", { promptId })}>
              <Plus className="mr-1.5 h-4 w-4" /> Новая версия
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex">
            {/* rail (svg) */}
            <div className="relative shrink-0" style={{ width: railWidth, height }}>
              <svg width={railWidth} height={height} className="absolute inset-0">
                {/* branch rails */}
                {branchOrder.map((b, i) => {
                  const vs = sorted.filter((v) => v.branch === b);
                  if (vs.length === 0) return null;
                  const x = 12 + i * LANE_W + LANE_W / 2;
                  const y1 = nodePos(vs[0]).y;
                  const y2 = nodePos(vs[vs.length - 1]).y;
                  return (
                    <line
                      key={b}
                      x1={x}
                      y1={y1}
                      x2={x}
                      y2={y2}
                      stroke={BRANCH_COLORS[i % BRANCH_COLORS.length]}
                      strokeWidth={2}
                      strokeOpacity={0.5}
                    />
                  );
                })}
                {/* edges */}
                {sorted.map((v) => {
                  if (!v.parentVersionId) return null;
                  const parent = versionById.get(v.parentVersionId);
                  if (!parent) return null;
                  const from = nodePos(parent);
                  const to = nodePos(v);
                  const c = colorOf(v.branch);
                  if (from.lane === to.lane) return null; // covered by rail
                  const midY = (from.y + to.y) / 2;
                  const d = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;
                  return (
                    <path
                      key={`e-${v.id}`}
                      d={d}
                      fill="none"
                      stroke={c}
                      strokeWidth={2}
                      strokeOpacity={0.5}
                    />
                  );
                })}
                {/* nodes */}
                {sorted.map((v) => {
                  const p = nodePos(v);
                  const c = colorOf(v.branch);
                  return (
                    <g key={v.id} className="cursor-pointer" onClick={() => navigate("editor", { promptId, versionId: v.id })}>
                      <circle cx={p.x} cy={p.y} r={NODE_R + 4} fill="var(--background)" />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={NODE_R}
                        fill={c}
                        stroke="var(--background)"
                        strokeWidth={2}
                      />
                      {v.status === "active" && (
                        <circle cx={p.x} cy={p.y} r={NODE_R + 3} fill="none" stroke={c} strokeWidth={1.5} className="pulse-ring" />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* commit cards */}
            <div className="relative flex-1" style={{ height }}>
              {sorted.map((v) => {
                const p = nodePos(v);
                const top = p.y - ROW_H / 2 + 6;
                return (
                  <button
                    key={v.id}
                    onClick={() => navigate("editor", { promptId, versionId: v.id })}
                    className="absolute left-0 right-3 flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-all hover:border-primary/40 hover:shadow-sm"
                    style={{ top, height: ROW_H - 12 }}
                  >
                    <div className="flex w-20 shrink-0 flex-col">
                      <span className="font-mono text-xs font-semibold text-foreground">{v.semver}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{shortHash(v.versionHash)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{v.commitMessage}</div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback style={{ background: v.author?.avatarColor }} className="text-[8px] text-white">
                            {v.author?.name?.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{v.author?.name}</span>
                        <span>·</span>
                        <span>{v.branch}</span>
                        <span>·</span>
                        <span>{timeAgo(v.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {v.tags?.map((t: any) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center gap-0.5 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-600 dark:text-amber-400"
                        >
                          <TagIcon className="h-2.5 w-2.5" />
                          {t.name}
                        </span>
                      ))}
                      <StatusBadge status={v.status} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Picker({ title, hint }: { title: string; hint: string }) {
  const { navigate } = useNav();
  const { data } = useQuery({
    queryKey: ["prompts"],
    queryFn: () => fetch("/api/prompts").then((r) => r.json()),
  });
  const prompts = data?.prompts ?? [];
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {prompts.map((p: any) => (
          <Card
            key={p.id}
            className="cursor-pointer p-4 hover:border-primary/40"
            onClick={() => navigate("history", { promptId: p.id })}
          >
            <div className="font-mono text-sm font-semibold text-primary">{p.name}</div>
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</div>
            <div className="mt-2 text-[11px] text-muted-foreground">{p.versionCount} версий</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
