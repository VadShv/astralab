"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Check,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PromptContent, PromptVariable } from "@/lib/prompt";

interface Suggestion {
  title: string;
  rationale: string;
  system: string;
  user: string;
}

interface OptimizeResult {
  analysis: string;
  suggestions: Suggestion[];
  raw?: string;
}

export function OptimizeDialog({
  open,
  onOpenChange,
  content,
  variables,
  sampleOutput,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  content: PromptContent;
  variables: PromptVariable[];
  sampleOutput?: string;
  onApply: (system: string, user: string) => void;
}) {
  const [result, setResult] = React.useState<OptimizeResult | null>(null);
  const [expanded, setExpanded] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (open) {
      setResult(null);
      setExpanded(null);
    }
  }, [open]);

  const optimizeMut = useMutation({
    mutationFn: (body: any) =>
      fetch("/api/playground/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setResult(data);
      if (data.suggestions?.length > 0) setExpanded(0);
    },
    onError: (e: any) => toast.error(e?.message ?? "optimization failed"),
  });

  const runOptimize = () => {
    optimizeMut.mutate({ content, variables, sampleOutput });
  };

  const applySuggestion = (s: Suggestion) => {
    onApply(s.system, s.user);
    toast.success(`Применён вариант: ${s.title}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI-оптимизация промпта
          </DialogTitle>
        </DialogHeader>

        {/* Action */}
        {!result && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {optimizeMut.isPending ? (
              <>
                <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium">Анализ промпта...</p>
                <p className="mt-1 text-[11px] text-muted-foreground">LLM анализирует слабые места и предлагает улучшения</p>
              </>
            ) : (
              <>
                <Sparkles className="mb-3 h-10 w-10 text-primary opacity-50" />
                <p className="text-sm">AI проанализирует ваш промпт и предложит 3 улучшенных варианта</p>
                <Button size="sm" className="mt-4" onClick={runOptimize}>
                  <Sparkles className="mr-1.5 h-4 w-4" /> Запустить анализ
                </Button>
              </>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="flex-1 overflow-y-auto space-y-3">
            {/* Analysis */}
            {result.analysis && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-amber-600">
                  <Lightbulb className="h-3.5 w-3.5" /> Анализ слабых мест
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed">{result.analysis}</p>
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions.length === 0 && result.raw && (
              <div className="rounded-lg border p-3">
                <p className="text-[11px] text-muted-foreground mb-1">Не удалось распарсить ответ LLM:</p>
                <pre className="text-[10px] whitespace-pre-wrap text-muted-foreground max-h-40 overflow-y-auto">{result.raw}</pre>
              </div>
            )}

            {result.suggestions.map((s, i) => (
              <div key={i} className="rounded-lg border border-primary/10 bg-card overflow-hidden">
                {/* Header */}
                <button
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/30"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  {expanded === i ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <span className="text-xs font-semibold">{s.title}</span>
                  <Badge variant="secondary" className="text-[9px]">вариант {i + 1}</Badge>
                  <span className="ml-auto text-[11px] text-muted-foreground line-clamp-1 max-w-[300px]">{s.rationale}</span>
                </button>

                {/* Expanded content */}
                {expanded === i && (
                  <div className="border-t space-y-2 p-3">
                    <p className="text-[11px] text-muted-foreground">{s.rationale}</p>
                    {s.system && (
                      <div>
                        <div className="mb-1 text-[10px] font-medium text-primary">SYSTEM</div>
                        <Textarea
                          readOnly
                          className="min-h-[100px] resize-y font-mono text-[11px] leading-relaxed bg-muted/30"
                          value={s.system}
                        />
                      </div>
                    )}
                    {s.user && (
                      <div>
                        <div className="mb-1 text-[10px] font-medium text-primary">USER</div>
                        <Textarea
                          readOnly
                          className="min-h-[100px] resize-y font-mono text-[11px] leading-relaxed bg-muted/30"
                          value={s.user}
                        />
                      </div>
                    )}
                    <Button size="sm" onClick={() => applySuggestion(s)}>
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Применить этот вариант
                    </Button>
                  </div>
                )}

                {/* Quick apply (when collapsed) */}
                {expanded !== i && (
                  <div className="flex justify-end px-3 pb-2">
                    <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => applySuggestion(s)}>
                      <ArrowRight className="mr-1 h-3 w-3" /> Применить
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {result && (
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={runOptimize} disabled={optimizeMut.isPending}>
              {optimizeMut.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
              Повторить анализ
            </Button>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Закрыть</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
