"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FlaskConical,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Save,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { PromptContent, PromptVariable, ModelConfig } from "@/lib/prompt";

interface TestCase {
  id: string;
  name: string;
  inputs: Record<string, unknown>;
}

interface BatchResult {
  testCaseId: string;
  testCaseName: string;
  output: string;
  score: number;
  reason: string;
  tokens: number;
  latencyMs: number;
  status: "running" | "done" | "error";
  error?: string;
}

interface PastRun {
  id: string;
  passRate: number;
  avgScore: number;
  totalCount: number;
  createdAt: string;
}

export function BatchEvalDialog({
  open,
  onOpenChange,
  promptId,
  testCases,
  versionId,
  content,
  variables,
  modelConfig,
  modelId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  promptId: string | null;
  testCases: TestCase[];
  versionId: string | null;
  content: PromptContent;
  variables: PromptVariable[];
  modelConfig: ModelConfig;
  modelId: string;
}) {
  const qc = useQueryClient();
  const [running, setRunning] = React.useState(false);
  const [results, setResults] = React.useState<BatchResult[]>([]);
  const [startedAt, setStartedAt] = React.useState<number>(0);

  const { data: pastRunsData } = useQuery({
    queryKey: ["eval-runs", promptId],
    queryFn: () => fetch(`/api/prompts/${promptId}/eval-runs`).then((r) => r.json()),
    enabled: !!promptId && open,
  });
  const pastRuns: PastRun[] = pastRunsData?.evalRuns ?? [];

  const saveMut = useMutation({
    mutationFn: (body: any) =>
      fetch(`/api/prompts/${promptId}/eval-runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Результаты батч-оценки сохранены");
      qc.invalidateQueries({ queryKey: ["eval-runs", promptId] });
    },
  });

  React.useEffect(() => {
    if (open) {
      setResults([]);
      setRunning(false);
    }
  }, [open]);

  const runBatch = async () => {
    if (testCases.length === 0) {
      toast.error("Нет тест-кейсов. Создайте их в IDE.");
      return;
    }
    setRunning(true);
    setStartedAt(Date.now());
    setResults(testCases.map((tc) => ({
      testCaseId: tc.id,
      testCaseName: tc.name,
      output: "",
      score: 0,
      reason: "",
      tokens: 0,
      latencyMs: 0,
      status: "running",
    })));

    const batchResults: BatchResult[] = [];

    await Promise.all(testCases.map(async (tc, idx) => {
      try {
        // 1. Run the prompt
        const runRes = await fetch("/api/playground/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            versionId: versionId ?? undefined,
            content,
            variables,
            modelConfig,
            inputs: tc.inputs,
            modelId: modelId || undefined,
          }),
        });
        const runData = await runRes.json();
        if (!runRes.ok) throw new Error(runData.error ?? "run failed");

        // 2. Evaluate
        const evalRes = await fetch("/api/playground/eval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: JSON.stringify(tc.inputs).slice(0, 2000),
            output: runData.output,
            scale: "pass_fail",
          }),
        });
        const evalData = await evalRes.json();

        const result: BatchResult = {
          testCaseId: tc.id,
          testCaseName: tc.name,
          output: runData.output ?? "",
          score: evalData.score ?? 0,
          reason: evalData.reason ?? "",
          tokens: (runData.usage?.tokensIn ?? 0) + (runData.usage?.tokensOut ?? 0),
          latencyMs: runData.latencyMs ?? 0,
          status: "done",
        };
        batchResults.push(result);
        setResults((prev) => {
          const next = [...prev];
          next[idx] = result;
          return next;
        });
      } catch (e: any) {
        const result: BatchResult = {
          testCaseId: tc.id,
          testCaseName: tc.name,
          output: "",
          score: 0,
          reason: "",
          tokens: 0,
          latencyMs: 0,
          status: "error",
          error: e?.message ?? "failed",
        };
        batchResults.push(result);
        setResults((prev) => {
          const next = [...prev];
          next[idx] = result;
          return next;
        });
      }
    }));

    setRunning(false);

    // Save to DB
    const completed = batchResults.filter((r) => r.status === "done");
    const passed = completed.filter((r) => r.score >= 1).length;
    const passRate = completed.length > 0 ? passed / completed.length : 0;
    const avgScore = completed.length > 0 ? completed.reduce((s, r) => s + r.score, 0) / completed.length : 0;

    saveMut.mutate({
      versionId,
      modelId: modelId || null,
      passRate,
      avgScore,
      totalCount: batchResults.length,
      results: batchResults.map((r) => ({
        testCaseId: r.testCaseId,
        testCaseName: r.testCaseName,
        score: r.score,
        reason: r.reason,
        tokens: r.tokens,
        latencyMs: r.latencyMs,
        status: r.status,
      })),
    });
  };

  // Aggregate metrics
  const completed = results.filter((r) => r.status === "done");
  const passed = completed.filter((r) => r.score >= 1).length;
  const failed = completed.filter((r) => r.score < 1).length;
  const passRate = completed.length > 0 ? (passed / completed.length) * 100 : 0;
  const avgScore = completed.length > 0 ? completed.reduce((s, r) => s + r.score, 0) / completed.length : 0;
  const totalTokens = completed.reduce((s, r) => s + r.tokens, 0);
  const elapsed = running ? Date.now() - startedAt : 0;
  const progress = results.length > 0 ? (completed.length + results.filter((r) => r.status === "error").length) / results.length * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            Батч-оценка
            <Badge variant="secondary" className="text-[10px]">{testCases.length} тест-кейсов</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Action bar */}
        <div className="flex items-center gap-2 py-1">
          {running ? (
            <Button size="sm" disabled>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Выполняется...
            </Button>
          ) : (
            <Button size="sm" onClick={runBatch} disabled={testCases.length === 0}>
              <Play className="mr-1.5 h-4 w-4" /> Запустить оценку
            </Button>
          )}
          {running && (
            <div className="flex-1">
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        {/* Aggregate metrics */}
        {completed.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            <MetricCard label="Pass rate" value={`${passRate.toFixed(0)}%`} icon={CheckCircle2} color={passRate >= 70 ? "text-emerald-500" : "text-rose-500"} />
            <MetricCard label="Avg score" value={avgScore.toFixed(2)} icon={TrendingUp} color="text-primary" />
            <MetricCard label="Токены" value={totalTokens.toLocaleString()} icon={FlaskConical} color="text-muted-foreground" />
            <MetricCard label="Время" value={`${(elapsed / 1000).toFixed(1)}с`} icon={Loader2} color="text-muted-foreground" />
          </div>
        )}

        {/* Results table */}
        <div className="flex-1 overflow-y-auto">
          {results.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <FlaskConical className="mb-2 h-10 w-10 opacity-30" />
              <p className="text-sm">Нажмите «Запустить оценку»</p>
              <p className="mt-1 text-[11px]">Все тест-кейсы будут прогнаны и оценены LLM-as-judge</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {results.map((r) => (
                <div
                  key={r.testCaseId}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-3 py-2",
                    r.status === "running" && "border-primary/20 bg-primary/5",
                    r.status === "done" && r.score >= 1 && "border-emerald-500/20 bg-emerald-500/5",
                    r.status === "done" && r.score < 1 && "border-rose-500/20 bg-rose-500/5",
                    r.status === "error" && "border-rose-500/20 bg-rose-500/5",
                  )}
                >
                  {/* Status icon */}
                  <div className="mt-0.5 shrink-0">
                    {r.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {r.status === "done" && r.score >= 1 && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {r.status === "done" && r.score < 1 && <XCircle className="h-4 w-4 text-rose-500" />}
                    {r.status === "error" && <XCircle className="h-4 w-4 text-rose-500" />}
                  </div>
                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{r.testCaseName}</span>
                      {r.status === "done" && (
                        <Badge variant="secondary" className={cn("text-[9px]", r.score >= 1 ? "text-emerald-600" : "text-rose-600")}>
                          {r.score >= 1 ? "PASS" : "FAIL"}
                        </Badge>
                      )}
                      {r.status === "done" && (
                        <span className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{r.tokens} ток.</span>
                          <span>{r.latencyMs}мс</span>
                        </span>
                      )}
                    </div>
                    {r.status === "running" && <p className="mt-0.5 text-[11px] text-muted-foreground">Выполняется...</p>}
                    {r.status === "error" && <p className="mt-0.5 text-[11px] text-rose-500">{r.error}</p>}
                    {r.status === "done" && r.reason && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{r.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past runs */}
        {pastRuns.length > 0 && (
          <div className="border-t pt-2">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Save className="h-3 w-3" /> История оценок
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pastRuns.slice(0, 8).map((run) => (
                <div key={run.id} className="rounded-md border px-2 py-1 text-[10px]">
                  <span className={cn("font-medium", run.passRate >= 0.7 ? "text-emerald-500" : "text-rose-500")}>
                    {(run.passRate * 100).toFixed(0)}%
                  </span>
                  <span className="text-muted-foreground"> · {run.totalCount} ТК</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
        <Icon className={cn("h-3 w-3", color)} />
        {label}
      </div>
      <div className={cn("mt-0.5 text-lg font-semibold tabular-nums", color)}>{value}</div>
    </div>
  );
}
