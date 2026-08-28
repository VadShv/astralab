"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Library,
  GitBranch,
  Code2,
  FlaskConical,
  Rocket,
  ScrollText,
  Orbit,
  Search,
  Plus,
  ChevronRight,
  Radar,
  Users,
  Activity,
  BookOpen,
  Settings,
  FileCode2,
  Play,
} from "lucide-react";
import { useNav, type ViewKey } from "@/lib/nav-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";

const NAV: { key: ViewKey; label: string; icon: React.ElementType; group: string; code: string }[] = [
  { key: "ide", label: "IDE промптов", icon: FileCode2, group: "Рабочее пространство", code: "IDE-00" },
  { key: "overview", label: "Командный центр", icon: LayoutDashboard, group: "Навигация", code: "CMD-01" },
  { key: "library", label: "Библиотека HR-промптов", icon: Library, group: "Навигация", code: "LIB-02" },
  { key: "instructions", label: "Инструкция", icon: BookOpen, group: "Навигация", code: "DOC-09" },
  { key: "history", label: "Граф версий", icon: GitBranch, group: "Разработка", code: "DAG-03" },
  { key: "editor", label: "Редактор версий", icon: Code2, group: "Разработка", code: "EDT-04" },
  { key: "experiments", label: "A/B эксперименты", icon: FlaskConical, group: "Исследование", code: "EXP-06" },
  { key: "playground", label: "Песочница", icon: Play, group: "Исследование", code: "PG-05" },
  { key: "deployment", label: "Карта развёртывания", icon: Rocket, group: "Релиз", code: "DEP-07" },
  { key: "audit", label: "Журнал аудита", icon: ScrollText, group: "Релиз", code: "AUD-08" },
  { key: "settings", label: "Настройки", icon: Settings, group: "Релиз", code: "SET-10" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-cosmos">
      {/* Орбитальный декор сверху */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="flex flex-1">
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <div className="flex flex-1 flex-col min-w-0">
          <Topbar onMenu={() => setMobileOpen(true)} />
          <main className="flex-1">
            <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </div>
          </main>
          <StatusBar />
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { view, navigate } = useNav();
  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={cn(
          "z-50 flex w-[264px] shrink-0 flex-col border-r border-primary/15 bg-sidebar/80 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          "fixed inset-y-0 left-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Бренд Astra Recruiting */}
        <div className="relative flex h-16 items-center gap-2.5 border-b border-primary/15 px-5">
          <div className="relative flex h-9 w-9 items-center justify-center">
            <div className="absolute inset-0 rounded-lg bg-primary/15 blur-md" />
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary glow-cyan-sm">
              <Orbit className="h-5 w-5" />
            </div>
            {/* орбитальное кольцо */}
            <div className="pointer-events-none absolute inset-[-4px] rounded-full border border-primary/20 orbit-spin-slow">
              <div className="absolute -top-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary" />
            </div>
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight text-glow">
              ASTRA <span className="text-primary">RECRUITING</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-primary/60">
              v3.0 · recruiting lab
            </div>
          </div>
        </div>

        <HrMissionControl />

        {/* Навигация */}
        <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-3">
          {groups.map((g) => (
            <div key={g} className="mb-4">
              <div className="mono-label px-3 pb-2">
                {g}
              </div>
              <div className="space-y-0.5">
                {NAV.filter((n) => n.group === g).map((n) => {
                  const active = view === n.key;
                  const Icon = n.icon;
                  return (
                    <button
                      key={n.key}
                      onClick={() => {
                        navigate(n.key);
                        onCloseMobile();
                      }}
                      className={cn(
                        "group relative flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
                        active
                          ? "bg-primary/10 text-primary border-glow"
                          : "text-muted-foreground hover:bg-primary/5 hover:text-primary/80"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", active && "text-primary")} />
                      <span className="flex-1 text-left">{n.label}</span>
                      <span className="font-mono text-[9px] text-muted-foreground/50">{n.code}</span>
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary glow-cyan-sm" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <UserMenu />
      </aside>
    </>
  );
}

function HrMissionControl() {
  const { data } = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetch("/api/overview").then((r) => r.json()),
  });
  const k = data?.kpis;
  const project = data?.project;
  return (
    <div className="border-b border-primary/15 px-3 py-3">
      <div className="mono-label px-1 pb-2 flex items-center gap-1.5">
        <Radar className="h-3 w-3" /> Рекрутинг-сектор
      </div>
      <div className="glass rounded-lg px-3 py-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/15 text-primary text-xs font-bold border border-primary/30">
              <Users className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <div className="truncate text-xs font-medium">
                {project?.organization?.name ?? "Astra Recruiting"}
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                {project?.name ?? "Рекрутинговая лаборатория"}
              </div>
            </div>
          </div>
        </div>
        {/* Метрики-индикаторы */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <Indicator label="ПРОМПТЫ" value={k?.prompts ?? "—"} />
          <Indicator label="В ПРОДЕ" value={k?.prodActive ?? "—"} />
          <Indicator label="A/B" value={k?.activeExperiments ?? "—"} />
        </div>
        <div className="flex items-center gap-1.5 pt-1">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary pulse-ring" />
          <span className="font-mono text-[10px] text-primary/70">
            ORBIT STABLE · {k?.events24h?.toLocaleString() ?? 0} операций/24ч
          </span>
        </div>
      </div>
    </div>
  );
}

function Indicator({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border border-primary/10 bg-primary/5 px-1.5 py-1 text-center">
      <div className="font-mono text-sm font-semibold tabular-nums text-primary">{value}</div>
      <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function UserMenu() {
  return (
    <div className="border-t border-primary/15 p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2.5 rounded-lg border border-primary/10 bg-primary/5 px-2 py-2 hover:border-primary/30 hover:bg-primary/10 transition-colors">
            <Avatar className="h-8 w-8 border border-primary/30">
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-mono">
                ЕВ
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left leading-tight">
              <div className="truncate text-sm font-medium">Елена Васкес</div>
              <div className="font-mono text-[10px] text-primary/60">Lead Recruiter · L4</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-52">
          <DropdownMenuLabel className="font-mono text-xs">elena@astra-rec.io</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Профиль оператора</DropdownMenuItem>
          <DropdownMenuItem>API-ключи</DropdownMenuItem>
          <DropdownMenuItem>Настройки сектора</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-rose-500">Отключиться</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { view } = useNav();

  const title = NAV.find((n) => n.key === view)?.label ?? "Командный центр";
  const code = NAV.find((n) => n.key === view)?.code ?? "CMD-01";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-primary/15 bg-background/70 px-4 backdrop-blur-xl sm:px-6">
      <button
        onClick={onMenu}
        className="rounded-md p-2 hover:bg-primary/10 lg:hidden"
        aria-label="Открыть меню"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-[11px] text-muted-foreground">Astra Recruiting</span>
        <ChevronRight className="h-3.5 w-3.5 text-primary/40" />
        <span className="font-mono text-[11px] text-primary/60">{code}</span>
        <ChevronRight className="h-3.5 w-3.5 text-primary/40" />
        <span className="font-medium text-foreground">{title}</span>
      </div>

      <div className="relative ml-auto hidden md:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/50" />
        <Input
          placeholder="Поиск по орбите HR-промптов…"
          className="h-9 w-[300px] border-primary/20 bg-primary/5 pl-9 font-mono text-sm placeholder:text-muted-foreground/60 focus-visible:border-primary/50"
        />
      </div>

      {/* Индикатор активности */}
      <div className="hidden lg:flex items-center gap-1.5 rounded-md border border-primary/15 bg-primary/5 px-2 py-1">
        <Activity className="h-3 w-3 text-primary blink" />
        <span className="font-mono text-[10px] text-primary/70">LIVE</span>
      </div>

      <Button
        size="sm"
        className="h-9 gap-1.5 border-glow bg-primary/15 text-primary hover:bg-primary/25"
        onClick={() => useNav.getState().navigate("ide")}
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Новый промпт</span>
      </Button>
    </header>
  );
}

function StatusBar() {
  const { data } = useQuery({
    queryKey: ["overview-status"],
    queryFn: () => fetch("/api/overview").then((r) => r.json()),
    refetchInterval: 30000,
  });
  const k = data?.kpis;
  return (
    <footer className="mt-auto border-t border-primary/15 bg-background/70 px-4 py-2 backdrop-blur-xl sm:px-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary pulse-ring" />
          <span className="text-primary/80">ORBIT NOMINAL</span>
        </span>
        <span>Serving P99 &lt; 200ms</span>
        {k && (
          <>
            <span>{k.events24h?.toLocaleString()} оп/24ч</span>
            <span>prod-активно: {k.prodActive}</span>
            <span className="hidden sm:inline">A/B запущено: {k.activeExperiments}</span>
          </>
        )}
        <span className="ml-auto text-primary/60">
          astra-recruiting v3.0.0 · orbit-build 2026.07.11
        </span>
      </div>
    </footer>
  );
}
