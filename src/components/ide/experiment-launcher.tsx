"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FlaskConical,
  Rocket,
  ShieldAlert,
  Target,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface VersionOpt {
  id: string;
  semver: string;
  branch: string;
  commitMessage: string;
}

const PRIMARY_METRICS = [
  { value: "eval_pass_rate", label: "Eval Pass Rate" },
  { value: "latency", label: "Latency" },
  { value: "cost_per_request", label: "Cost per Request" },
  { value: "error_rate", label: "Error Rate" },
];

const PRESET_GUARDRAILS = [
  { metric: "latency_p95", op: "max", threshold: 2000, label: "p95 latency ≤ 2000ms" },
  { metric: "cost_per_request", op: "max", threshold: 0.05, label: "Cost ≤ $0.05/req" },
];

export function ExperimentLauncher({
  open,
  onOpenChange,
  promptId,
  versions,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  promptId: string | null;
  versions: VersionOpt[];
}) {
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [hypothesis, setHypothesis] = React.useState("");
  const [controlV, setControlV] = React.useState("");
  const [variantV, setVariantV] = React.useState("");
  const [primary, setPrimary] = React.useState("eval_pass_rate");
  const [confidence, setConfidence] = React.useState(0.95);
  const [split, setSplit] = React.useState(50);
  const [guardrails, setGuardrails] = React.useState<Set<number>>(new Set([0]));

  React.useEffect(() => {
    if (open && versions.length > 0) {
      const c = versions[versions.length - 1];
      const v = versions.length > 1 ? versions[versions.length - 2] : versions[0];
      setControlV(c.id);
      setVariantV(v.id);
      setName(`A/B: ${c.semver} vs ${v.semver}`);
      setHypothesis("");
    }
  }, [open]);

  const createMut = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch(`/api/prompts/${promptId}/experiments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Start the experiment
      await fetch(`/api/experiments/${data.experiment.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "running" }),
      });
      return data;
    },
    onSuccess: () => {
      toast.success("Эксперимент запущен");
      qc.invalidateQueries({ queryKey: ["prompt-experiments", promptId] });
      qc.invalidateQueries({ queryKey: ["ide-experiments", promptId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Не удалось создать эксперимент"),
  });

  const handleLaunch = () => {
    if (!name || !controlV || !variantV || controlV === variantV) return;
    const controlWeight = split / 100;
    const variantWeight = 1 - controlWeight;
    const selectedGuardrails = [...guardrails].map((i) => PRESET_GUARDRAILS[i]);

    createMut.mutate({
      name,
      hypothesis: hypothesis || `Variant ${versions.find(v => v.id === variantV)?.semver} improves ${primary}`,
      primaryMetric: primary,
      trafficSplit: { control: controlWeight, variant_a: variantWeight },
      confidenceLevel: confidence,
      guardrailMetrics: selectedGuardrails,
      variants: [
        { name: "control", versionId: controlV, trafficWeight: controlWeight },
        { name: "variant_a", versionId: variantV, trafficWeight: variantWeight },
      ],
    });
  };

  const toggleGuardrail = (i: number) => {
    const next = new Set(guardrails);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setGuardrails(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            Запуск A/B эксперимента
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1 max-h-[60vh] overflow-y-auto">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="A/B: v1.0 vs v1.1" />
          </div>

          {/* Hypothesis */}
          <div className="space-y-1.5">
            <Label className="text-xs">Гипотеза</Label>
            <Textarea
              rows={2}
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="Вариант поднимет eval pass rate на ≥3 п.п."
            />
          </div>

          {/* Version selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Контроль</Label>
              <Select value={controlV} onValueChange={setControlV}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.semver} · {v.branch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Претендент</Label>
              <Select value={variantV} onValueChange={setVariantV}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.semver} · {v.branch}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Primary metric + confidence */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1 text-xs"><Target className="h-3 w-3" /> Метрика</Label>
              <Select value={primary} onValueChange={setPrimary}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIMARY_METRICS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Уровень доверия</Label>
              <Select value={String(confidence)} onValueChange={(v) => setConfidence(Number(v))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.9">90%</SelectItem>
                  <SelectItem value="0.95">95%</SelectItem>
                  <SelectItem value="0.99">99%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Traffic split */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-xs">Распределение трафика</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {split}% / {100 - split}%
              </span>
            </div>
            <Slider value={[split]} min={10} max={90} step={5} onValueChange={([v]) => setSplit(v)} />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Контроль</span>
              <span>Претендент</span>
            </div>
          </div>

          {/* Guardrails */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1 text-xs"><ShieldAlert className="h-3 w-3" /> Guardrail-метрики</Label>
            <div className="space-y-1">
              {PRESET_GUARDRAILS.map((g, i) => (
                <label
                  key={i}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors",
                    guardrails.has(i) ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={guardrails.has(i)}
                    onChange={() => toggleGuardrail(i)}
                  />
                  <span>{g.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Rocket className="h-3 w-3" />
              Эксперимент будет создан и сразу запущен (status: running).
              Минимальный размер выборки рассчитается автоматически.
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Отмена</Button>
          <Button
            onClick={handleLaunch}
            disabled={!name || !controlV || !variantV || controlV === variantV || createMut.isPending}
          >
            {createMut.isPending ? "Запуск..." : (
              <><Rocket className="mr-1.5 h-4 w-4" /> Создать и запустить</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
