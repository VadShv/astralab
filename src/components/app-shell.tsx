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
  Boxes,
  Search,
  Sun,
  Moon,
  Plus,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
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

const NAV: { key: ViewKey; label: string; icon: React.ElementType; group: string }[] = [
  { key: "overview", label: "Обзор", icon: LayoutDashboard, group: "Рабочее пространство" },
  { key: "library", label: "Библиотека промптов", icon: Library, group: "Рабочее пространство" },
  { key: "history", label: "История версий", icon: GitBranch, group: "Разработка" },
  { key: "editor", label: "Редактор версий", icon: Code2, group: "Разработка" },
  { key: "playground", label: "Песочница", icon: FlaskConical, group: "Разработка" },
  { key: "experiments", label: "Эксперименты", icon: FlaskConical, group: "Тестирование" },
  { key: "deployment", label: "Карта развёртывания", icon: Rocket, group: "Релиз" },
  { key: "audit", label: "Журнал аудита", icon: ScrollText, group: "Релиз" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { view, navigate } = useNav();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background bg-dots">
      <div className="flex flex-1">
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        <div className="flex flex-1 flex-col min-w-0">
          <Topbar onMenu={() => setMobileOpen(true)} />
          <main className="flex-1">
            <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">
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
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={cn(
          "z-50 flex w-[260px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          "fixed inset-y-0 left-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-2.5 border-b px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">PromptVault</div>
            <div className="text-[11px] text-muted-foreground">Git для промптов</div>
          </div>
        </div>

        {/* Project switcher */}
        <ProjectSwitcher />

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scroll-thin px-3 py-3">
          {groups.map((g) => (
            <div key={g} className="mb-4">
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                        "group flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4", active && "text-primary")} />
                      {n.label}
                      {active && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <UserMenu />
      </aside>
    </>
  );
}

function ProjectSwitcher() {
  const { data } = useQuery({
    queryKey: ["overview"],
    queryFn: () => fetch("/api/overview").then((r) => r.json()),
  });
  const project = data?.project;
  return (
    <div className="border-b px-3 py-3">
      <div className="rounded-lg border bg-card px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/15 text-primary text-xs font-bold">
            {(project?.organization?.name ?? "A").slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">
              {project?.organization?.name ?? "Acme AI"}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {project?.name ?? "Платформа ATS"}
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 pulse-ring" />
          <span className="text-[11px] text-muted-foreground">
            тариф {project?.organization?.plan ?? "growth"} · регион eu
          </span>
        </div>
      </div>
    </div>
  );
}

function UserMenu() {
  return (
    <div className="border-t p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-sidebar-accent/60">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                EV
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left leading-tight">
              <div className="truncate text-sm font-medium">Елена Васкес</div>
              <div className="truncate text-[11px] text-muted-foreground">админ</div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-52">
          <DropdownMenuLabel>elena@acme.ai</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Профиль</DropdownMenuItem>
          <DropdownMenuItem>API-ключи</DropdownMenuItem>
          <DropdownMenuItem>Настройки</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-rose-500">Выйти</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { view } = useNav();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const title = NAV.find((n) => n.key === view)?.label ?? "Обзор";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onMenu}
        className="rounded-md p-2 hover:bg-muted lg:hidden"
        aria-label="Открыть меню"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>Платформа ATS</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-foreground">{title}</span>
      </div>

      <div className="relative ml-auto hidden md:block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск промптов, версий, экспериментов…"
          className="h-9 w-[280px] pl-9 bg-muted/50"
        />
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label="Сменить тему"
      >
        {mounted && theme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      <Button size="sm" className="h-9 gap-1.5" onClick={() => useNav.getState().navigate("library")}>
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
    <footer className="mt-auto border-t bg-background/80 px-4 py-2 backdrop-blur-md sm:px-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Все системы работают
        </span>
        <span>Serving P99 &lt; 200 мс</span>
        {k && (
          <>
            <span>{k.events24h?.toLocaleString()} запросов / 24ч</span>
            <span>в проде активно: {k.prodActive}</span>
            <span className="hidden sm:inline">экспериментов запущено: {k.activeExperiments}</span>
          </>
        )}
        <span className="ml-auto font-mono">promptvault v1.0.0 · сборка 2026.07.11</span>
      </div>
    </footer>
  );
}
