"use client";

import * as React from "react";
import { FileDiff, ArrowRight, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { lineDiff, type DiffRow, type PromptContent, type PromptVariable, type ModelConfig } from "@/lib/prompt";
import { cn } from "@/lib/utils";
import { shortHash } from "@/lib/format";

export interface DiffVersion {
  id: string;
  semver: string;
  branch: string;
  content: PromptContent;
  variables: PromptVariable[];
  modelConfig: ModelConfig;
  model?: { id: string; displayName: string } | null;
  versionHash: string;
}

/** Highlight {{variables}} in a text line. */
function highlightVars(text: string): React.ReactNode {
  if (!text) return "";
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((p, i) =>
    /^\{\{[^}]+\}\}$/.test(p) ? (
      <span key={i} className="rounded bg-primary/20 px-0.5 font-mono text-primary">{p}</span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

function DiffLine({ row }: { row: DiffRow }) {
  const isAdd = row.type === "add";
  const isDel = row.type === "del";
  return (
    <div
      className={cn(
        "flex items-start gap-2 px-2 py-0.5 font-mono text-[11px] leading-relaxed",
        isAdd && "bg-emerald-500/10",
        isDel && "bg-rose-500/10",
      )}
    >
      <span className="w-8 shrink-0 text-right text-muted-foreground/50 select-none">
        {row.oldNo ?? ""}
      </span>
      <span className="w-8 shrink-0 text-right text-muted-foreground/50 select-none">
        {row.newNo ?? ""}
      </span>
      <span className={cn("w-4 shrink-0 select-none", isAdd && "text-emerald-500", isDel && "text-rose-500")}>
        {isAdd ? "+" : isDel ? "−" : " "}
      </span>
      <span className={cn("min-w-0 flex-1 whitespace-pre-wrap break-words", isDel && "text-rose-600/80")}>
        {highlightVars(row.text)}
      </span>
    </div>
  );
}

function DiffBlock({ title, rows }: { title: string; rows: DiffRow[] }) {
  const changes = rows.filter((r) => r.type !== "ctx").length;
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span className="text-xs font-medium">{title}</span>
        {changes > 0 ? (
          <Badge variant="secondary" className="text-[10px]">{changes} изм.</Badge>
        ) : (
          <span className="text-[10px] text-muted-foreground">без изменений</span>
        )}
      </div>
      {changes > 0 ? (
        <div className="rounded-lg border overflow-hidden">
          {rows.map((row, i) => (
            <DiffLine key={i} row={row} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
          Содержимое идентично
        </div>
      )}
    </div>
  );
}

function ConfigDiff({ from, to }: { from: ModelConfig; to: ModelConfig }) {
  const fields: { key: keyof ModelConfig; label: string }[] = [
    { key: "temperature", label: "temperature" },
    { key: "top_p", label: "top_p" },
    { key: "max_tokens", label: "max_tokens" },
  ];
  const stopChanged = JSON.stringify(from.stop) !== JSON.stringify(to.stop);

  return (
    <div className="space-y-1.5">
      {fields.map(({ key, label }) => {
        const fromVal = from[key] as number;
        const toVal = to[key] as number;
        const changed = fromVal !== toVal;
        return (
          <div key={key} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs">
            <span className="w-28 font-mono text-muted-foreground">{label}</span>
            <span className={cn("font-mono", changed && "text-rose-500")}>{fromVal}</span>
            {changed && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            <span className={cn("font-mono", changed && "text-emerald-500")}>{toVal}</span>
            {!changed && <span className="ml-auto text-[10px] text-muted-foreground">без изменений</span>}
          </div>
        );
      })}
      {stopChanged && (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs">
          <span className="w-28 font-mono text-muted-foreground">stop</span>
          <span className="font-mono text-rose-500">{JSON.stringify(from.stop)}</span>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-emerald-500">{JSON.stringify(to.stop)}</span>
        </div>
      )}
    </div>
  );
}

function VariablesDiff({ from, to }: { from: PromptVariable[]; to: PromptVariable[] }) {
  const fromMap = new Map(from.map((v) => [v.name, v]));
  const toMap = new Map(to.map((v) => [v.name, v]));
  const allNames = new Set([...fromMap.keys(), ...toMap.keys()]);

  const rows: { name: string; status: "added" | "removed" | "changed" | "same"; from?: PromptVariable; to?: PromptVariable }[] = [];
  for (const name of allNames) {
    const f = fromMap.get(name);
    const t = toMap.get(name);
    if (f && !t) rows.push({ name, status: "removed", from: f });
    else if (!f && t) rows.push({ name, status: "added", to: t });
    else if (f && t && (f.type !== t.type || f.required !== t.required || JSON.stringify(f.default) !== JSON.stringify(t.default))) {
      rows.push({ name, status: "changed", from: f, to: t });
    } else if (f && t) {
      rows.push({ name, status: "same", from: f, to: t });
    }
  }

  const hasChanges = rows.some((r) => r.status !== "same");

  if (!hasChanges) {
    return <div className="rounded-lg border border-dashed px-3 py-2 text-[11px] text-muted-foreground">Переменные идентичны</div>;
  }

  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div
          key={r.name}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs",
            r.status === "added" && "border-emerald-500/20 bg-emerald-500/5",
            r.status === "removed" && "border-rose-500/20 bg-rose-500/5",
            r.status === "changed" && "border-amber-500/20 bg-amber-500/5",
          )}
        >
          <span className="font-mono text-primary">{`{{${r.name}}}`}</span>
          <Badge variant="secondary" className="text-[10px]">
            {r.status === "added" && "добавлена"}
            {r.status === "removed" && "удалена"}
            {r.status === "changed" && "изменена"}
            {r.status === "same" && "без изменений"}
          </Badge>
          {r.from && r.to && r.status === "changed" && (
            <span className="text-[10px] text-muted-foreground">
              {r.from.type}{r.from.required ? "*" : ""} → {r.to.type}{r.to.required ? "*" : ""}
            </span>
          )}
          {r.to && r.status === "added" && (
            <span className="text-[10px] text-muted-foreground">{r.to.type}{r.to.required ? "*" : ""}</span>
          )}
          {r.from && r.status === "removed" && (
            <span className="text-[10px] text-muted-foreground">{r.from.type}{r.from.required ? "*" : ""}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function DiffViewer({
  open,
  onOpenChange,
  versions,
  fromId,
  toId,
  onFromChange,
  onToChange,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  versions: DiffVersion[];
  fromId: string;
  toId: string;
  onFromChange: (id: string) => void;
  onToChange: (id: string) => void;
  onApply: (version: DiffVersion) => void;
}) {
  const [tab, setTab] = React.useState<"system" | "user" | "config" | "vars">("system");

  const from = versions.find((v) => v.id === fromId);
  const to = versions.find((v) => v.id === toId);

  React.useEffect(() => {
    if (open) setTab("system");
  }, [open]);

  if (!from || !to) return null;

  const systemDiff = lineDiff(from.content.system ?? "", to.content.system ?? "");
  const userDiff = lineDiff(from.content.user ?? "", to.content.user ?? "");
  const systemChanges = systemDiff.filter((r) => r.type !== "ctx").length;
  const userChanges = userDiff.filter((r) => r.type !== "ctx").length;
  const configChanged = JSON.stringify(from.modelConfig) !== JSON.stringify(to.modelConfig);
  const varsChanged = JSON.stringify(from.variables) !== JSON.stringify(to.variables);

  const tabs: { key: typeof tab; label: string; count?: number }[] = [
    { key: "system", label: "System", count: systemChanges },
    { key: "user", label: "User", count: userChanges },
    { key: "config", label: "Config", count: configChanged ? 1 : 0 },
    { key: "vars", label: "Переменные", count: varsChanged ? 1 : 0 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDiff className="h-4 w-4 text-primary" />
            Сравнение версий
          </DialogTitle>
        </DialogHeader>

        {/* Version selectors */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] text-muted-foreground">От (было)</label>
            <Select value={fromId} onValueChange={onFromChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.semver} · {v.branch} · {shortHash(v.versionHash)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ArrowRight className="mt-4 h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <label className="mb-1 block text-[10px] text-muted-foreground">До (стало)</label>
            <Select value={toId} onValueChange={onToChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.semver} · {v.branch} · {shortHash(v.versionHash)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t.key ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="rounded bg-primary/10 px-1 text-[10px]">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Diff content */}
        <div className="flex-1 overflow-y-auto py-3">
          {tab === "system" && <DiffBlock title="Системное сообщение" rows={systemDiff} />}
          {tab === "user" && <DiffBlock title="Пользовательский шаблон" rows={userDiff} />}
          {tab === "config" && (
            <div>
              <div className="mb-2 text-xs font-medium">Конфигурация модели</div>
              <ConfigDiff from={from.modelConfig} to={to.modelConfig} />
              {from.model?.displayName !== to.model?.displayName && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs">
                  <span className="w-28 font-mono text-muted-foreground">model</span>
                  <span className="font-mono text-rose-500">{from.model?.displayName ?? "по умолчанию"}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-emerald-500">{to.model?.displayName ?? "по умолчанию"}</span>
                </div>
              )}
            </div>
          )}
          {tab === "vars" && (
            <div>
              <div className="mb-2 text-xs font-medium">Переменные</div>
              <VariablesDiff from={from.variables} to={to.variables} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Закрыть</Button>
          <Button onClick={() => { onApply(to); onOpenChange(false); }}>
            <Check className="mr-1.5 h-4 w-4" /> Применить версию {to.semver}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
