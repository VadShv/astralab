"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Library,
  Plus,
  Search,
  GitBranch,
  FlaskConical,
  Rocket,
  Tag as TagIcon,
} from "lucide-react";
import { Panel, StatusBadge, EmptyState } from "./shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNav } from "@/lib/nav-store";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function LibraryView() {
  const { navigate } = useNav();
  const [q, setQ] = React.useState("");
  const [tag, setTag] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["prompts", q, tag],
    queryFn: () => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (tag) params.set("tag", tag);
      return fetch(`/api/prompts?${params}`).then((r) => r.json());
    },
  });

  const prompts = data?.prompts ?? [];
  const tags = data?.tags ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Библиотека промптов</h2>
          <p className="text-sm text-muted-foreground">
            {prompts.length} промптов · иммутабельные версии с content-addressed хэшами
          </p>
        </div>
        <CreatePromptDialog open={open} onOpenChange={setOpen} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setTag(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              !tag ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
          >
            все
          </button>
          {tags.map((t: string) => (
            <button
              key={t}
              onClick={() => setTag(tag === t ? null : t)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                tag === t ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <TagIcon className="h-3 w-3" />
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-44 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : prompts.length === 0 ? (
        <EmptyState
          icon={Library}
          title="Пока нет промптов"
          description="Создайте первый промпт, чтобы начать версионирование, тестирование и релизы с уверенностью."
          action={<CreatePromptDialog open={open} onOpenChange={setOpen} trigger={<Button><Plus className="mr-1.5 h-4 w-4" /> Новый промпт</Button>} />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prompts.map((p: any) => (
            <PromptCard key={p.id} prompt={p} onOpen={() => navigate("history", { promptId: p.id })} />
          ))}
        </div>
      )}
    </div>
  );
}

function PromptCard({ prompt, onOpen }: { prompt: any; onOpen: () => void }) {
  const envs = prompt.environments ?? [];
  const prod = envs.find((e: any) => e.environment === "production");
  return (
    <Card
      className="group cursor-pointer p-5 transition-all hover:border-primary/40 hover:shadow-md"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-sm font-semibold text-primary">{prompt.name}</div>
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {prompt.description}
          </div>
        </div>
        {prod ? (
          <span className="shrink-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
            {prod.semver}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {(prompt.tags ?? []).slice(0, 3).map((t: string) => (
          <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center">
        <Stat icon={GitBranch} value={prompt.versionCount} label="версий" />
        <Stat icon={FlaskConical} value={prompt.experimentCount} label="тестов" />
        <Stat icon={Rocket} value={envs.length} label="окруж." />
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{prompt.defaultModel?.displayName ?? "—"}</span>
        <span>обновлён {timeAgo(prompt.createdAt)}</span>
      </div>
    </Card>
  );
}

function Stat({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="mt-1 text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function CreatePromptDialog({
  open,
  onOpenChange,
  trigger,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [tagsStr, setTagsStr] = React.useState("");
  const [modelId, setModelId] = React.useState<string>("");

  const { data: modelsData } = useQuery({
    queryKey: ["models"],
    queryFn: () => fetch("/api/models").then((r) => r.json()),
  });
  const models: { id: string; displayName: string; isDefault: boolean; provider: { name: string } }[] = modelsData?.models ?? [];

  React.useEffect(() => {
    if (!modelId && models.length > 0) {
      const def = models.find((m) => m.isDefault) ?? models[0];
      setModelId(def.id);
    }
  }, [models, modelId]);

  const mut = useMutation({
    mutationFn: (body: any) =>
      fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prompts"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      toast.success("Промпт создан");
      setName("");
      setDescription("");
      setTagsStr("");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Не удалось создать"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Создать промпт</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="pn">Имя</Label>
            <Input
              id="pn"
              placeholder="resume-screener"
              className="font-mono"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">Уникально в рамках проекта. Используйте kebab-case.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pd">Описание</Label>
            <Textarea
              id="pd"
              placeholder="Что делает этот промпт?"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pt">Теги</Label>
              <Input
                id="pt"
                placeholder="ats, screening"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pm">Модель по умолчанию</Label>
              <Select value={modelId} onValueChange={setModelId}>
                <SelectTrigger id="pm">
                  <SelectValue placeholder="Выберите модель…" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.displayName} ({m.provider.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            disabled={!name}
            onClick={() =>
              mut.mutate({
                name,
                description,
                tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
                defaultModelId: modelId || undefined,
              })
            }
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
