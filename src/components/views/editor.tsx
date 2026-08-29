"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Code2,
  GitCommitHorizontal,
  Plus,
  Trash2,
  Variable,
  Sliders,
  FileDiff,
  Eye,
  Play,
  GitFork,
  ArrowLeft,
  Check,
  FlaskConical,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "./shared";
import { useNav } from "@/lib/nav-store";
import { timeAgo, shortHash } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PromptContent, PromptVariable, ModelConfig } from "@/lib/prompt";

const DEFAULT_CONFIG: ModelConfig = { temperature: 0.2, top_p: 0.9, max_tokens: 800 };

const VERSION_STATUSES: { value: "draft" | "review" | "active" | "deprecated" | "rejected"; label: string }[] = [
  { value: "draft", label: "Черновик" },
  { value: "review", label: "На ревью" },
  { value: "active", label: "Активна" },
  { value: "deprecated", label: "В архиве" },
  { value: "rejected", label: "Отклонена" },
];

export function EditorView() {
  const { promptId, versionId, navigate } = useNav();

  if (!promptId) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Редактор версий</h2>
        <p className="text-sm text-muted-foreground">Сначала выберите промпт из библиотеки.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("library")}>
          Открыть библиотеку
        </Button>
      </div>
    );
  }

  return <EditorInner promptId={promptId} versionId={versionId} />;
}

function EditorInner({ promptId, versionId }: { promptId: string; versionId: string | null }) {
  const { navigate } = useNav();

  // load version if editing
  const { data: versionData } = useQuery({
    queryKey: ["version", versionId],
    queryFn: () => fetch(`/api/prompts/${promptId}/versions/${versionId}`).then((r) => r.json()),
    enabled: !!versionId,
  });
  const version = versionData?.version;

  // load prompt branches
  const { data: promptData } = useQuery({
    queryKey: ["prompt", promptId],
    queryFn: () => fetch(`/api/prompts/${promptId}`).then((r) => r.json()),
  });
  const branches = promptData?.prompt?.branches ?? [];

  const { data: modelsData } = useQuery({
    queryKey: ["models"],
    queryFn: () => fetch("/api/models").then((r) => r.json()),
  });
  const models: { id: string; displayName: string; provider: { name: string } }[] = modelsData?.models ?? [];

  const [readOnly, setReadOnly] = React.useState(!!versionId);
  const [versionIdLocal, setVersionIdLocal] = React.useState<string | null>(versionId ?? null);
  const [content, setContent] = React.useState<PromptContent>({ system: "", user: "" });
  const [variables, setVariables] = React.useState<PromptVariable[]>([]);
  const [modelConfig, setModelConfig] = React.useState<ModelConfig>(DEFAULT_CONFIG);
  const [modelId, setModelId] = React.useState<string>("");
  const [branch, setBranch] = React.useState("main");
  const [commitMessage, setCommitMessage] = React.useState("");
  const [semverKind, setSemverKind] = React.useState<"patch" | "minor" | "major">("patch");

  // initialize from version or defaults
  React.useEffect(() => {
    if (version) {
      setContent(version.content);
      setVariables(version.variables ?? []);
      setModelConfig(version.modelConfig ?? DEFAULT_CONFIG);
      setBranch(version.branch);
      setModelId(version.model?.id ?? "");
    }
  }, [version]);

  const qc = useQueryClient();
  const commitMut = useMutation({
    mutationFn: (body: any) =>
      fetch(`/api/prompts/${promptId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.reused) {
        toast.info("Идентичное содержимое — использована существующая версия");
      } else {
        toast.success(`Закоммичено ${data.version?.semver}`, {
          action: { label: "Аудит", onClick: () => navigate("audit") },
        });
      }
      qc.invalidateQueries({ queryKey: ["versions", promptId] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      navigate("history", { promptId });
    },
    onError: (e: any) => toast.error(e.message ?? "Не удалось закоммитить"),
  });

  const statusMut = useMutation({
    mutationFn: (status: string) =>
      fetch(`/api/prompts/${promptId}/versions/${versionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => r.json()),
    onSuccess: (_d, status) => {
      toast.success(`Статус изменён: ${VERSION_STATUSES.find((s) => s.value === status)?.label ?? status}`, {
        action: { label: "Аудит", onClick: () => navigate("audit") },
      });
      qc.invalidateQueries({ queryKey: ["version", versionId] });
      qc.invalidateQueries({ queryKey: ["versions", promptId] });
      qc.invalidateQueries({ queryKey: ["overview"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Не удалось сменить статус"),
  });

  const fork = () => {
    setReadOnly(false);
    setVersionIdLocal(null);
    setCommitMessage(`Форк от ${version?.semver}`);
  };
  const isReadOnly = readOnly && !!versionId;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("history", { promptId })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-lg font-semibold text-primary">
                {promptData?.prompt?.name}
              </h2>
              {version && <StatusBadge status={version.status} />}
            </div>
            <div className="text-xs text-muted-foreground">
              {version ? (
                <>
                  {version.semver} · {shortHash(version.versionHash)} · {version.author?.name} · {timeAgo(version.createdAt)}
                </>
              ) : (
                "Новая версия"
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {version && (
            <Select value={version.status} onValueChange={(v) => statusMut.mutate(v)}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VERSION_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate("experiments", { promptId })}>
            <FlaskConical className="mr-1.5 h-4 w-4" /> A/B тест
          </Button>
          {isReadOnly ? (
            <>
              <Button variant="outline" size="sm" onClick={() => navigate("playground", { promptId, versionId })}>
                <Play className="mr-1.5 h-4 w-4" /> Тест в песочнице
              </Button>
              <Button size="sm" onClick={fork}>
                <GitFork className="mr-1.5 h-4 w-4" /> Форкнуть и редактировать
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              disabled={!commitMessage || !content.system}
              onClick={() =>
                commitMut.mutate({
                  content,
                  variables,
                  modelConfig,
                  branch,
                  parentVersionId: versionIdLocal ?? versionId ?? null,
                  commitMessage,
                  semverKind,
                  modelId: modelId || undefined,
                })
              }
            >
              <GitCommitHorizontal className="mr-1.5 h-4 w-4" /> Закоммитить версию
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Editor */}
        <div className="space-y-4">
          {/* meta */}
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ветка</Label>
                <Select value={branch} onValueChange={setBranch} disabled={isReadOnly}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>
                    ))}
                    <SelectItem value="experiment/new">+ новая ветка…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Версия (bump)</Label>
                <Select value={semverKind} onValueChange={(v) => setSemverKind(v as any)} disabled={isReadOnly}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patch">patch (0.0.x)</SelectItem>
                    <SelectItem value="minor">minor (0.x.0)</SelectItem>
                    <SelectItem value="major">major (x.0.0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* system */}
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs"><Code2 className="h-3.5 w-3.5" /> Системное сообщение</Label>
              <span className="text-[11px] text-muted-foreground">{content.system.length} симв.</span>
            </div>
            <Textarea
              value={content.system}
              onChange={(e) => setContent({ ...content, system: e.target.value })}
              rows={7}
              disabled={isReadOnly}
              className="font-mono text-xs"
              placeholder="Вы эксперт…"
            />
          </Card>

          {/* user */}
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs"><Code2 className="h-3.5 w-3.5" /> Шаблон пользовательского сообщения</Label>
              <span className="text-[11px] text-muted-foreground">{content.user.length} симв.</span>
            </div>
            <Textarea
              value={content.user}
              onChange={(e) => setContent({ ...content, user: e.target.value })}
              rows={9}
              disabled={isReadOnly}
              className="font-mono text-xs"
              placeholder="Candidate: {{name}}…"
            />
          </Card>

          {/* commit message */}
          <Card className="p-4">
            <Label className="mb-2 block text-xs">Сообщение коммита</Label>
            <Input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              disabled={isReadOnly}
              placeholder="Добавить рубрику оценки + поле замечаний"
            />
          </Card>
        </div>

        {/* Right: variables, config, preview */}
        <div className="space-y-4">
          <Tabs defaultValue="preview">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="preview" className="text-xs"><Eye className="mr-1 h-3.5 w-3.5" /> Превью</TabsTrigger>
              <TabsTrigger value="variables" className="text-xs"><Variable className="mr-1 h-3.5 w-3.5" /> Переменные</TabsTrigger>
              <TabsTrigger value="config" className="text-xs"><Sliders className="mr-1 h-3.5 w-3.5" /> Конфиг</TabsTrigger>
              <TabsTrigger value="diff" className="text-xs"><FileDiff className="mr-1 h-3.5 w-3.5" /> Diff</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-3">
              <Card className="p-4">
                <div className="mb-2 text-xs font-medium text-muted-foreground">Рендер (переменные подсвечены)</div>
                <div className="space-y-3">
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">система</div>
                    <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-[11px] leading-relaxed">
                      {highlightVars(content.system)}
                    </pre>
                  </div>
                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">пользователь</div>
                    <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-[11px] leading-relaxed">
                      {highlightVars(content.user)}
                    </pre>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="variables" className="mt-3 space-y-2">
              <Card className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium">Объявленные переменные</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    disabled={isReadOnly}
                    onClick={() =>
                      setVariables([...variables, { name: "new_var", type: "string", required: false }])
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Добавить
                  </Button>
                </div>
                <div className="space-y-2">
                  {variables.length === 0 && (
                    <div className="py-4 text-center text-xs text-muted-foreground">Переменные не объявлены.</div>
                  )}
                  {variables.map((v, i) => (
                    <div key={i} className="grid grid-cols-12 items-center gap-2">
                      <Input
                        className="col-span-4 h-8 font-mono text-xs"
                        value={v.name}
                        disabled={isReadOnly}
                        onChange={(e) => {
                          const next = [...variables];
                          next[i] = { ...v, name: e.target.value };
                          setVariables(next);
                        }}
                      />
                      <Select
                        value={v.type}
                        disabled={isReadOnly}
                        onValueChange={(val) => {
                          const next = [...variables];
                          next[i] = { ...v, type: val as any };
                          setVariables(next);
                        }}
                      >
                        <SelectTrigger className="col-span-3 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["string", "number", "boolean", "object"].map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="col-span-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={v.required}
                          disabled={isReadOnly}
                          onChange={(e) => {
                            const next = [...variables];
                            next[i] = { ...v, required: e.target.checked };
                            setVariables(next);
                          }}
                          className="h-3.5 w-3.5"
                        />
                        обяз.
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="col-span-2 h-8 w-8 text-muted-foreground hover:text-rose-500"
                        disabled={isReadOnly}
                        onClick={() => setVariables(variables.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="config" className="mt-3">
              <Card className="p-4 space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Модель (override для версии)</Label>
                  <Select
                    value={modelId || "__none__"}
                    onValueChange={(v) => setModelId(v === "__none__" ? "" : v)}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="По умолчанию" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">По умолчанию (модель промпта)</SelectItem>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.displayName} ({m.provider.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="font-medium">temperature</span>
                    <span className="font-mono text-muted-foreground">{modelConfig.temperature}</span>
                  </div>
                  <Slider
                    value={[modelConfig.temperature]}
                    min={0}
                    max={2}
                    step={0.05}
                    disabled={isReadOnly}
                    onValueChange={([v]) => setModelConfig({ ...modelConfig, temperature: v })}
                  />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="font-medium">top_p</span>
                    <span className="font-mono text-muted-foreground">{modelConfig.top_p}</span>
                  </div>
                  <Slider
                    value={[modelConfig.top_p]}
                    min={0}
                    max={1}
                    step={0.05}
                    disabled={isReadOnly}
                    onValueChange={([v]) => setModelConfig({ ...modelConfig, top_p: v })}
                  />
                </div>
                <div>
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="font-medium">max_tokens</span>
                    <span className="font-mono text-muted-foreground">{modelConfig.max_tokens}</span>
                  </div>
                  <Slider
                    value={[modelConfig.max_tokens]}
                    min={64}
                    max={4096}
                    step={64}
                    disabled={isReadOnly}
                    onValueChange={([v]) => setModelConfig({ ...modelConfig, max_tokens: v })}
                  />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="diff" className="mt-3">
              <DiffPanel promptId={promptId!} versionId={versionId} parentVersionId={version?.parent?.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function highlightVars(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((p, i) => {
    if (/^\{\{[^}]+\}\}$/.test(p)) {
      return (
        <span key={i} className="var-token">{p}</span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

function DiffPanel({
  promptId,
  versionId,
  parentVersionId,
}: {
  promptId: string;
  versionId: string | null;
  parentVersionId?: string | null;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["diff", promptId, versionId, parentVersionId],
    queryFn: () =>
      fetch(`/api/prompts/${promptId}/versions/${versionId}/diff?against=${parentVersionId}`).then(
        (r) => r.json()
      ),
    enabled: !!versionId && !!parentVersionId,
  });

  if (!versionId || !parentVersionId)
    return (
      <Card className="p-6 text-center text-xs text-muted-foreground">
        Нет родительской версии для сравнения.
      </Card>
    );
  if (isLoading) return <Card className="p-6 text-center text-xs text-muted-foreground">Вычисление diff…</Card>;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="border-b px-4 py-2 text-xs text-muted-foreground">
        {data.from.semver} → {data.to.semver}
      </div>
      <div className="max-h-[420px] overflow-y-auto scroll-thin font-mono text-[11px]">
        {(["system", "user"] as const).map((field) => (
          <div key={field}>
            <div className="sticky top-0 bg-muted/80 px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground backdrop-blur">
              {field}
            </div>
            {data.diffs[field].map((row: any, i: number) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2 px-3 py-0.5",
                  row.type === "add" && "diff-add",
                  row.type === "del" && "diff-del"
                )}
              >
                <span className="w-6 shrink-0 select-none text-muted-foreground">
                  {row.type === "add" ? "+" : row.type === "del" ? "-" : " "}
                </span>
                <span className="whitespace-pre-wrap break-all">{row.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
