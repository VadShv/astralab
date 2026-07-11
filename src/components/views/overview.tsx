"use client";

import * as React from "react";
import {
  Activity,
  GitCommitHorizontal,
  FlaskConical,
  Zap,
  DollarSign,
  Cpu,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, KpiCard, StatusBadge } from "./shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNav } from "@/lib/nav-store";
import { timeAgo, fmtNum, fmtUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

export function OverviewView() {
  const { navigate } = useNav();
  const { data, isLoading } = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetch("/api/overview").then((r) => r.json()),
  });

  const k = data?.kpis;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3 w-3 text-primary" />
              GitHub + LaunchDarkly для промптов
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Релиз промптов со строгостью{" "}
              <span className="text-primary">контроля версий</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Иммутабельные версии с content-addressed хэшами. Статистически корректное A/B-тестирование.
              Оценка через LLM-as-judge. Мгновенный откат — всё горячее обновление в проде.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate("library")}>
                Смотреть промпты <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate("experiments")}>
                <FlaskConical className="mr-1.5 h-3.5 w-3.5" /> Эксперименты
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate("playground")}>
                <Zap className="mr-1.5 h-3.5 w-3.5" /> Открыть песочницу
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            <HeroStat label="Версии" value={k?.versions} icon={GitCommitHorizontal} />
            <HeroStat label="Активные A/B" value={k?.activeExperiments} icon={FlaskConical} />
            <HeroStat label="Промпты в проде" value={k?.prodActive} icon={ShieldCheck} />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Запросы / 24ч"
          value={isLoading ? "—" : fmtNum(k?.events24h ?? 0)}
          icon={Zap}
          delta={{ value: "12.4%", positive: true }}
          hint="через edge SDK"
        />
        <KpiCard
          label="Расход на LLM / 24ч"
          value={isLoading ? "—" : fmtUsd(k?.cost24hUsd ?? 0)}
          icon={DollarSign}
          delta={{ value: "3.1%", positive: false }}
          hint="по всем вариантам"
        />
        <KpiCard
          label="Токены / 24ч"
          value={isLoading ? "—" : fmtNum(k?.tokens24h ?? 0)}
          icon={Cpu}
          delta={{ value: "8.7%", positive: true }}
          hint="входящие + исходящие"
        />
        <KpiCard
          label="Активные эксперименты"
          value={isLoading ? "—" : k?.activeExperiments}
          icon={TrendingUp}
          hint="статистически обеспечены"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active experiments */}
        <Panel
          title="Текущие эксперименты"
          description="A/B-тесты на живом prod-трафике"
          className="lg:col-span-2"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate("experiments")}>
              Все <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          }
          bodyClassName="p-0"
        >
          <div className="divide-y">
            {(data?.activeExperiments ?? []).map((exp: any) => (
              <button
                key={exp.id}
                onClick={() => navigate("experiments", { experimentId: exp.id })}
                className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-muted/40"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                  <FlaskConical className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{exp.name}</span>
                    <StatusBadge status="running" />
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {exp.promptName} · {exp.variants} варианта · {exp.primaryMetric}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  начат {timeAgo(exp.startedAt)}
                </div>
              </button>
            ))}
            {!data?.activeExperiments?.length && !isLoading && (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Нет активных экспериментов. Запустите из промпта.
              </div>
            )}
          </div>
        </Panel>

        {/* Recent activity */}
        <Panel
          title="Недавняя активность"
          description="Хронология аудита"
          bodyClassName="p-0"
        >
          <div className="max-h-[320px] overflow-y-auto scroll-thin">
            <ol className="relative px-5 py-4">
              {(data?.recentActivity ?? []).map((a: any, i: number) => (
                <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < (data?.recentActivity?.length ?? 0) - 1 && (
                    <span className="absolute left-[7px] top-5 h-full w-px bg-border" />
                  )}
                  <span
                    className={cn(
                      "mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-background",
                      actionTone(a.action)
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {a.action}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {a.actor?.name ?? "система"} · {timeAgo(a.createdAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Panel>
      </div>

      {/* Capability strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FeatureChip icon={GitCommitHorizontal} title="Content-addressed" desc="Иммутабельные версии SHA-256" onClick={() => navigate("history")} />
        <FeatureChip icon={ShieldCheck} title="Откат по guardrail" desc="Авто-возврат при нарушении" onClick={() => navigate("deployment")} />
        <FeatureChip icon={FlaskConical} title="Sequential testing" desc="Ранняя остановка, контроль α" onClick={() => navigate("experiments")} />
        <FeatureChip icon={Sparkles} title="LLM-as-judge" desc="Авто-оценка каждого ответа" onClick={() => navigate("playground")} />
      </div>
    </div>
  );
}

function HeroStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border bg-background/60 p-3 backdrop-blur">
      <Icon className="h-4 w-4 text-primary" />
      <div className="mt-2 text-xl font-semibold tabular-nums">{value ?? "—"}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function FeatureChip({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  onClick?: () => void;
}) {
  return (
    <Card
      role="button"
      onClick={onClick}
      className="cursor-pointer p-4 transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-sm font-medium">{title}</div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{desc}</div>
    </Card>
  );
}

function actionTone(action: string): string {
  if (action.includes("activated") || action.includes("started")) return "bg-emerald-500";
  if (action.includes("rollback")) return "bg-rose-500";
  if (action.includes("created")) return "bg-primary";
  if (action.includes("comment")) return "bg-amber-500";
  return "bg-zinc-400";
}
