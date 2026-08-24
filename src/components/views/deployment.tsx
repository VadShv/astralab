"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Rocket,
  RotateCcw,
  ArrowRight,
  CheckCircle2,
  Server,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNav } from "@/lib/nav-store";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ENVS = [
  { id: "development", label: "Разработка", color: "#06b6d4" },
  { id: "staging", label: "Staging", color: "#f59e0b" },
  { id: "production", label: "Продакшн", color: "#10b981" },
];

export function DeploymentView() {
  const qc = useQueryClient();
  const { navigate } = useNav();
  const { data, isLoading } = useQuery({
    queryKey: ["deployment"],
    queryFn: () => fetch("/api/deployment").then((r) => r.json()),
  });

  const rows: any[] = data?.rows ?? [];

  const activateMut = useMutation({
    mutationFn: ({ promptId, versionId, env }: { promptId: string; versionId: string; env: string }) =>
      fetch(`/api/prompts/${promptId}/active`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, environment: env }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deployment"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      toast.success("Версия продвинута");
    },
  });

  const rollbackMut = useMutation({
    mutationFn: ({ promptId, env }: { promptId: string; env: string }) =>
      fetch(`/api/prompts/${promptId}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ environment: env }),
      }).then((r) => r.json()),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["deployment"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      toast.success(`Откат к ${d.rolledBackTo?.semver}`);
    },
  });

  if (isLoading)
    return <div className="h-80 animate-pulse rounded-xl bg-muted/40" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Карта развёртывания</h2>
        <p className="text-sm text-muted-foreground">
          Активная версия на каждое окружение. Продвигайтесь dev → staging → prod или откатывайтесь мгновенно.
        </p>
      </div>

      <Card className="overflow-hidden">
        {/* header row */}
        <div className="grid border-b bg-muted/30" style={{ gridTemplateColumns: `220px repeat(${ENVS.length}, 1fr) 140px` }}>
          <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Промпт</div>
          {ENVS.map((e) => (
            <div key={e.id} className="px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full" style={{ background: e.color }} />
                {e.label}
              </div>
            </div>
          ))}
          <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Пайплайн</div>
        </div>

        {/* rows */}
        <div className="divide-y">
          {rows.map((row) => (
            <DeploymentRow
              key={row.promptId}
              row={row}
              onActivate={(versionId, env) => activateMut.mutate({ promptId: row.promptId, versionId, env })}
              onRollback={(env) => rollbackMut.mutate({ promptId: row.promptId, env })}
              onOpenHistory={() => navigate("history", { promptId: row.promptId })}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

function DeploymentRow({
  row,
  onActivate,
  onRollback,
  onOpenHistory,
}: {
  row: any;
  onActivate: (versionId: string, env: string) => void;
  onRollback: (env: string) => void;
  onOpenHistory: () => void;
}) {
  const { data: versionsData } = useQuery({
    queryKey: ["versions", row.promptId],
    queryFn: () => fetch(`/api/prompts/${row.promptId}/versions`).then((r) => r.json()),
  });
  const versions: any[] = versionsData?.versions ?? [];

  return (
    <div className="grid items-stretch" style={{ gridTemplateColumns: `220px repeat(${ENVS.length}, 1fr) 140px` }}>
      {/* prompt cell */}
      <button onClick={onOpenHistory} className="border-r px-4 py-3 text-left hover:bg-muted/30">
        <div className="font-mono text-sm font-semibold text-primary">{row.promptName}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{row.defaultModel ?? "—"}</div>
      </button>

      {/* env cells */}
      {ENVS.map((env) => {
        const active = row.environments[env.id];
        return (
          <div key={env.id} className="border-r px-4 py-3">
            {active ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold" style={{ color: env.color }}>
                    {active.semver}
                  </span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="text-[10px] text-muted-foreground">
                  кем: {active.activator ?? "система"} · {timeAgo(active.activatedAt)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Select
                    value=""
                    onValueChange={(v) => onActivate(v, env.id)}
                  >
                    <SelectTrigger className="h-7 flex-1 text-xs">
                      <span className="text-muted-foreground">продвинуть…</span>
                    </SelectTrigger>
                    <SelectContent>
                      {versions.filter((v) => v.id !== active.versionId).slice(0, 8).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.semver} · {v.branch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" className="h-7 w-7" title="Откат">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Откатить {row.promptName} в {env.label}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Мгновенно вернуться к предыдущей версии в {env.label}. Сработает webhook-событие.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onRollback(env.id)}>
                          Откатить сейчас
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 py-2">
                <Server className="h-4 w-4 text-muted-foreground/40" />
                <Select value="" onValueChange={(v) => onActivate(v, env.id)}>
                  <SelectTrigger className="h-7 w-full text-xs">
                    <span className="text-muted-foreground">задеплоить…</span>
                  </SelectTrigger>
                  <SelectContent>
                    {versions.slice(0, 8).map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.semver} · {v.branch}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        );
      })}

      {/* pipeline cell */}
      <div className="flex items-center justify-center gap-1 px-2 py-3">
        {ENVS.map((env, i) => {
          const active = row.environments[env.id];
          return (
            <React.Fragment key={env.id}>
              <div
                className={cn("h-2.5 w-2.5 rounded-full", active ? "" : "bg-muted")}
                style={active ? { background: env.color } : undefined}
                title={active ? `${env.label}: ${active.semver}` : `${env.label}: none`}
              />
              {i < ENVS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/40" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
