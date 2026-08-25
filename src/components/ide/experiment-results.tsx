"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import {
  FlaskConical,
  Trophy,
  Pause,
  Play,
  Rocket,
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/views/shared";
import { useNav } from "@/lib/nav-store";
import { cn } from "@/lib/utils";

const VARIANT_COLORS = ["#10b981", "#f59e0b", "#06b6d4", "#a855f7"];

export function ExperimentResults({ promptId }: { promptId: string | null }) {
  const { navigate } = useNav();
  const qc = useQueryClient();
  const [selectedExp, setSelectedExp] = React.useState<string | null>(null);

  const { data: expData } = useQuery({
    queryKey: ["ide-experiments", promptId],
    queryFn: () => fetch(`/api/prompts/${promptId}/experiments`).then((r) => r.json()),
    enabled: !!promptId,
  });
  const experiments: any[] = expData?.experiments ?? [];

  React.useEffect(() => {
    if (experiments.length > 0 && !selectedExp) {
      const running = experiments.find((e) => e.status === "running");
      setSelectedExp(running?.id ?? experiments[0].id);
    }
  }, [experiments, selectedExp]);

  const { data: results, isLoading: resultsLoading } = useQuery({
    queryKey: ["experiment-results", selectedExp],
    queryFn: () => fetch(`/api/experiments/${selectedExp}/results`).then((r) => r.json()),
    enabled: !!selectedExp,
    refetchInterval: (data: any) => (data?.experiment?.status === "running" ? 20000 : false),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetch(`/api/experiments/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["experiment-results", selectedExp] });
      qc.invalidateQueries({ queryKey: ["ide-experiments", promptId] });
      toast.success("Статус обновлён");
    },
  });

  const promoteMut = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/experiments/${id}/promote-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).then((r) => r.json()),
    onSuccess: (d) => {
      toast.success(`Победитель продвинут: ${d.promoted?.variant}`);
      qc.invalidateQueries({ queryKey: ["experiment-results", selectedExp] });
      qc.invalidateQueries({ queryKey: ["deployment"] });
    },
  });

  if (!promptId) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <FlaskConical className="mb-2 h-8 w-8 opacity-30" />
        <p className="text-xs">Выберите промпт</p>
      </div>
    );
  }

  if (experiments.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
        <FlaskConical className="mb-2 h-8 w-8 opacity-30" />
        <p className="text-xs">Нет экспериментов</p>
        <p className="mt-1 text-[10px]">Нажмите «A/B» в toolbar для запуска</p>
      </div>
    );
  }

  const exp = results?.experiment;
  const variants: any[] = results?.variants ?? [];
  const comparisons: any[] = results?.comparisons ?? [];
  const winner = results?.winner;
  const power = results?.power;
  const chartData = (results?.series ?? []).map((p: any) => ({
    t: new Date(p.t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    ...Object.fromEntries((results?.seriesVariantNames ?? []).map((n: string) => [n, p[n]])),
  }));

  return (
    <div className="flex h-full flex-col">
      {/* Experiment selector */}
      <div className="flex flex-wrap gap-1 border-b px-3 py-2">
        {experiments.map((e) => (
          <button
            key={e.id}
            onClick={() => setSelectedExp(e.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-colors",
              selectedExp === e.id ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <FlaskConical className="h-2.5 w-2.5" />
            {e.name.length > 20 ? e.name.slice(0, 18) + "…" : e.name}
            <StatusBadge status={e.status} className="text-[8px] px-1 py-0" />
          </button>
        ))}
      </div>

      {/* Results */}
      {resultsLoading || !exp ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-semibold">{exp.name}</span>
                <StatusBadge status={exp.status} className="text-[9px]" />
              </div>
              <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{exp.hypothesis}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {exp.status === "running" && (
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => statusMut.mutate({ id: selectedExp!, status: "paused" })}>
                  <Pause className="h-3.5 w-3.5" />
                </Button>
              )}
              {exp.status === "paused" && (
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => statusMut.mutate({ id: selectedExp!, status: "running" })}>
                  <Play className="h-3.5 w-3.5" />
                </Button>
              )}
              {winner && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] text-emerald-600" onClick={() => promoteMut.mutate(selectedExp!)}>
                  <Trophy className="mr-1 h-3 w-3" /> Продвинуть
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => navigate("experiments", { experimentId: selectedExp })} title="Полный дашборд">
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Power progress */}
          {power && (
            <div>
              <div className="mb-1 flex justify-between text-[10px]">
                <span className="text-muted-foreground">Мощность: {power.progressPct}%</span>
                <span className="font-mono text-muted-foreground">{power.collected}/{power.requiredPerVariant} на вариант</span>
              </div>
              <Progress value={power.progressPct} className="h-1.5" />
            </div>
          )}

          {/* Key metrics */}
          {comparisons.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {comparisons.map((c, i) => (
                <div key={i} className={cn(
                  "rounded-lg border px-2.5 py-2",
                  c.significant ? "border-emerald-500/20 bg-emerald-500/5" : "border-border"
                )}>
                  <div className="flex items-center gap-1">
                    {c.uplift > 0 ? <TrendingUp className="h-3 w-3 text-emerald-500" /> : <TrendingDown className="h-3 w-3 text-rose-500" />}
                    <span className="text-[10px] font-medium">{c.variant}</span>
                    {c.significant && <Badge variant="secondary" className="text-[8px] text-emerald-600">sig</Badge>}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className={cn("text-sm font-bold tabular-nums", c.uplift > 0 ? "text-emerald-500" : "text-rose-500")}>
                      {c.uplift > 0 ? "+" : ""}{(c.uplift * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">p={c.pFormatted}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {chartData.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] font-medium text-muted-foreground">Кумулятивная метрика</div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <XAxis dataKey="t" tick={{ fontSize: 8 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 8 }} domain={[0, "auto"]} />
                  <Tooltip contentStyle={{ fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  {(results?.seriesVariantNames ?? []).map((name: string, i: number) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={VARIANT_COLORS[i % VARIANT_COLORS.length]}
                      strokeWidth={1.5}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Winner */}
          {winner && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600">Победитель: {winner.name}</span>
              </div>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{winner.reason}</p>
            </div>
          )}

          {/* Variant stats table */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-[10px]">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-2 py-1 text-left font-medium">Вариант</th>
                  <th className="px-2 py-1 text-right font-medium">N</th>
                  <th className="px-2 py-1 text-right font-medium">Rate</th>
                  <th className="px-2 py-1 text-right font-medium">p95</th>
                  <th className="px-2 py-1 text-right font-medium">Токены</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={v.variantId} className="border-t">
                    <td className="px-2 py-1">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: VARIANT_COLORS[i % VARIANT_COLORS.length] }} />
                        {v.name}
                      </span>
                    </td>
                    <td className="px-2 py-1 text-right font-mono">{v.n}</td>
                    <td className="px-2 py-1 text-right font-mono">{(v.primary.rate ?? v.primary.mean).toFixed(3)}</td>
                    <td className="px-2 py-1 text-right font-mono">{v.latency.p95.toFixed(0)}ms</td>
                    <td className="px-2 py-1 text-right font-mono">{v.tokens.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total events */}
          <div className="text-center text-[10px] text-muted-foreground">
            Всего событий: {results?.totalEvents?.toLocaleString() ?? 0}
          </div>
        </div>
      )}
    </div>
  );
}
