"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { timeAgo, fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACTION_FILTERS = [
  "all",
  "version.created",
  "version.activated",
  "version.status_changed",
  "rollback.triggered",
  "experiment",
  "tag",
  "comment",
  "prompt.created",
];

export function AuditView() {
  const [filter, setFilter] = React.useState("all");
  const { data } = useQuery({
    queryKey: ["audit", filter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: "80" });
      if (filter !== "all") params.set("action", filter);
      return fetch(`/api/audit?${params}`).then((r) => r.json());
    },
  });
  const logs: any[] = data?.logs ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Audit Log</h2>
        <p className="text-sm text-muted-foreground">Chronological record of who changed what, and when.</p>
      </div>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {ACTION_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors",
              filter === f ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y">
          {logs.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">No matching events.</div>
          )}
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback style={{ background: log.actor?.avatarColor ?? "#71717a" }} className="text-[10px] text-white">
                  {log.actor?.name?.slice(0, 2) ?? "SY"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                  <span className="font-medium">{log.actor?.name ?? "system"}</span>
                  <span className="font-mono text-[11px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                    {log.action}
                  </span>
                  <span className="text-xs text-muted-foreground">{log.targetType}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span>{fmtDateTime(log.createdAt)}</span>
                  <span>·</span>
                  <span>{timeAgo(log.createdAt)}</span>
                  {log.detail && Object.keys(log.detail).length > 0 && (
                    <>
                      <span>·</span>
                      <span className="font-mono">{formatDetail(log.detail)}</span>
                    </>
                  )}
                </div>
              </div>
              <span className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", tone(log.action))} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function formatDetail(detail: any): string {
  return Object.entries(detail)
    .map(([k, v]) => `${k}=${v as any}`)
    .join(" ");
}

function tone(action: string): string {
  if (action.includes("rollback")) return "bg-rose-500";
  if (action.includes("activated") || action.includes("started")) return "bg-emerald-500";
  if (action.includes("created")) return "bg-primary";
  if (action.includes("concluded")) return "bg-violet-500";
  if (action.includes("comment")) return "bg-amber-500";
  return "bg-zinc-400";
}
