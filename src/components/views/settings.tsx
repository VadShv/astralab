"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Pencil,
  Plug,
  CheckCircle2,
  XCircle,
  Loader2,
  Cpu,
  FlaskConical,
  Star,
} from "lucide-react";
import { Panel } from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ProviderRow {
  id: string;
  name: string;
  baseUrl: string;
  kind: string;
  isActive: boolean;
  createdAt: string;
  modelCount: number;
  apiKeyMask: string;
}

interface ModelRow {
  id: string;
  providerId: string;
  externalId: string;
  displayName: string;
  contextWindow: number | null;
  isDefault: boolean;
  provider: { id: string; name: string; isActive: boolean };
}

export function SettingsView() {
  const qc = useQueryClient();
  const { data: providersData } = useQuery({
    queryKey: ["providers"],
    queryFn: () => fetch("/api/providers").then((r) => r.json()),
  });
  const { data: modelsData } = useQuery({
    queryKey: ["models"],
    queryFn: () => fetch("/api/models").then((r) => r.json()),
  });
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  const providers: ProviderRow[] = providersData?.providers ?? [];
  const models: ModelRow[] = modelsData?.models ?? [];
  const judgeModelId: string | null = settingsData?.judgeModelId ?? null;

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProviderRow | null>(null);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["providers"] });
    qc.invalidateQueries({ queryKey: ["models"] });
  };

  const deleteProvider = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/providers/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Провайдер удалён");
      invalidateAll();
    },
    onError: () => toast.error("Не удалось удалить"),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetch(`/api/providers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      }).then((r) => r.json()),
    onSuccess: () => invalidateAll(),
  });

  const setDefaultModel = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Модель по умолчанию обновлена");
      qc.invalidateQueries({ queryKey: ["models"] });
    },
  });

  const deleteModel = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/models/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Модель удалена");
      invalidateAll();
    },
    onError: () => toast.error("Не удалось удалить модель"),
  });

  const setJudge = useMutation({
    mutationFn: (modelId: string) =>
      fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ judgeModelId: modelId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Модель-судья обновлена");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Провайдеры моделей, подключение по OpenAI-совместимому API и конфигурация модели-судьи.
        </p>
      </div>

      {/* Providers */}
      <Panel
        title="Провайдеры моделей"
        description="OpenAI-совместимые endpoint'ы (Cloud.ru, OpenAI, vLLM, Ollama и др.)"
        action={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Добавить провайдера
          </Button>
        }
      >
        {providers.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Провайдеры не настроены. Добавьте подключение к Cloud.ru или другому OpenAI-совместимому API.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>API-ключ</TableHead>
                <TableHead>Моделей</TableHead>
                <TableHead>Активен</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.baseUrl}</TableCell>
                  <TableCell className="font-mono text-xs">{p.apiKeyMask}</TableCell>
                  <TableCell>{p.modelCount}</TableCell>
                  <TableCell>
                    <Switch
                      checked={p.isActive}
                      onCheckedChange={(v) => toggleActive.mutate({ id: p.id, isActive: v })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditing(p);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-rose-500"
                        onClick={() => deleteProvider.mutate(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Panel>

      {/* Models */}
      <Panel
        title="Модели"
        description="Доступные модели по провайдерам. Звезда — модель по умолчанию для новых промптов."
      >
        {models.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Нет моделей. Добавьте провайдера и импортируйте модели через «Тест соединения».
          </div>
        ) : (
          <div className="space-y-4">
            {providers.map((p) => {
              const pModels = models.filter((m) => m.providerId === p.id);
              if (pModels.length === 0) return null;
              return (
                <div key={p.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <Cpu className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-medium">{p.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{pModels.length}</Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {pModels.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-lg border border-primary/10 bg-primary/5 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">{m.displayName}</span>
                            {m.isDefault && <Star className="h-3 w-3 fill-primary text-primary" />}
                          </div>
                          <div className="truncate font-mono text-[10px] text-muted-foreground">{m.externalId}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {!m.isDefault && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Сделать по умолчанию"
                              onClick={() => setDefaultModel.mutate(m.id)}
                            >
                              <Star className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-rose-500"
                            onClick={() => deleteModel.mutate(m.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Judge model */}
      <Panel
        title="Модель-судья (LLM-as-judge)"
        description="Используется для оценки качества ответов в тестовом стенде и экспериментах."
      >
        <div className="flex items-center gap-3">
          <FlaskConical className="h-4 w-4 text-primary" />
          <Select
            value={judgeModelId ?? ""}
            onValueChange={(v) => setJudge.mutate(v)}
          >
            <SelectTrigger className="w-[320px]">
              <SelectValue placeholder="Выберите модель-судью…" />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.displayName} ({m.provider.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {settingsData?.judgeModel && (
            <Badge variant="outline" className="text-[10px]">
              {settingsData.judgeModel.providerName}
            </Badge>
          )}
        </div>
      </Panel>

      <ProviderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={invalidateAll}
      />
    </div>
  );
}

function ProviderDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ProviderRow | null;
  onSaved: () => void;
}) {
  const [name, setName] = React.useState("");
  const [baseUrl, setBaseUrl] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ ok: boolean; models?: string[]; error?: string } | null>(null);
  const [selectedModels, setSelectedModels] = React.useState<Set<string>>(new Set());
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setBaseUrl(editing?.baseUrl ?? "");
      setApiKey("");
      setTestResult(null);
      setSelectedModels(new Set());
    }
  }, [open, editing]);

  const handleTest = async () => {
    if (!baseUrl || !apiKey) {
      toast.error("Введите baseUrl и API-ключ");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseUrl, apiKey }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.ok && data.models) {
        setSelectedModels(new Set(data.models.slice(0, 5)));
      }
    } catch (e: any) {
      setTestResult({ ok: false, error: e?.message });
    }
    setTesting(false);
  };

  const handleSave = async () => {
    const isEdit = !!editing;
    if (!name || !baseUrl) {
      toast.error("Заполните название и baseUrl");
      return;
    }
    if (!isEdit && !apiKey) {
      toast.error("Введите API-ключ");
      return;
    }
    setSaving(true);
    try {
      const url = isEdit ? `/api/providers/${editing!.id}` : "/api/providers";
      const payload: Record<string, unknown> = { name, baseUrl };
      if (apiKey) payload.apiKey = apiKey;

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const providerId = isEdit ? editing!.id : data.provider.id;

      // import selected models (skip duplicates silently)
      if (testResult?.ok && selectedModels.size > 0) {
        let imported = 0;
        for (const externalId of selectedModels) {
          const mRes = await fetch("/api/models", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              providerId,
              externalId,
              displayName: externalId,
              isDefault: false,
            }),
          });
          if (mRes.ok) imported++;
        }
        toast.success(`Сохранено, импортировано моделей: ${imported}`);
      } else {
        toast.success("Провайдер сохранён");
      }

      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка сохранения");
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Редактировать провайдера" : "Новый провайдер"}</DialogTitle>
          <DialogDescription>
            OpenAI-совместимый endpoint. Для Cloud.ru укажите baseUrl и API-ключ из консоли.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Название</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cloud.ru" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-url">Base URL</Label>
            <Input
              id="p-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.cloud.ru/v1"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-key">
              API-ключ {editing && <span className="text-muted-foreground">(оставьте пустым, чтобы не менять)</span>}
            </Label>
            <Input
              id="p-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
              Тест соединения
            </Button>
            {testResult && (
              <div className="flex items-center gap-1.5 text-sm">
                {testResult.ok ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-emerald-600">Найдено моделей: {testResult.models?.length ?? 0}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-rose-500" />
                    <span className="text-rose-600">{testResult.error ?? "Ошибка"}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {testResult?.ok && testResult.models && testResult.models.length > 0 && (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-primary/10 bg-primary/5 p-2">
              <div className="px-1 text-[11px] text-muted-foreground">Выберите модели для импорта:</div>
              {testResult.models.map((m) => (
                <label
                  key={m}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-primary/10",
                    selectedModels.has(m) && "bg-primary/10"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.has(m)}
                    onChange={(e) => {
                      const next = new Set(selectedModels);
                      if (e.target.checked) next.add(m);
                      else next.delete(m);
                      setSelectedModels(next);
                    }}
                  />
                  <span className="font-mono text-xs">{m}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
