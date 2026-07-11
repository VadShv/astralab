"use client";

import * as React from "react";
import {
  GitCommitHorizontal,
  FlaskConical,
  Zap,
  DollarSign,
  Cpu,
  ArrowUpRight,
  ShieldCheck,
  TrendingUp,
  Orbit,
  Users,
  UserCheck,
  FileText,
  ScanLine,
  Satellite,
  Layers,
  Sparkles,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Panel, StatusBadge } from "./shared";
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
      {/* HERO — Командный центр HR-орбиты */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 glass-strong p-6 sm:p-8">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-20" />
        {/* Орбитальные кольца */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border border-primary/15 orbit-spin-slow">
          <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary glow-cyan-sm" />
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full border border-primary/10 orbit-spin">
          <div className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary/60" />
        </div>

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] font-medium text-primary backdrop-blur">
              <Satellite className="h-3 w-3" />
              ORBIT-7 · HR PROMPT MISSION CONTROL
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Космическая лаборатория{" "}
              <span className="text-primary text-glow">HR-промптов</span>
            </h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              Создавайте, версонируйте и тестируйте промпты для скрининга резюме,
              проведения интервью, онбординга и performance review. Иммутабельные
              версии, статистически корректные A/B-тесты, LLM-as-judge — всё на
              орбите вашего HR-конвейера.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="border-glow bg-primary/20 text-primary hover:bg-primary/30"
                onClick={() => navigate("library")}
              >
                <Users className="mr-1.5 h-4 w-4" /> Открыть библиотеку
                <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-primary/30 hover:bg-primary/10"
                onClick={() => navigate("experiments")}
              >
                <FlaskConical className="mr-1.5 h-4 w-4" /> A/B эксперименты
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-primary/70 hover:bg-primary/10"
                onClick={() => navigate("playground")}
              >
                <Zap className="mr-1.5 h-4 w-4" /> Тестовый стенд
              </Button>
            </div>
          </div>

          {/* HR-модули */}
          <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
            <HeroStat label="Промптов на орбите" value={k?.versions} icon={GitCommitHorizontal} />
            <HeroStat label="A/B миссий" value={k?.activeExperiments} icon={FlaskConical} />
            <HeroStat label="В прод-секторе" value={k?.prodActive} icon={ShieldCheck} />
            <HeroStat label="HR-операций/24ч" value={k?.events24h ? fmtNum(k.events24h) : "—"} icon={Zap} />
          </div>
        </div>
      </div>

      {/* HR-ДОМЕНЫ — что умеет лаборатория */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">HR-домены лаборатории</h2>
          <div className="ml-auto h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HrDomain
            icon={ScanLine}
            title="Скрининг резюме"
            desc="Автоматическая оценка кандидатов против требований вакансии"
            count="resume-screener · cv-parser"
            onClick={() => navigate("library")}
          />
          <HrDomain
            icon={UserCheck}
            title="Интервью"
            desc="Генерация вопросов, оценка ответов, structured interview"
            count="interview-questions · interview-grader"
            onClick={() => navigate("library")}
          />
          <HrDomain
            icon={FileText}
            title="Онбординг"
            desc="Планы 30/60/90, должностные инструкции, welcome-письма"
            count="onboarding-plan · job-description"
            onClick={() => navigate("library")}
          />
          <HrDomain
            icon={TrendingUp}
            title="Performance"
            desc="Performance review по SBI, OKR, обратная связь, 1:1"
            count="performance-review · okr-drafter"
            onClick={() => navigate("library")}
          />
        </div>
      </div>

      {/* KPI — техно-метрики */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Orbit className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">Телеметрия орбиты</h2>
          <div className="ml-auto h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="HR-запросов / 24ч"
            value={isLoading ? "—" : fmtNum(k?.events24h ?? 0)}
            icon={Zap}
            delta={{ value: "12.4%", positive: true }}
            hint="скрининг + интервью + review"
          />
          <KpiCard
            label="Расход LLM / 24ч"
            value={isLoading ? "—" : fmtUsd(k?.cost24hUsd ?? 0)}
            icon={DollarSign}
            delta={{ value: "3.1%", positive: false }}
            hint="по всем HR-вариантам"
          />
          <KpiCard
            label="Токенов / 24ч"
            value={isLoading ? "—" : fmtNum(k?.tokens24h ?? 0)}
            icon={Cpu}
            delta={{ value: "8.7%", positive: true }}
            hint="входящие + исходящие"
          />
          <KpiCard
            label="A/B миссий активно"
            value={isLoading ? "—" : k?.activeExperiments}
            icon={TrendingUp}
            hint="статистически обеспечены"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Активные эксперименты */}
        <Panel
          title="Активные A/B миссии"
          description="Эксперименты на live HR-трафике"
          className="lg:col-span-2"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate("experiments")}>
              Все <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          }
          bodyClassName="p-0"
        >
          <div className="divide-y divide-primary/10">
            {(data?.activeExperiments ?? []).map((exp: any) => (
              <button
                key={exp.id}
                onClick={() => navigate("experiments", { experimentId: exp.id })}
                className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-primary/5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary glow-cyan-sm">
                  <FlaskConical className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{exp.name}</span>
                    <StatusBadge status="running" />
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {exp.promptName} · {exp.variants} варианта · {exp.primaryMetric}
                  </div>
                </div>
                <div className="text-right font-mono text-[11px] text-muted-foreground">
                  T+{timeAgo(exp.startedAt)}
                </div>
              </button>
            ))}
            {!data?.activeExperiments?.length && !isLoading && (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                Нет активных миссий. Запустите A/B-тест из HR-промпта.
              </div>
            )}
          </div>
        </Panel>

        {/* Журнал активности */}
        <Panel
          title="Журнал телеметрии"
          description="Хронология операций"
          bodyClassName="p-0"
        >
          <div className="max-h-[340px] overflow-y-auto scroll-thin">
            <ol className="relative px-5 py-4">
              {(data?.recentActivity ?? []).map((a: any, i: number) => (
                <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < (data?.recentActivity?.length ?? 0) - 1 && (
                    <span className="absolute left-[7px] top-5 h-full w-px bg-primary/15" />
                  )}
                  <span
                    className={cn(
                      "mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-background",
                      actionTone(a.action)
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-mono text-[11px] text-primary/70">
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

      {/* Технологический стек */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">Технологический стек миссии</h2>
          <div className="ml-auto h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeatureChip icon={GitCommitHorizontal} title="Content-addressed" desc="Иммутабельные версии SHA-256" onClick={() => navigate("history")} />
          <FeatureChip icon={ShieldCheck} title="Guardrail-откат" desc="Авто-возврат при нарушении" onClick={() => navigate("deployment")} />
          <FeatureChip icon={FlaskConical} title="Sequential testing" desc="Ранняя остановка, контроль α" onClick={() => navigate("experiments")} />
          <FeatureChip icon={Sparkles} title="LLM-as-judge" desc="Авто-оценка каждого ответа" onClick={() => navigate("playground")} />
        </div>
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
    <div className="glass rounded-xl p-3">
      <Icon className="h-4 w-4 text-primary" />
      <div className="mt-2 text-xl font-bold tabular-nums text-glow">{value ?? "—"}</div>
      <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function HrDomain({
  icon: Icon,
  title,
  desc,
  count,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  count: string;
  onClick?: () => void;
}) {
  return (
    <Card
      role="button"
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden p-4 transition-all hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary glow-cyan-sm transition-transform group-hover:scale-110">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{desc}</div>
      <div className="mt-2 font-mono text-[10px] text-primary/60">{count}</div>
    </Card>
  );
}

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; positive?: boolean };
  icon: React.ElementType;
  hint?: string;
}) {
  return (
    <Card className="corner-brackets relative overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums">
            {value}
          </div>
          {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {delta && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 font-mono text-[11px] font-medium",
            delta.positive ? "text-emerald-400" : "text-rose-400"
          )}
        >
          {delta.positive ? "▲" : "▼"} {delta.value}
        </div>
      )}
    </Card>
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
      className="group cursor-pointer p-4 transition-all hover:border-primary/40 hover:bg-primary/5 hover:glow-cyan-sm"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-sm font-medium">{title}</div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{desc}</div>
    </Card>
  );
}

function actionTone(action: string): string {
  if (action.includes("activated") || action.includes("started")) return "bg-primary";
  if (action.includes("rollback")) return "bg-rose-500";
  if (action.includes("created")) return "bg-primary";
  if (action.includes("comment")) return "bg-amber-500";
  return "bg-zinc-400";
}
