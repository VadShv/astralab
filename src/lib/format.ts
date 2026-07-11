"use client";

export function timeAgo(date: Date | string | number): string {
  const d = new Date(date).getTime();
  const diff = Date.now() - d;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return n.toLocaleString();
}

export function fmtUsd(n: number): string {
  if (n >= 1) return "$" + n.toFixed(2);
  return "$" + n.toFixed(4);
}

export function fmtPct(n: number, digits = 1): string {
  return (n * 100).toFixed(digits) + "%";
}

export function fmtDate(date: Date | string | number): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtDateTime(date: Date | string | number): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortHash(hash: string): string {
  return hash.slice(0, 7);
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  review: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/25",
  active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  deprecated: "bg-zinc-500/15 text-zinc-500 border-zinc-500/25",
  rejected: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25",
  running: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  paused: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25",
  concluded: "bg-zinc-500/15 text-zinc-500 border-zinc-500/25",
};

export function statusClass(status: string): string {
  return STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border";
}
