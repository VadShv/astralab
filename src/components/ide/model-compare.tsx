"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  GitCompare,
  Play,
  Square,
  Loader2,
  Cpu,
  Zap,
  Clock,
  Gavel,
  Check,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { streamRun, type RunResult } from "@/lib/stream-client";
import type { PromptContent, PromptVariable, ModelConfig } from "@/lib/prompt";

interface ModelOption {
  id: string;
  displayName: string;
  provider: { name: string; isActive: boolean };
  isDefault: boolean;
}

export function ModelCompareDialog({
  open,
  onOpenChange,
  models,
  versionId,
  content,
  variables,
  modelConfig,
  inputs,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  models: ModelOption[];
  versionId: string | null;
  content: PromptContent;
  variables: PromptVariable[];
  modelConfig: ModelConfig;
  inputs: Record<string, unknown>;
}) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [results, setResults] = React.useState<Record<string, RunResult>>({});
  const [running, setRunning] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const [evals, setEvals] = React.useState<Record<string, { score: number; reason: string } | undefined>>({});
  const [evaluating, setEvaluating] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (open) {
      const active = models.filter((m) => m.provider.isActive);
      const preselect = active.slice(0, Math.min(2, active.length));
      setSelected(new Set(preselect.map((m) => m.id)));
      setResults({});
      setEvals({});
    }
  }, [open]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      if (next.size >= 4) {
        toast.warning("Максимум 4 модели для сравнения");
        return;
      }
      next.add(id);
    }
    setSelected(next);
  };

  const runComparison = async () => {
    if (selected.size < 2) {
      toast.error("Выберите минимум 2 модели");
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRunning(true);
    setResults({});
    setEvals({});

    const ids = [...selected];
    await Promise.all(
      ids.map((modelId) => {
        const started = Date.now();
        setResults((prev) => ({ ...prev, [modelId]: { output: "", streaming: true } }));
        return streamRun(
          { versionId: versionId ?? undefined, content, variables, modelConfig, inputs, modelId },
          {
            onToken: (t) =>
              setResults((prev) => ({
                ...prev,
                [modelId]: { ...prev[modelId], output: (prev[modelId]?.output ?? "") + t, streaming: true },
              })),
            onDone: (usage, model) =>
              setResults((prev) => ({
                ...prev,
                [modelId]: { ...prev[modelId], streaming: false, usage, model, latencyMs: Date.now() - started },
              })),
            onError: (e) =>
              setResults((prev) => ({ ...prev, [modelId]: { ...prev[modelId], streaming: false, error: e } })),
          },
          ac.signal
        );
      })
    );
    setRunning(false);
  };

  const stop = () => {
    abortRef.current?.abort();
    setRunning(false);
    setResults((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[k].streaming) next[k] = { ...next[k], streaming: false };
      return next;
    });
  };

  const evaluate = async (modelId: string) => {
    const r = results[modelId];
    if (!r?.output) return;
    setEvaluating((prev) => new Set(prev).add(modelId));
    try {
      const res = await fetch("/api/playground/eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: JSON.stringify(inputs).slice(0, 2000),
          output: r.output,
          scale: "pass_fail",
        }),
      });
      const data = await res.json();
      if (res.ok) setEvals((prev) => ({ ...prev, [modelId]: data }));
      else toast.error(data.error ?? "eval failed");
    } catch (e: any) {
      toast.error(e?.message);
    }
    setEvaluating((prev) => {
      const next = new Set(prev);
      next.delete(modelId);
      return next;
    });
  };

  const activeModels = models.filter((m) => m.provider.isActive);
  const selectedList = [...selected];
  const gridCols = selectedList.length <= 2 ? "grid-cols-2" : "grid-cols-2";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            Сравнение моделей
          </DialogTitle>
        </DialogHeader>

        {/* Model selection */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Выберите 2–4 модели для параллельного запуска одного промпта:
          </div>
          <div className="flex flex-wrap gap-2">
            {activeModels.map((m) => {
              const isSel = selected.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
                    isSel ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <span className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    isSel ? "border-primary bg-primary text-white" : "border-muted-foreground/30"
                  )}>
                    {isSel && <Check className="h-3 w-3" />}
                  </span>
                  <span className="font-medium">{m.displayName}</span>
                  <span className="text-[10px] text-muted-foreground/70">{m.provider.name}</span>
                  {m.isDefault && <Badge variant="secondary" className="text-[9px]">дефолт</Badge>}
                </button>
              );
            })}
          </div>
          {activeModels.length < 2 && (
            <p className="text-[11px] text-amber-500">
              Нужно минимум 2 активные модели. Настройте провайдеров в Настройках.
            </p>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2 py-1">
          {running ? (
            <Button size="sm" variant="destructive" onClick={stop}>
              <Square className="mr-1.5 h-4 w-4" /> Стоп
            </Button>
          ) : (
            <Button size="sm" onClick={runComparison} disabled={selected.size < 2}>
              <Play className="mr-1.5 h-4 w-4" /> Запустить сравнение ({selected.size})
            </Button>
          )}
          {Object.values(results).some((r) => r.streaming) && (
            <span className="flex items-center gap-1 text-xs text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> стриминг...
            </span>
          )}
        </div>

        {/* Results grid */}
        {selectedList.length > 0 && Object.keys(results).length > 0 && (
          <div className={cn("flex-1 overflow-y-auto grid gap-3", gridCols)}>
            {selectedList.map((modelId) => {
              const m = models.find((x) => x.id === modelId);
              const r = results[modelId];
              if (!r) return null;
              const evalRes = evals[modelId];
              const isEvaluating = evaluating.has(modelId);
              return (
                <div key={modelId} className="flex flex-col rounded-lg border border-primary/10 bg-card overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">{m?.displayName}</span>
                    </div>
                    {r.streaming && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                  </div>
                  {/* Output */}
                  <div className="flex-1 overflow-y-auto p-3">
                    {r.error ? (
                      <div className="rounded-md border border-rose-500/20 bg-rose-500/5 px-2.5 py-2 text-xs text-rose-600">
                        {r.error}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/90">
                        {r.output || <span className="text-muted-foreground">Ожидание...</span>}
                        {r.streaming && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary" />}
                      </div>
                    )}
                  </div>
                  {/* Metrics */}
                  {!r.streaming && !r.error && r.output && (
                    <div className="border-t px-3 py-2 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        {r.usage && (
                          <>
                            <span className="flex items-center gap-0.5"><Zap className="h-3 w-3" /> {r.usage.tokensIn + r.usage.tokensOut}</span>
                            <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {r.latencyMs}мс</span>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-6 text-[10px]"
                          onClick={() => evaluate(modelId)}
                          disabled={isEvaluating}
                        >
                          {isEvaluating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Gavel className="mr-1 h-3 w-3" />}
                          Оценить
                        </Button>
                      </div>
                      {evalRes && (
                        <div className={cn(
                          "rounded-md px-2 py-1 text-[11px]",
                          evalRes.score >= 1 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                        )}>
                          <b>{evalRes.score >= 1 ? "PASS" : "FAIL"}</b> — {evalRes.reason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {Object.keys(results).length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <GitCompare className="mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm">Выберите модели и нажмите «Запустить сравнение»</p>
            <p className="mt-1 text-[11px]">Ответы появятся здесь бок о бок в реальном времени</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
