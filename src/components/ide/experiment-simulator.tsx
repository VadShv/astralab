"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

/**
 * Dialog for generating synthetic A/B experiment events.
 * Lets the user tune event count, per-variant success rates, latency range,
 * cost and the time span the events are spread over. On success the parent
 * refetches the results so uplift / p-value / chart / winner update live.
 */
export function ExperimentSimulator({
  open,
  onOpenChange,
  experimentId,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  experimentId: string | null;
  onGenerated: () => void;
}) {
  const [eventCount, setEventCount] = React.useState(2000);
  const [controlPct, setControlPct] = React.useState(70);
  const [variantPct, setVariantPct] = React.useState(80);
  const [latencyMin, setLatencyMin] = React.useState(200);
  const [latencyMax, setLatencyMax] = React.useState(1500);
  const [cost, setCost] = React.useState(0.01);
  const [hours, setHours] = React.useState(24);

  React.useEffect(() => {
    if (open) {
      setEventCount(2000);
      setControlPct(70);
      setVariantPct(80);
      setLatencyMin(200);
      setLatencyMax(1500);
      setCost(0.01);
      setHours(24);
    }
  }, [open]);

  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/experiments/${experimentId}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCount,
          controlRate: controlPct / 100,
          variantRate: variantPct / 100,
          latencyMin,
          latencyMax,
          costPerRequest: cost,
          hoursSpan: hours,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data as { created: number };
    },
    onSuccess: (d) => {
      toast.success(`Сгенерировано событий: ${d.created.toLocaleString()}`);
      onGenerated();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Не удалось сгенерировать"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Симуляция трафика A/B
          </DialogTitle>
          <DialogDescription>
            Сгенерировать синтетические события для проверки статистического движка без реального трафика.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-1">
          {/* Event count */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-xs">Количество событий</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {eventCount.toLocaleString()}
              </span>
            </div>
            <Slider
              value={[eventCount]}
              min={100}
              max={10000}
              step={100}
              onValueChange={([v]) => setEventCount(v)}
            />
          </div>

          {/* Control / variant success rates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs">Control success rate</Label>
                <span className="font-mono text-xs text-muted-foreground">{controlPct}%</span>
              </div>
              <Slider
                value={[controlPct]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) => setControlPct(v)}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs">Variant success rate</Label>
                <span className="font-mono text-xs text-muted-foreground">{variantPct}%</span>
              </div>
              <Slider
                value={[variantPct]}
                min={0}
                max={100}
                step={1}
                onValueChange={([v]) => setVariantPct(v)}
              />
            </div>
          </div>

          {/* Latency range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Latency min, ms</Label>
              <Input
                type="number"
                value={latencyMin}
                onChange={(e) => setLatencyMin(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Latency max, ms</Label>
              <Input
                type="number"
                value={latencyMax}
                onChange={(e) => setLatencyMax(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Cost + time span */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Стоимость за запрос, $</Label>
              <Input
                type="number"
                step="0.001"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <Label className="text-xs">Период, часов</Label>
                <span className="font-mono text-xs text-muted-foreground">{hours}ч</span>
              </div>
              <Slider
                value={[hours]}
                min={1}
                max={168}
                step={1}
                onValueChange={([v]) => setHours(v)}
              />
            </div>
          </div>

          {/* Hint */}
          <div className="rounded-lg bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
            События распределятся по вариантам согласно traffic split эксперимента.
            createdAt размазан за последние {hours}ч для реалистичного графика.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Генерация…
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" /> Сгенерировать
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
