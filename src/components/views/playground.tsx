"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  Sparkles,
  Loader2,
  Zap,
  Coins,
  Clock,
  GitCompare,
  Plus,
  X,
  Gavel,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNav } from "@/lib/nav-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RunResult {
  output: string;
  latencyMs: number;
  usage: { tokensIn: number; tokensOut: number; total: number };
  rendered?: { system: string; user: string };
  error?: string;
}
interface EvalResult {
  score: number;
  reason: string;
}

export function PlaygroundView() {
  const { promptId, versionId, navigate } = useNav();

  const { data: promptsData } = useQuery({
    queryKey: ["prompts"],
    queryFn: () => fetch("/api/prompts").then((r) => r.json()),
  });
  const prompts = promptsData?.prompts ?? [];

  const [selectedPromptId, setSelectedPromptId] = React.useState<string | null>(promptId ?? null);
  React.useEffect(() => {
    if (!selectedPromptId && prompts.length) setSelectedPromptId(prompts[0].id);
  }, [prompts, selectedPromptId]);

  // versions of selected prompt
  const { data: versionsData } = useQuery({
    queryKey: ["versions", selectedPromptId],
    queryFn: () => fetch(`/api/prompts/${selectedPromptId}/versions`).then((r) => r.json()),
    enabled: !!selectedPromptId,
  });
  const versions = versionsData?.versions ?? [];

  // compare columns: array of versionIds (start with the nav versionId or first)
  const [columns, setColumns] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (versions.length && columns.length === 0) {
      const initial = versionId && versions.find((v: any) => v.id === versionId)
        ? versionId
        : versions[0].id;
      setColumns([initial]);
    }
  }, [versions, versionId, columns.length]);

  const activeVersions = versions.filter((v: any) => columns.includes(v.id));
  const variables = (activeVersions[0] as any)?.variables ?? [];

  const [inputs, setInputs] = React.useState<Record<string, string>>({});
  const [results, setResults] = React.useState<Record<string, RunResult | undefined>>({});
  const [running, setRunning] = React.useState<Record<string, boolean>>({});
  const [evals, setEvals] = React.useState<Record<string, EvalResult | undefined>>({});

  const run = async (versionId: string) => {
    setRunning((r) => ({ ...r, [versionId]: true }));
    setResults((r) => ({ ...r, [versionId]: undefined }));
    try {
      const res = await fetch("/api/playground/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, inputs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "run failed");
      setResults((r) => ({ ...r, [versionId]: data }));
    } catch (e: any) {
      setResults((r) => ({ ...r, [versionId]: { output: "", latencyMs: 0, usage: { tokensIn: 0, tokensOut: 0, total: 0 }, error: e.message } }));
      toast.error(e.message);
    } finally {
      setRunning((r) => ({ ...r, [versionId]: false }));
    }
  };

  const runAll = () => {
    for (const v of activeVersions) run(v.id);
  };

  const evaluate = async (versionId: string) => {
    const r = results[versionId];
    if (!r?.output) return;
    try {
      const res = await fetch("/api/playground/eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: inputs.resume ?? inputs.message ?? inputs.diff ?? r.rendered?.user ?? "",
          output: r.output,
          scale: "pass_fail",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "eval failed");
      setEvals((e) => ({ ...e, [versionId]: data }));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!prompts.length) {
    return <div className="text-sm text-muted-foreground">Loading playground…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Playground</h2>
          <p className="text-sm text-muted-foreground">
            Test versions with live LLM calls. Compare side-by-side. Runs are not counted in production metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPromptId ?? undefined} onValueChange={(v) => { setSelectedPromptId(v); setColumns([]); setResults({}); setEvals({}); }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select prompt" /></SelectTrigger>
            <SelectContent>
              {prompts.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={runAll} disabled={activeVersions.length === 0}>
            <Play className="mr-1.5 h-4 w-4" /> Run all
          </Button>
        </div>
      </div>

      {/* Variable inputs */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Variables
          </Label>
          <span className="text-[11px] text-muted-foreground">{variables.length} declared</span>
        </div>
        {variables.length === 0 ? (
          <p className="text-xs text-muted-foreground">This version has no declared variables.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {variables.map((v: any) => (
              <div key={v.name} className="space-y-1">
                <Label className="flex items-center gap-1.5 text-xs">
                  <span className="font-mono text-primary">{`{{${v.name}}}`}</span>
                  {v.required && <span className="text-rose-500">*</span>}
                  <span className="text-muted-foreground">{v.type}</span>
                </Label>
                {v.type === "object" ? (
                  <Textarea
                    rows={2}
                    placeholder={v.default ? JSON.stringify(v.default) : `["item1", "item2"]`}
                    value={inputs[v.name] ?? ""}
                    onChange={(e) => setInputs({ ...inputs, [v.name]: e.target.value })}
                    className="font-mono text-xs"
                  />
                ) : (
                  <Textarea
                    rows={v.name === "resume" || v.name === "diff" || v.name === "message" ? 4 : 2}
                    placeholder={v.description ?? v.name}
                    value={inputs[v.name] ?? ""}
                    onChange={(e) => setInputs({ ...inputs, [v.name]: e.target.value })}
                  />
                )}
              </div>
            ))}
            {/* quick fill */}
            <div className="sm:col-span-2 flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => fillSample(inputs, setInputs, variables)}>
                Fill sample data
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Compare columns selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Comparing:</span>
        {columns.map((c) => {
          const v = versions.find((x: any) => x.id === c);
          return (
            <span key={c} className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs">
              <span className="font-mono">{v?.semver}</span>
              <span className="text-muted-foreground">· {v?.branch}</span>
              {columns.length > 1 && (
                <button onClick={() => { setColumns(columns.filter((x) => x !== c)); setResults((r) => ({ ...r, [c]: undefined })); }}>
                  <X className="h-3 w-3 text-muted-foreground hover:text-rose-500" />
                </button>
              )}
            </span>
          );
        })}
        <Select
          value=""
          onValueChange={(v) => { if (!columns.includes(v)) { setColumns([...columns, v]); } }}
        >
          <SelectTrigger className="h-7 w-[140px] text-xs"><Plus className="mr-1 h-3 w-3" /> add version</SelectTrigger>
          <SelectContent>
            {versions.filter((v: any) => !columns.includes(v.id)).map((v: any) => (
              <SelectItem key={v.id} value={v.id}>{v.semver} · {v.branch}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Output columns */}
      <div className={cn("grid gap-4", columns.length > 1 ? "lg:grid-cols-2" : "grid-cols-1")}>
        {activeVersions.map((v: any) => {
          const r = results[v.id];
          const ev = evals[v.id];
          const isRunning = running[v.id];
          return (
            <Card key={v.id} className="flex flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-primary" />
                  <span className="font-mono text-sm font-semibold">{v.semver}</span>
                  <span className="text-xs text-muted-foreground">{v.branch}</span>
                </div>
                <Button size="sm" variant="outline" className="h-7" onClick={() => run(v.id)} disabled={isRunning}>
                  {isRunning ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1 h-3.5 w-3.5" />}
                  Run
                </Button>
              </div>

              <div className="flex-1 p-4">
                {r?.error ? (
                  <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-600 dark:text-rose-400">
                    {r.error}
                  </div>
                ) : r ? (
                  <pre className="max-h-[340px] min-h-[180px] overflow-y-auto scroll-thin whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-[11px] leading-relaxed">
                    {r.output}
                  </pre>
                ) : (
                  <div className="flex min-h-[180px] items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                    {isRunning ? "Calling LLM…" : "Run to see output"}
                  </div>
                )}
              </div>

              {r && !r.error && (
                <div className="border-t px-4 py-2.5">
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.latencyMs}ms</span>
                    <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {r.usage.tokensIn + r.usage.tokensOut} tok</span>
                    <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> ~${((r.usage.tokensIn * 0.000001 + r.usage.tokensOut * 0.000002)).toFixed(4)}</span>
                    <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={() => evaluate(v.id)}>
                      <Gavel className="mr-1 h-3 w-3" /> LLM-as-judge
                    </Button>
                  </div>
                  {ev && (
                    <div className={cn(
                      "mt-2 flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs",
                      ev.score >= 1 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    )}>
                      <span className="font-semibold">{ev.score >= 1 ? "PASS" : "FAIL"}</span>
                      <span className="text-muted-foreground">·</span>
                      <span>{ev.reason}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function fillSample(
  inputs: Record<string, string>,
  setInputs: (v: Record<string, string>) => void,
  variables: any[]
) {
  const sample: Record<string, string> = { ...inputs };
  const samples: Record<string, string> = {
    candidate_name: "Ivan Petrov",
    job_title: "ML Engineer",
    resume:
      "Ivan Petrov — ML Engineer\n5 yrs exp. Built recommendation system scaling to 20M users at Yandex. Led migration to vector search, cut p95 latency 40%. MSc CS, MIPT. Python, PyTorch, Kubernetes.",
    requirements: '["5+ years ML engineering", "Production recommendation systems", "Vector search / embeddings", "Python, PyTorch"]',
    message: "Hi, my billing failed after I upgraded to the Growth plan. Can you retry the charge? I need access restored ASAP.",
    diff: "+def get_user(id):\n+    return db.query(f\"SELECT * FROM users WHERE id = {id}\")",
    prospect_name: "Sarah Lin",
    company: "Vercel",
    context: "Just raised Series C, scaling developer tools",
    value_prop: "PromptVault cuts LLM regression incidents by 80%",
  };
  for (const v of variables) {
    if (samples[v.name]) sample[v.name] = samples[v.name];
  }
  setInputs(sample);
  toast.success("Sample data filled");
}
