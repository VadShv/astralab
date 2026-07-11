"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { statusClass } from "@/lib/format";

export function Panel({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
          <div>
            {title && <div className="text-sm font-semibold">{title}</div>}
            {description && (
              <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </Card>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        statusClass(status),
        className
      )}
    >
      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; positive?: boolean };
  icon: React.ElementType;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </div>
          {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {delta && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-[11px] font-medium",
            delta.positive ? "text-emerald-500" : "text-rose-500"
          )}
        >
          {delta.positive ? "▲" : "▼"} {delta.value}
        </div>
      )}
    </Card>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      {description && (
        <div className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
