"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  BarChart,
  Bar,
  Cell,
  ErrorBar,
} from "recharts";
import {
  FlaskConical,
  Trophy,
  ShieldAlert,
  Activity,
  Pause,
  Play,
  Rocket,
  Plus,
  ArrowLeft,
  Target,
  Gauge,
  GitBranch,
  FileCode2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, Panel } from "./shared";
import { useNav } from "@/lib/nav-store";
import { fmtPct, fmtNum, fmtUsd, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const VARIANT_COLORS = ["#10b981", "#f59e0b", "#06b6d4", "#a855f7", "#f43f5e"];

export function ExperimentsView() {
  const { experimentId, navigate } = useNav();
  if (experimentId) return <ExperimentDashboard experimentId={experimentId} />;
  return <ExperimentsList />;
}

function ExperimentsList() {
  const { navigate, promptId: navPromptId } = useNav();
  const { data: promptsData } = useQuery({
    queryKey: ["prompts"],
    queryFn: () => fetch("/api/prompts").then((r) => r.json()),
  });
  const [selectedPrompt, setSelectedPrompt] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (selectedPrompt) return;
    const list = promptsData?.prompts ?? [];
    if (!list.length) return;
    const initial = navPromptId && list.some((p: any) => p.id === navPromptId) ? navPromptId : list[0].id;
    setSelectedPrompt(initial);
  }, [promptsData, navPromptId, selectedPrompt]);

  const { data: expData } = useQuery({
    queryKey: ["prompt-experiments", selectedPrompt],
    queryFn: () => fetch(`/api/prompts/${selectedPrompt}/experiments`).then((r) => r.json()),
    enabled: !!selectedPrompt,
  });
  const experiments = expData?.experiments ?? [];

  const [createOpen, setCreateOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Эксперименты</h2>
          <p className="text-sm text-muted-foreground">Статистически обеспеченные A/B-тесты на живом трафике</p>
        </div>
        <div className="flex gap-2">
          {selectedPrompt && (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate("history", { promptId: selectedPrompt })}>
                <GitBranch className="mr-1.5 h-4 w-4" /> Граф версий
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("ide", { promptId: selectedPrompt })}>
                <FileCode2 className="mr-1.5 h-4 w-4" /> IDE
              </Button>
            </>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Новый эксперимент
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {promptsData?.prompts?.map((p: any) => (
          <button
            key={p.id}
            onClick={() => setSelectedPrompt(p.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium font-mono transition-colors",
              selectedPrompt === p.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      {experiments.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Для этого промпта пока нет экспериментов.
        </Card>
      ) : (
        <div className="grid gap-3">
          {experiments.map((e: any) => (
            <Card
              key={e.id}
              className="cursor-pointer p-4 hover:border-primary/40"
              onClick={() => navigate("experiments", { experimentId: e.id })}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{e.name}</span>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">{e.hypothesis}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="font-mono">{e.primaryMetric}</span>
                    <span>· {(e.trafficSplit as any)?.control * 100}/{(e.trafficSplit as any)?.variant_a * 100} распределение</span>
                    <span>· {e.variants?.length} варианта(ов)</span>
                    <span>· начат {e.startedAt ? timeAgo(e.startedAt) : "—"}</span>
                  </div>
                </div>
                <FlaskConical className="h-5 w-5 shrink-0 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateExperimentDialog open={createOpen} onOpenChange={setCreateOpen} promptId={selectedPrompt} />
    </div>
  );
}

function ExperimentDashboard({ experimentId }: { experimentId: string }) {
  const { navigate } = useNav();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["experiment-results", experimentId],
    queryFn: () => fetch(`/api/experiments/${experimentId}/results`).then((r) => r.json()),
    refetchInterval: 20000,
  });

  const statusMut = useMutation({
    mutationFn: (status: string) =>
      fetch(`/api/experiments/${experimentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experiment-results", experimentId] });
      toast.success("Статус обновлён");
    },
  });

  const promoteMut = useMutation({
    mutationFn: () =>
      fetch(`/api/experiments/${experimentId}/promote-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((r) => r.json()),
    onSuccess: (d) => {
      toast.success(`Продвинут ${d.promoted.variant} → ${d.promoted.environment}`, {
        action: { label: "Развёртывание", onClick: () => navigate("deployment") },
      });
      qc.invalidateQueries({ queryKey: ["experiment-results", experimentId] });
      qc.invalidateQueries({ queryKey: ["deployment"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
  });

  if (isLoading || !data)
    return <div className="space-y-3"><div className="h-10 w-64 animate-pulse rounded bg-muted" /><div className="h-80 animate-pulse rounded-xl bg-muted/40" /></div>;

  const exp = data.experiment;
  const control = data.variants.find((v: any) => v.variantId === data.controlVariantId) ?? data.variants[0];
  const chartData = data.series.map((p: any) => ({
    t: new Date(p.t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    ...Object.fromEntries(data.seriesVariantNames.map((n: string) => [n, p[n]])),
  }));

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("experiments", { experimentId: null })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{exp.name}</h2>
              <StatusBadge status={exp.status} />
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{exp.hypothesis}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="font-mono">метрика: {exp.primaryMetric}</span>
              <span>· доверие {(exp.confidenceLevel * 100).toFixed(0)}%</span>
              <span>· {data.totalEvents.toLocaleString()} событий</span>
              <span>· начат {exp.startedAt ? timeAgo(exp.startedAt) : "—"}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {exp.promptId && (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate("history", { promptId: exp.promptId })}>
                <GitBranch className="mr-1.5 h-4 w-4" /> Граф версий
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("ide", { promptId: exp.promptId })}>
                <FileCode2 className="mr-1.5 h-4 w-4" /> IDE
              </Button>
            </>
          )}
          {exp.status === "running" ? (
            <Button variant="outline" size="sm" onClick={() => statusMut.mutate("paused")}>
              <Pause className="mr-1.5 h-4 w-4" /> Пауза
            </Button>
          ) : exp.status === "paused" ? (
            <Button variant="outline" size="sm" onClick={() => statusMut.mutate("running")}>
              <Play className="mr-1.5 h-4 w-4" /> Возобновить
            </Button>
          ) : null}
          {data.winner && (
            <Button size="sm" onClick={() => promoteMut.mutate()} disabled={promoteMut.isPending}>
              <Trophy className="mr-1.5 h-4 w-4" /> Продвинуть победителя
            </Button>
          )}
        </div>
      </div>

      {/* Winner banner */}
      {data.winner && (
        <Card className="border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                Рекомендованный победитель: {data.winner.name}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{data.winner.reason}</div>
            </div>
          </div>
        </Card>
      )}
      {data.guardrailStatus.some((g: any) => g.violated) && (
        <Card className="border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500" />
            <div className="text-xs">
              <span className="font-semibold text-amber-700 dark:text-amber-400">Нарушен guardrail: </span>
              <span className="text-muted-foreground">
                {data.guardrailStatus.filter((g: any) => g.violated).map((g: any) => `${g.metric} on ${g.violatingVariants.join(", ")}`).join("; ")}. Рекомендуется поставить на паузу или откатиться.
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Power progress */}
      <Panel
        title="Размер выборки и мощность"
        description={`MDE 3% · мощность 80% · доверие ${(exp.confidenceLevel * 100).toFixed(0)}%`}
        action={<span className="text-xs font-medium">{data.power.collected.toLocaleString()} / {data.power.requiredPerVariant.toLocaleString()} на вариант</span>}
      >
        <div className="space-y-2">
          <Progress value={data.power.progressPct} className="h-2" />
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>{data.power.progressPct}% нужной выборки собрано</span>
            <span>{data.power.progressPct >= 100 ? "✓ достаточная мощность" : `осталось ${100 - data.power.progressPct}%`}</span>
          </div>
        </div>
      </Panel>

      {/* Cumulative chart */}
      <Panel
        title={`Накопительный ${exp.primaryMetric.replace(/_/g, " ")}`}
        description="Скользящее среднее по вариантам во времени"
      >
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="t" tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any) => `${(v * 100).toFixed(1)}%`}
              />
              <ReferenceLine y={control.primary.rate} stroke="#10b981" strokeDasharray="4 4" strokeOpacity={0.4} />
              {data.seriesVariantNames.map((name: string, i: number) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={VARIANT_COLORS[i % VARIANT_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  name={name}
                />
              ))}
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Comparison table */}
        <Panel title="Статистическое сравнение" description={`${data.comparisons[0]?.testType ?? "—"}`} bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Вариант</th>
                  <th className="px-3 py-2 text-right font-medium">Доля</th>
                  <th className="px-3 py-2 text-right font-medium">Прирост</th>
                  <th className="px-3 py-2 text-right font-medium">95% ДИ</th>
                  <th className="px-3 py-2 text-right font-medium">p-value</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-4 py-2.5 font-medium">{control.name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(control.primary.rate ?? control.primary.mean)}</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">базовая</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">—</td>
                  <td className="px-3 py-2.5 text-right text-muted-foreground">—</td>
                </tr>
                {data.comparisons.map((c: any) => (
                  <tr key={c.variant}>
                    <td className="px-4 py-2.5 font-medium">{c.variant}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{fmtPct(c.variantRate)}</td>
                    <td className={cn("px-3 py-2.5 text-right tabular-nums font-medium", c.uplift > 0 ? "text-emerald-500" : "text-rose-500")}>
                      {c.uplift > 0 ? "+" : ""}{(c.uplift * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                      [{(c.ciLow * 100).toFixed(1)}, {(c.ciHigh * 100).toFixed(1)}]
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      <span className={cn(c.significant && "font-semibold text-emerald-500")}>{c.pFormatted}</span>
                      <span className="ml-1 text-[10px] text-muted-foreground">{c.stars}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Variant metrics grid */}
        <Panel title="Метрики вариантов" description="Среднее · p95 · стоимость по всем сигналам" bodyClassName="p-0">
          <div className="divide-y">
            {data.variants.map((v: any, i: number) => (
              <div key={v.variantId} className="flex items-center gap-3 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: VARIANT_COLORS[i % VARIANT_COLORS.length] }} />
                <div className="w-20 font-medium text-sm">{v.name}</div>
                <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <Metric label="n" value={fmtNum(v.n)} />
                  <Metric label="доля" value={fmtPct(v.primary.rate ?? v.primary.mean, 1)} mono />
                  <Metric label="p95" value={`${v.latency.p95}ms`} mono />
                  <Metric label="стоим." value={fmtUsd(v.cost.mean)} mono />
                  <Metric label="tok" value={fmtNum(v.tokens.total)} mono />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Guardrails */}
        <Panel title="Guardrail-метрики" description="Триггеры авто-паузы">
          <div className="space-y-3">
            {data.guardrailStatus.map((g: any) => (
              <div key={g.metric} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className={cn("h-4 w-4", g.violated ? "text-rose-500" : "text-emerald-500")} />
                  <span className="font-mono text-xs">{g.metric}</span>
                  <span className="text-[11px] text-muted-foreground">{g.op} {g.threshold}</span>
                </div>
                <div className="flex items-center gap-2">
                  {g.values.map((val: any) => (
                    <span key={val.variant} className={cn("font-mono text-xs", g.violated && g.violatingVariants.includes(val.variant) ? "text-rose-500 font-semibold" : "")}>
                      {val.variant}: {g.metric === "latency_p95" ? `${Math.round(val.value)}ms` : fmtUsd(val.value)}
                    </span>
                  ))}
                  <Badge variant={g.violated ? "destructive" : "secondary"} className="text-[10px]">
                    {g.violated ? "нарушено" : "ок"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Sequential test */}
        <Panel title="Sequential testing (mSPRT)" description="Always-valid p-value для ранней остановки">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Always-valid p-value</span>
              <span className={cn("font-mono text-sm font-semibold", data.sequential.alwaysValidP < 0.01 ? "text-emerald-500" : "text-muted-foreground")}>
                {data.sequential.alwaysValidP < 0.001 ? "< 0.001" : data.sequential.alwaysValidP.toFixed(4)}
              </span>
            </div>
            {data.sequential.stoppedVariant && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-400">
                ✓ Можно останавливать — данные в пользу <span className="font-semibold">{data.sequential.stoppedVariant}</span>
              </div>
            )}
            <div className="space-y-2">
              {data.sequential.evidence.map((e: any) => (
                <div key={e.variant} className="flex items-center justify-between text-xs">
                  <span className="font-mono">{e.variant}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, (e.llr / 10) * 100))}%` }} />
                    </div>
                    <span className="w-12 text-right font-mono text-muted-foreground">{e.llr.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Metric({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-[10px] uppercase text-muted-foreground/70">{label}</span>
      <span className={cn("font-semibold text-foreground", mono && "font-mono tabular-nums")}>{value}</span>
    </span>
  );
}

function CreateExperimentDialog({
  open,
  onOpenChange,
  promptId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  promptId: string | null;
}) {
  const qc = useQueryClient();
  const { data: versionsData } = useQuery({
    queryKey: ["versions", promptId],
    queryFn: () => fetch(`/api/prompts/${promptId}/versions`).then((r) => r.json()),
    enabled: !!promptId,
  });
  const versions = versionsData?.versions ?? [];
  const [name, setName] = React.useState("");
  const [hypothesis, setHypothesis] = React.useState("");
  const [controlV, setControlV] = React.useState("");
  const [variantV, setVariantV] = React.useState("");
  const [primary, setPrimary] = React.useState("eval_pass_rate");

  React.useEffect(() => {
    if (versions.length && !controlV) setControlV(versions[0].id);
    if (versions.length > 1 && !variantV) setVariantV(versions[1].id);
  }, [versions, controlV, variantV]);

  const mut = useMutation({
    mutationFn: (body: any) =>
      fetch(`/api/prompts/${promptId}/experiments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Эксперимент создан (черновик). Запустите из списка.");
      qc.invalidateQueries({ queryKey: ["prompt-experiments", promptId] });
      onOpenChange(false);
      setName(""); setHypothesis("");
    },
    onError: (e: any) => toast.error(e.message ?? "Не удалось"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Новый эксперимент</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs">Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tone v2 vs Control" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Гипотеза</Label>
            <Textarea rows={2} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} placeholder="Вариант поднимет eval pass rate на ≥3п.п." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Контрольная версия</Label>
              <Select value={controlV} onValueChange={setControlV}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {versions.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.semver} · {v.branch}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Версия-претендент</Label>
              <Select value={variantV} onValueChange={setVariantV}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {versions.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.semver} · {v.branch}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Основная метрика</Label>
            <Select value={primary} onValueChange={setPrimary}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="eval_pass_rate">eval_pass_rate</SelectItem>
                <SelectItem value="latency">latency</SelectItem>
                <SelectItem value="cost_per_request">cost_per_request</SelectItem>
                <SelectItem value="error_rate">error_rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button
            disabled={!name || !controlV || !variantV || controlV === variantV}
            onClick={() =>
              mut.mutate({
                name,
                hypothesis,
                primaryMetric: primary,
                trafficSplit: { control: 0.5, variant_a: 0.5 },
                confidenceLevel: 0.95,
                variants: [
                  { name: "control", versionId: controlV, trafficWeight: 0.5 },
                  { name: "variant_a", versionId: variantV, trafficWeight: 0.5 },
                ],
              })
            }
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
