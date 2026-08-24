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
  const [modelOverride, setModelOverride] = React.useState<string>("");

  const { data: modelsData } = useQuery({
    queryKey: ["models"],
    queryFn: () => fetch("/api/models").then((r) => r.json()),
  });
  const models: { id: string; displayName: string; provider: { name: string } }[] = modelsData?.models ?? [];

  const run = async (versionId: string) => {
    setRunning((r) => ({ ...r, [versionId]: true }));
    setResults((r) => ({ ...r, [versionId]: undefined }));
    try {
      const res = await fetch("/api/playground/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, inputs, modelId: modelOverride || undefined }),
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
    return <div className="text-sm text-muted-foreground">Загрузка песочницы…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Песочница</h2>
          <p className="text-sm text-muted-foreground">
            Тестируйте версии с реальными вызовами LLM. Сравнивайте бок о бок. Запросы не учитываются в prod-метриках.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPromptId ?? undefined} onValueChange={(v) => { setSelectedPromptId(v); setColumns([]); setResults({}); setEvals({}); }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Выберите промпт" /></SelectTrigger>
            <SelectContent>
              {prompts.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={modelOverride || "__auto__"} onValueChange={(v) => setModelOverride(v === "__auto__" ? "" : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Модель" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__auto__">Модель по умолчанию</SelectItem>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={runAll} disabled={activeVersions.length === 0}>
            <Play className="mr-1.5 h-4 w-4" /> Запустить все
          </Button>
        </div>
      </div>

      {/* Variable inputs */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Переменные
          </Label>
          <span className="text-[11px] text-muted-foreground">объявлено: {variables.length}</span>
        </div>
        {variables.length === 0 ? (
          <p className="text-xs text-muted-foreground">У этой версии нет объявленных переменных.</p>
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
                Заполнить примером
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Compare columns selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Сравнение:</span>
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
          <SelectTrigger className="h-7 w-[140px] text-xs"><Plus className="mr-1 h-3 w-3" /> добавить версию</SelectTrigger>
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
                  Выполнить
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
                    {isRunning ? "Вызов LLM…" : "Запустите, чтобы увидеть вывод"}
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
  // Известные примеры по точному имени переменной
  const known: Record<string, string> = {
    candidate_name: "Иван Петров",
    job_title: "ML Engineer",
    resume:
      "Иван Петров — ML Engineer\n5 лет опыта. Построил рекомендательную систему на 20М пользователей в Яндексе. Возглавил миграцию на векторный поиск, снизил p95-латентность на 40%. Магистр ВМК МГУ. Python, PyTorch, Kubernetes.",
    requirements: '["5+ лет ML engineering", "Production рекомендательные системы", "Векторный поиск / embeddings", "Python, PyTorch"]',
    message: "Здравствуйте! После обновления на тариф Growth списание не прошло. Перезарядите карту, пожалуйста — доступ нужен срочно.",
    diff: "+def get_user(id):\n+    return db.query(f\"SELECT * FROM users WHERE id = {id}\")",
    prospect_name: "Сара Лин",
    company: "Vercel",
    context: "Недавно подняли Series C, масштабируют инструменты для разработчиков",
    value_prop: "PromptVault снижает инциденты с LLM-регрессиями на 80%",
    topic: "Как векторный поиск меняет рекомендательные системы в 2026 году",
    audience: "CTO и ML-инженеры продуктовых команд",
    language: "Python",
    file_path: "src/api/users/route.ts",
  };
  // Эвристики по подстроке имени
  const heuristics: { match: RegExp; value: string }[] = [
    { match: /name|имя|назван/i, value: "Иван Петров" },
    { match: /title|должн|role|роль/i, value: "Senior Product Manager" },
    { match: /company|компани|brand|бренд/i, value: "Acme AI" },
    { match: /topic|тема|subject|предмет/i, value: "Как AI трансформирует B2B-продажи в 2026 году" },
    { match: /audience|аудитори|target|целев/i, value: "CTO и продакт-менеджеры SaaS-стартапов серии A–B" },
    { match: /description|описан|desc/i, value: "Платформа для версионирования промптов с A/B-тестированием и мгновенным откатом" },
    { match: /context|контекст|background|фон/i, value: "Компания только что подняла Series B, масштабирует AI-направление, ищет способы ускорить релизы промптов в продакшен" },
    { match: /requirement|требован|criteria|критери/i, value: '["Опыт 5+ лет", "Управление командой", "Знание Python и SQL", "Английский C1+"]' },
    { match: /keyword|ключев|tag|тег/i, value: '["AI продажам", "B2B SaaS", "LLM", "автоматизация", "воронка"]' },
    { match: /diff|диф|код|code/i, value: "+def get_user(id):\n+    return db.query(f\"SELECT * FROM users WHERE id = {id}\")" },
    { match: /resume|резюме|cv/i, value: "Иван Петров — Senior PM, 7 лет в продуктовой разработке. Запустил 3 продукта с ARR $2M+. Ex-Yandex, ex-Avito. МГУ ВМК." },
    { match: /message|сообщен|ticket|тикет|письмо/i, value: "Здравствуйте! Не могу зайти в личный кабинет после обновления. Пишет «сессия истекла», перепрошу вход — не помогает. Browser: Chrome 120." },
    { match: /question|вопрос|query|запрос/i, value: "Какие метрики важнее всего отслеживать при A/B-тестировании промптов в продакшене?" },
    { match: /industry|индустри|domain|область/i, value: "Финтех / банковские технологии" },
    { match: /goal|цель|objective|задача/i, value: "Увеличить конверсию из триала в платный план на 15% за квартал" },
    { match: /tone|тон|style|стиль/i, value: "Профессиональный, дружелюбный, без жаргона" },
    { match: /budget|бюджет|cost|стоимост|price|цена/i, value: "50000" },
    { match: /count|количеств|number|номер|limit|лимит/i, value: "10" },
    { match: /level|уровень|grade|класс/i, value: "Middle" },
    { match: /language|язык/i, value: "Python" },
    { match: /format|формат/i, value: "Markdown с заголовками H2/H3 и примерами" },
  ];

  for (const v of variables) {
    if (sample[v.name] && sample[v.name].trim()) continue; // не перезаписываем
    if (known[v.name]) {
      sample[v.name] = known[v.name];
      continue;
    }
    // эвристика
    const h = heuristics.find((x) => x.match.test(v.name) || x.match.test(v.description || ""));
    if (h) {
      sample[v.name] = h.value;
      continue;
    }
    // fallback по типу
    if (v.type === "object") {
      sample[v.name] = '["элемент 1", "элемент 2", "элемент 3"]';
    } else if (v.type === "number") {
      sample[v.name] = "10";
    } else if (v.type === "boolean") {
      sample[v.name] = "true";
    } else {
      // используем описание или имя как подсказку
      sample[v.name] = v.description ? `Пример: ${v.description}` : `Пример значения для ${v.name}`;
    }
  }
  setInputs(sample);
  toast.success("Пример заполнен");
}
