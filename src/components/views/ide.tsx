"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Play,
  Save,
  Plus,
  Search,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Square,
  FlaskConical,
  Gavel,
  AlertTriangle,
  FileText,
  Cpu,
  Zap,
  Coins,
  GitCommitHorizontal,
  FileDiff,
  GitCompare,
  GitBranch,
  Rocket,
  Sparkles,
  Clock,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNav } from "@/lib/nav-store";
import { cn } from "@/lib/utils";
import { extractVariables, type PromptContent, type PromptVariable, type ModelConfig } from "@/lib/prompt";
import { streamRun, type RunResult } from "@/lib/stream-client";
import { VersionPanel, type VersionItem } from "@/components/ide/version-panel";
import { DiffViewer, type DiffVersion } from "@/components/ide/diff-viewer";
import { BranchSelector } from "@/components/ide/branch-selector";
import { ModelCompareDialog } from "@/components/ide/model-compare";
import { BatchEvalDialog } from "@/components/ide/batch-eval";
import { OptimizeDialog } from "@/components/ide/optimize-panel";
import { ExperimentLauncher } from "@/components/ide/experiment-launcher";
import { ExperimentResults } from "@/components/ide/experiment-results";

const DEFAULT_CONFIG: ModelConfig = { temperature: 0.3, top_p: 0.9, max_tokens: 1200 };

interface TestCase {
  id: string;
  name: string;
  inputs: Record<string, unknown>;
}

export function IdeView() {
  const { navigate, promptId: selectedPromptId, versionId: selectedVersionId, setContext } = useNav();
  const qc = useQueryClient();

  // --- queries ---
  const { data: promptsData } = useQuery({
    queryKey: ["prompts"],
    queryFn: () => fetch("/api/prompts").then((r) => r.json()),
  });
  const prompts: any[] = promptsData?.prompts ?? [];

  const { data: modelsData } = useQuery({
    queryKey: ["models"],
    queryFn: () => fetch("/api/models").then((r) => r.json()),
  });
  const models: any[] = modelsData?.models ?? [];

  const { data: providersData } = useQuery({
    queryKey: ["providers"],
    queryFn: () => fetch("/api/providers").then((r) => r.json()),
  });
  const hasActiveProvider = (providersData?.providers ?? []).some((p: any) => p.isActive);

  // --- selection: promptId/versionId live in nav-store so every view stays in sync ---
  const [libraryOpen, setLibraryOpen] = React.useState(true);
  const [search, setSearch] = React.useState("");

  // --- editor state ---
  const [content, setContent] = React.useState<PromptContent>({ system: "", user: "" });
  const [declaredVars, setDeclaredVars] = React.useState<PromptVariable[]>([]);
  const [modelConfig, setModelConfig] = React.useState<ModelConfig>(DEFAULT_CONFIG);
  const [modelId, setModelId] = React.useState<string>("");
  const [commitMsg, setCommitMsg] = React.useState("");
  const [showConfig, setShowConfig] = React.useState(false);
  const [selectedBranch, setSelectedBranch] = React.useState("main");

  // --- inputs & test cases ---
  const [inputs, setInputs] = React.useState<Record<string, string>>({});
  const [testCases, setTestCases] = React.useState<TestCase[]>([]);
  const [activeTcId, setActiveTcId] = React.useState<string | null>(null);

  // --- right panel tabs ---
  const [rightTab, setRightTab] = React.useState<"output" | "versions" | "experiments">("output");

  // --- diff viewer ---
  const [diffOpen, setDiffOpen] = React.useState(false);
  const [diffFromId, setDiffFromId] = React.useState<string>("");
  const [diffToId, setDiffToId] = React.useState<string>("");

  // --- model compare ---
  const [compareOpen, setCompareOpen] = React.useState(false);

  // --- batch eval ---
  const [batchEvalOpen, setBatchEvalOpen] = React.useState(false);

  // --- optimize ---
  const [optimizeOpen, setOptimizeOpen] = React.useState(false);

  // --- experiment launcher ---
  const [expLaunchOpen, setExpLaunchOpen] = React.useState(false);

  // --- results ---
  const [results, setResults] = React.useState<Record<string, RunResult>>({});
  const abortRefs = React.useRef<Record<string, AbortController>>({});

  // --- new prompt dialog ---
  const [newPromptOpen, setNewPromptOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [newDesc, setNewDesc] = React.useState("");

  // auto-extracted variables from template
  const templateVars = React.useMemo(() => {
    return extractVariables(`${content.system}\n${content.user}`);
  }, [content]);
  const allVarNames = React.useMemo(() => {
    const set = new Set<string>(templateVars);
    declaredVars.forEach((v) => set.add(v.name));
    return [...set];
  }, [templateVars, declaredVars]);

  // --- load prompt on selection ---
  const { data: versionsData } = useQuery({
    queryKey: ["versions", selectedPromptId],
    queryFn: () => fetch(`/api/prompts/${selectedPromptId}/versions`).then((r) => r.json()),
    enabled: !!selectedPromptId,
  });

  const { data: tcData } = useQuery({
    queryKey: ["test-cases", selectedPromptId],
    queryFn: () => fetch(`/api/prompts/${selectedPromptId}/test-cases`).then((r) => r.json()),
    enabled: !!selectedPromptId,
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches", selectedPromptId],
    queryFn: () => fetch(`/api/prompts/${selectedPromptId}/branches`).then((r) => r.json()),
    enabled: !!selectedPromptId,
  });
  const branchNames: string[] = React.useMemo(() => {
    const fromBranches = (branchesData?.branches ?? []).map((b: any) => b.name);
    const fromVersions = (versionsData?.versions ?? []).map((v: any) => v.branch);
    return [...new Set([...fromBranches, ...fromVersions])];
  }, [branchesData, versionsData]);

  const createBranchMut = useMutation({
    mutationFn: (name: string) =>
      fetch(`/api/prompts/${selectedPromptId}/branches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Ветка создана");
      qc.invalidateQueries({ queryKey: ["branches", selectedPromptId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Не удалось создать ветку"),
  });

  React.useEffect(() => {
    if (tcData?.testCases) setTestCases(tcData.testCases);
  }, [tcData]);

  React.useEffect(() => {
    const versions = versionsData?.versions ?? [];
    if (versions.length === 0) return;
    const existing = selectedVersionId ? versions.find((v: any) => v.id === selectedVersionId) : null;
    const target = existing ?? versions[versions.length - 1];
    if (!existing) setContext({ versionId: target.id });
    setContent(target.content ?? { system: "", user: "" });
    setDeclaredVars(target.variables ?? []);
    setModelConfig(target.modelConfig ?? DEFAULT_CONFIG);
    setModelId(target.model?.id ?? "");
    setSelectedBranch(target.branch ?? "main");
    setInputs({});
    setResults({});
    setActiveTcId(null);
  }, [versionsData]);

  // --- load a specific version into the editor ---
  const selectVersion = (v: VersionItem) => {
    setContext({ versionId: v.id });
    const full = (versionsData?.versions ?? []).find((x: any) => x.id === v.id);
    if (full) {
      setContent(full.content ?? { system: "", user: "" });
      setDeclaredVars(full.variables ?? []);
      setModelConfig(full.modelConfig ?? DEFAULT_CONFIG);
      setModelId(full.model?.id ?? "");
      setSelectedBranch(full.branch ?? "main");
      setInputs({});
      setResults({});
    }
  };

  // --- diff viewer ---
  const diffVersions: DiffVersion[] = React.useMemo(
    () =>
      (versionsData?.versions ?? []).map((v: any) => ({
        id: v.id,
        semver: v.semver,
        branch: v.branch,
        content: v.content,
        variables: v.variables,
        modelConfig: v.modelConfig,
        model: v.model,
        versionHash: v.versionHash,
      })),
    [versionsData]
  );

  const openDiff = (toVer: VersionItem) => {
    const versions = versionsData?.versions ?? [];
    const toIdx = versions.findIndex((v: any) => v.id === toVer.id);
    const fromVer = toIdx > 0 ? versions[toIdx - 1] : versions[0];
    setDiffFromId(fromVer?.id ?? toVer.id);
    setDiffToId(toVer.id);
    setDiffOpen(true);
  };

  const openDiffToolbar = () => {
    const versions = versionsData?.versions ?? [];
    if (versions.length < 2) return;
    const curIdx = versions.findIndex((v: any) => v.id === selectedVersionId);
    const to = versions[curIdx] ?? versions[versions.length - 1];
    const from = versions[Math.max(0, (curIdx ?? versions.length - 1) - 1)];
    setDiffFromId(from.id);
    setDiffToId(to.id);
    setDiffOpen(true);
  };

  const applyDiffVersion = (v: DiffVersion) => {
    setContext({ versionId: v.id });
    setContent(v.content);
    setDeclaredVars(v.variables);
    setModelConfig(v.modelConfig);
    setModelId(v.model?.id ?? "");
    setInputs({});
    setResults({});
    toast.info(`Загружена версия ${v.semver}`);
  };

  // --- draft auto-save ---
  React.useEffect(() => {
    if (!selectedPromptId) return;
    const key = `ide-draft-${selectedPromptId}`;
    const draft = localStorage.getItem(key);
    if (draft) {
      try {
        const d = JSON.parse(draft);
        if (d.content) setContent(d.content);
        if (d.modelConfig) setModelConfig(d.modelConfig);
        if (d.modelId !== undefined) setModelId(d.modelId);
      } catch {
        /* ignore */
      }
    }
  }, [selectedPromptId]);

  React.useEffect(() => {
    if (!selectedPromptId) return;
    const key = `ide-draft-${selectedPromptId}`;
    const timer = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify({ content, modelConfig, modelId }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [selectedPromptId, content, modelConfig, modelId]);

  // --- run ---
  const run = React.useCallback(
    async (key: string, runInputs: Record<string, unknown>) => {
      abortRefs.current[key]?.abort();
      const ac = new AbortController();
      abortRefs.current[key] = ac;
      const started = Date.now();
      setResults((prev) => ({ ...prev, [key]: { output: "", streaming: true } }));

      await streamRun(
        {
          versionId: selectedVersionId ?? undefined,
          content,
          variables: declaredVars,
          modelConfig,
          inputs: runInputs,
          modelId: modelId || undefined,
        },
        {
          onToken: (t) =>
            setResults((prev) => ({
              ...prev,
              [key]: { ...prev[key], output: (prev[key]?.output ?? "") + t, streaming: true },
            })),
          onDone: (usage, model) =>
            setResults((prev) => ({
              ...prev,
              [key]: { ...prev[key], streaming: false, usage, model, latencyMs: Date.now() - started },
            })),
          onError: (e) =>
            setResults((prev) => ({ ...prev, [key]: { ...prev[key], streaming: false, error: e } })),
        },
        ac.signal
      );
    },
    [selectedVersionId, content, declaredVars, modelConfig, modelId]
  );

  const runActive = () => run(activeTcId ?? "custom", inputs);
  const runAll = async () => {
    if (testCases.length === 0) {
      run("custom", inputs);
      return;
    }
    await Promise.all(testCases.map((tc) => run(tc.id, tc.inputs)));
  };

  const stopAll = () => {
    Object.values(abortRefs.current).forEach((ac) => ac.abort());
    setResults((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) if (next[k].streaming) next[k] = { ...next[k], streaming: false };
      return next;
    });
  };

  // --- save version ---
  const saveMut = useMutation({
    mutationFn: (body: any) =>
      fetch(`/api/prompts/${selectedPromptId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.reused) toast.info("Идентичное содержимое — версия уже существует");
      else toast.success(`Версия ${data.version?.semver} сохранена`);
      qc.invalidateQueries({ queryKey: ["versions", selectedPromptId] });
      qc.invalidateQueries({ queryKey: ["prompts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Не удалось сохранить"),
  });

  const saveVersion = () => {
    if (!selectedPromptId) return;
    saveMut.mutate({
      content,
      variables: declaredVars,
      modelConfig,
      modelId: modelId || undefined,
      branch: selectedBranch,
      commitMessage: commitMsg || `Iteration ${new Date().toLocaleString("ru-RU")}`,
      semverKind: "patch",
    });
    setCommitMsg("");
  };

  // --- save test case ---
  const saveTcMut = useMutation({
    mutationFn: (body: any) =>
      fetch(`/api/prompts/${selectedPromptId}/test-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Тест-кейс сохранён");
      qc.invalidateQueries({ queryKey: ["test-cases", selectedPromptId] });
    },
  });

  const saveTestCase = () => {
    const name = prompt("Название тест-кейса:");
    if (!name) return;
    saveTcMut.mutate({ name, inputs });
  };

  const loadTestCase = (tc: TestCase) => {
    setActiveTcId(tc.id);
    const parsed: Record<string, string> = {};
    for (const [k, v] of Object.entries(tc.inputs)) {
      parsed[k] = typeof v === "string" ? v : JSON.stringify(v);
    }
    setInputs(parsed);
  };

  // --- new prompt ---
  const newPromptMut = useMutation({
    mutationFn: (body: any) =>
      fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      toast.success("Промпт создан");
      qc.invalidateQueries({ queryKey: ["prompts"] });
      setContext({ promptId: data.prompt.id, versionId: null });
      setContent({ system: "", user: "" });
      setDeclaredVars([]);
      setModelConfig(DEFAULT_CONFIG);
      setInputs({});
      setResults({});
      setNewPromptOpen(false);
      setNewName("");
      setNewDesc("");
    },
  });

  // --- keyboard shortcut ---
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        runActive();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [runActive]);

  const filteredPrompts = prompts.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const selectedPrompt = prompts.find((p: any) => p.id === selectedPromptId);
  const isRunning = Object.values(results).some((r) => r.streaming);
  const resultKeys = Object.keys(results);

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)]">
      {/* Onboarding banner */}
      {!hasActiveProvider && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>Провайдер не настроен — LLM-вызовы не будут работать.</span>
          <Button variant="outline" size="sm" className="ml-auto h-7" onClick={() => navigate("settings")}>
            Настроить
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLibraryOpen((v) => !v)}>
          {libraryOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        <div className="font-mono text-sm font-semibold text-primary">
          {selectedPrompt?.name ?? "Выберите промпт"}
        </div>
        {selectedPrompt?.defaultModel && (
          <Badge variant="secondary" className="text-[10px]">{selectedPrompt.defaultModel.displayName}</Badge>
        )}
        {selectedPromptId && (
          <BranchSelector
            branches={branchNames}
            selectedBranch={selectedBranch}
            onSelect={setSelectedBranch}
            onCreate={(name) => { createBranchMut.mutate(name); setSelectedBranch(name); }}
          />
        )}

        {selectedPromptId && (
          <div className="flex items-center gap-0.5 rounded-md border border-primary/10 bg-primary/5 px-1 py-0.5">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Граф версий" onClick={() => navigate("history", { promptId: selectedPromptId })}>
              <GitBranch className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Песочница" onClick={() => navigate("playground", { promptId: selectedPromptId, versionId: selectedVersionId })}>
              <Play className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Карта развёртывания" onClick={() => navigate("deployment") }>
              <Rocket className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Select value={modelId || "__auto__"} onValueChange={(v) => setModelId(v === "__auto__" ? "" : v)}>
            <SelectTrigger className="h-8 w-[180px]">
              <SelectValue placeholder="Модель" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__auto__">По умолчанию</SelectItem>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isRunning ? (
            <Button size="sm" variant="destructive" onClick={stopAll}>
              <Square className="mr-1.5 h-4 w-4" /> Стоп
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={runAll} disabled={!selectedPromptId}>
                <Play className="mr-1.5 h-4 w-4" /> Все
              </Button>
              <Button size="sm" onClick={runActive} disabled={!selectedPromptId}>
                <Play className="mr-1.5 h-4 w-4" /> Запуск
                <kbd className="ml-1.5 rounded bg-primary/20 px-1 text-[10px]">⌘↵</kbd>
              </Button>
            </>
          )}

          <Input
            className="h-8 w-[160px]"
            placeholder="Коммит..."
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
          />
          <Button size="sm" variant="outline" onClick={saveVersion} disabled={!selectedPromptId}>
            <Save className="mr-1.5 h-4 w-4" /> Версия
          </Button>
          <Button size="sm" variant="outline" onClick={openDiffToolbar} disabled={!selectedPromptId || (versionsData?.versions?.length ?? 0) < 2}>
            <FileDiff className="mr-1.5 h-4 w-4" /> Сравнить
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCompareOpen(true)} disabled={!selectedPromptId || models.filter((m: any) => m.provider?.isActive).length < 2}>
            <GitCompare className="mr-1.5 h-4 w-4" /> Модели
          </Button>
          <Button size="sm" variant="outline" onClick={() => setBatchEvalOpen(true)} disabled={!selectedPromptId || testCases.length === 0}>
            <FlaskConical className="mr-1.5 h-4 w-4" /> Батч
          </Button>
          <Button size="sm" variant="outline" onClick={() => setExpLaunchOpen(true)} disabled={!selectedPromptId || (versionsData?.versions?.length ?? 0) < 2}>
            <FlaskConical className="mr-1.5 h-4 w-4" /> A/B
          </Button>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 gap-3 overflow-hidden">
        {/* Library sidebar */}
        {libraryOpen && (
          <div className="flex w-[200px] shrink-0 flex-col rounded-lg border border-primary/10 bg-card">
            <div className="border-b p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-8 pl-7 text-xs"
                  placeholder="Поиск..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5">
              <button
                className="mb-1 flex w-full items-center gap-1.5 rounded-md border border-dashed border-primary/20 px-2.5 py-1.5 text-xs text-primary hover:bg-primary/5"
                onClick={() => setNewPromptOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Новый промпт
              </button>
              {filteredPrompts.map((p: any) => (
                <button
                  key={p.id}
                  className={cn(
                    "mb-0.5 flex w-full items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                    selectedPromptId === p.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                  onClick={() => setContext({ promptId: p.id, versionId: null })}
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="flex flex-1 flex-col overflow-y-auto rounded-lg border border-primary/10 bg-card p-4">
          {!selectedPromptId ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <FileText className="mb-2 h-10 w-10 opacity-40" />
              <p className="text-sm">Выберите промпт из списка слева или создайте новый</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* System */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 text-xs font-medium">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">SYSTEM</span>
                    Системное сообщение
                  </Label>
                  <Button variant="ghost" size="sm" className="h-6 text-[11px] text-primary" onClick={() => setOptimizeOpen(true)} disabled={!content.system && !content.user}>
                    <Sparkles className="mr-1 h-3 w-3" /> Улучшить
                  </Button>
                </div>
                <Textarea
                  className="min-h-[120px] resize-y font-mono text-xs leading-relaxed"
                  placeholder="You are an expert HR recruiter..."
                  value={content.system}
                  onChange={(e) => setContent({ ...content, system: e.target.value })}
                />
              </div>

              {/* User */}
              <div>
                <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">USER</span>
                  Шаблон пользовательского сообщения
                </Label>
                <Textarea
                  className="min-h-[160px] resize-y font-mono text-xs leading-relaxed"
                  placeholder="Screen this resume:\n{{resume}}\n\nPosition: {{position}}"
                  value={content.user}
                  onChange={(e) => setContent({ ...content, user: e.target.value })}
                />
              </div>

              {/* Variables */}
              {allVarNames.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <Label className="flex items-center gap-1.5 text-xs font-medium">
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">VARS</span>
                      Переменные ({allVarNames.length})
                    </Label>
                    <Button variant="ghost" size="sm" className="h-6 text-[11px]" onClick={saveTestCase}>
                      <Plus className="mr-1 h-3 w-3" /> Сохранить как тест-кейс
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {allVarNames.map((name) => (
                      <div key={name} className="flex items-start gap-2">
                        <span className="mt-1.5 w-28 shrink-0 font-mono text-[11px] text-primary">{`{{${name}}}`}</span>
                        <Textarea
                          className="min-h-[60px] resize-y text-xs"
                          placeholder={`Значение для ${name}...`}
                          value={inputs[name] ?? ""}
                          onChange={(e) => setInputs({ ...inputs, [name]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test cases */}
              {testCases.length > 0 && (
                <div>
                  <Label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
                    <FlaskConical className="h-3 w-3" /> Тест-кейсы
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {testCases.map((tc) => (
                      <button
                        key={tc.id}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                          activeTcId === tc.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted/50"
                        )}
                        onClick={() => loadTestCase(tc)}
                      >
                        {tc.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Config */}
              <div>
                <button
                  className="flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfig((v) => !v)}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Конфигурация модели
                  {showConfig ? <ChevronLeft className="ml-auto h-3 w-3 rotate-90" /> : <ChevronRight className="ml-auto h-3 w-3 rotate-90" />}
                </button>
                {showConfig && (
                  <div className="mt-2 space-y-3 rounded-lg border bg-muted/30 p-3">
                    <div>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span>temperature</span>
                        <span className="font-mono text-muted-foreground">{modelConfig.temperature}</span>
                      </div>
                      <Slider value={[modelConfig.temperature]} min={0} max={2} step={0.05}
                        onValueChange={([v]) => setModelConfig({ ...modelConfig, temperature: v })} />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span>top_p</span>
                        <span className="font-mono text-muted-foreground">{modelConfig.top_p}</span>
                      </div>
                      <Slider value={[modelConfig.top_p]} min={0} max={1} step={0.05}
                        onValueChange={([v]) => setModelConfig({ ...modelConfig, top_p: v })} />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-[11px]">
                        <span>max_tokens</span>
                        <span className="font-mono text-muted-foreground">{modelConfig.max_tokens}</span>
                      </div>
                      <Slider value={[modelConfig.max_tokens]} min={64} max={4096} step={64}
                        onValueChange={([v]) => setModelConfig({ ...modelConfig, max_tokens: v })} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Output / Versions panel */}
        <div className="flex w-[42%] shrink-0 flex-col overflow-hidden rounded-lg border border-primary/10 bg-card">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                rightTab === "output" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setRightTab("output")}
            >
              <Play className="h-3.5 w-3.5" /> Результат
              {resultKeys.length > 0 && (
                <span className="rounded bg-primary/10 px-1 text-[10px]">{resultKeys.length}</span>
              )}
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                rightTab === "versions" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setRightTab("versions")}
            >
              <GitCommitHorizontal className="h-3.5 w-3.5" /> Версии
              {(versionsData?.versions?.length ?? 0) > 0 && (
                <span className="rounded bg-primary/10 px-1 text-[10px]">{versionsData?.versions?.length}</span>
              )}
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                rightTab === "experiments" ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setRightTab("experiments")}
            >
              <FlaskConical className="h-3.5 w-3.5" /> A/B
            </button>
          </div>

          {/* Tab content */}
          {rightTab === "output" ? (
            <div className="flex-1 overflow-y-auto p-3">
              {resultKeys.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                  <Play className="mb-2 h-8 w-8 opacity-30" />
                  <p className="text-xs">Нажмите «Запуск» для выполнения промпта</p>
                  <p className="mt-1 text-[10px]">Ответ появится здесь в реальном времени</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {resultKeys.map((key) => {
                    const r = results[key];
                    const tcName = key === "custom" ? "Текущий ввод" : testCases.find((t) => t.id === key)?.name ?? key;
                    return (
                      <ResultCard key={key} name={tcName} result={r} inputs={key === "custom" ? inputs : testCases.find((t) => t.id === key)?.inputs ?? {}} />
                    );
                  })}
                </div>
              )}
            </div>
          ) : rightTab === "versions" ? (
            <VersionPanel
              versions={(versionsData?.versions ?? []).map((v: any) => ({
                id: v.id,
                versionHash: v.versionHash,
                semver: v.semver,
                branch: v.branch,
                commitMessage: v.commitMessage,
                status: v.status,
                createdAt: v.createdAt,
                author: v.author,
                model: v.model,
              }))}
              selectedVersionId={selectedVersionId}
              onSelectVersion={selectVersion}
              onCompare={openDiff}
            />
          ) : (
            <ExperimentResults promptId={selectedPromptId} />
          )}
        </div>
      </div>

      {/* New prompt dialog */}
      <Dialog open={newPromptOpen} onOpenChange={setNewPromptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новый промпт</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="np-name">Имя (kebab-case)</Label>
              <Input id="np-name" className="font-mono" placeholder="my-prompt" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="np-desc">Описание</Label>
              <Input id="np-desc" placeholder="Что делает этот промпт?" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPromptOpen(false)}>Отмена</Button>
            <Button disabled={!newName} onClick={() => newPromptMut.mutate({ name: newName, description: newDesc, tags: [], defaultModelId: models.find((m: any) => m.isDefault)?.id })}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diff viewer */}
      <DiffViewer
        open={diffOpen}
        onOpenChange={setDiffOpen}
        versions={diffVersions}
        fromId={diffFromId}
        toId={diffToId}
        onFromChange={setDiffFromId}
        onToChange={setDiffToId}
        onApply={applyDiffVersion}
      />

      {/* Model compare */}
      <ModelCompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        models={models}
        versionId={selectedVersionId}
        content={content}
        variables={declaredVars}
        modelConfig={modelConfig}
        inputs={inputs}
      />

      {/* Batch eval */}
      <BatchEvalDialog
        open={batchEvalOpen}
        onOpenChange={setBatchEvalOpen}
        promptId={selectedPromptId}
        testCases={testCases}
        versionId={selectedVersionId}
        content={content}
        variables={declaredVars}
        modelConfig={modelConfig}
        modelId={modelId}
      />

      {/* AI optimize */}
      <OptimizeDialog
        open={optimizeOpen}
        onOpenChange={setOptimizeOpen}
        content={content}
        variables={declaredVars}
        sampleOutput={results["custom"]?.output || Object.values(results)[0]?.output}
        onApply={(system, user) => setContent({ system, user })}
      />

      {/* Experiment launcher */}
      <ExperimentLauncher
        open={expLaunchOpen}
        onOpenChange={setExpLaunchOpen}
        promptId={selectedPromptId}
        versions={(versionsData?.versions ?? []).map((v: any) => ({
          id: v.id,
          semver: v.semver,
          branch: v.branch,
          commitMessage: v.commitMessage,
        }))}
      />
    </div>
  );
}

function ResultCard({ name, result, inputs }: { name: string; result: RunResult; inputs: Record<string, unknown> }) {
  const [evalResult, setEvalResult] = React.useState<{ score: number; reason: string } | null>(null);
  const [evaluating, setEvaluating] = React.useState(false);

  const evaluate = async () => {
    if (!result.output) return;
    setEvaluating(true);
    try {
      const res = await fetch("/api/playground/eval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: JSON.stringify(inputs).slice(0, 2000),
          output: result.output,
          scale: "pass_fail",
        }),
      });
      const data = await res.json();
      if (res.ok) setEvalResult(data);
      else toast.error(data.error ?? "eval failed");
    } catch (e: any) {
      toast.error(e?.message);
    }
    setEvaluating(false);
  };

  return (
    <div className="rounded-lg border border-primary/10 bg-background/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[11px] font-medium text-primary">{name}</span>
        {result.streaming && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
      </div>
      {result.error ? (
        <div className="rounded-md border border-rose-500/20 bg-rose-500/5 px-2.5 py-2 text-xs text-rose-600">
          {result.error}
        </div>
      ) : (
        <div className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/90">
          {result.output || <span className="text-muted-foreground">Ожидание ответа...</span>}
          {result.streaming && <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary" />}
        </div>
      )}
      {!result.streaming && !result.error && result.output && (
        <>
          <div className="mt-2 flex flex-wrap items-center gap-3 border-t pt-2 text-[10px] text-muted-foreground">
            {result.usage && (
              <>
                <span className="flex items-center gap-0.5"><Zap className="h-3 w-3" /> {result.usage.tokensIn + result.usage.tokensOut} ток.</span>
                <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {result.latencyMs}мс</span>
                <span className="flex items-center gap-0.5"><Cpu className="h-3 w-3" /> {result.model}</span>
              </>
            )}
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-[10px]" onClick={evaluate} disabled={evaluating}>
              {evaluating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Gavel className="mr-1 h-3 w-3" />}
              Оценить
            </Button>
          </div>
          {evalResult && (
            <div className={cn(
              "mt-1.5 rounded-md px-2 py-1 text-[11px]",
              evalResult.score >= 1 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
            )}>
              <b>{evalResult.score >= 1 ? "PASS" : "FAIL"}</b> — {evalResult.reason}
            </div>
          )}
        </>
      )}
    </div>
  );
}
