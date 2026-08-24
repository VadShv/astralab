"use client";

import * as React from "react";
import { GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { cn } from "@/lib/utils";

const FALLBACK_COLORS = ["#10b981", "#f59e0b", "#06b6d4", "#a855f7", "#f43f5e", "#8b5cf6"];

export function branchColor(name: string, index: number): string {
  if (name === "main") return "#10b981";
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export function BranchSelector({
  branches,
  selectedBranch,
  onSelect,
  onCreate,
}: {
  branches: string[];
  selectedBranch: string;
  onSelect: (branch: string) => void;
  onCreate: (name: string) => void;
}) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreate(name);
    setNewName("");
    setDialogOpen(false);
  };

  const sortedBranches = ["main", ...branches.filter((b) => b !== "main")];
  const selectedIdx = sortedBranches.indexOf(selectedBranch);
  const selectedColor = branchColor(selectedBranch, selectedIdx >= 0 ? selectedIdx : 0);

  return (
    <div className="flex items-center gap-1">
      <Select value={selectedBranch} onValueChange={onSelect}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: selectedColor }} />
            <GitBranch className="h-3 w-3" />
            <SelectValue />
          </span>
        </SelectTrigger>
        <SelectContent>
          {sortedBranches.map((b, i) => (
            <SelectItem key={b} value={b}>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: branchColor(b, i) }} />
                {b}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Новая ветка"
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Новая ветка</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="branch-name">Имя ветки</Label>
            <Input
              id="branch-name"
              className="font-mono text-sm"
              placeholder="experiment/new-approach"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">
              Ветка создаётся при сохранении первой версии в неё.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Отмена</Button>
            <Button disabled={!newName.trim()} onClick={handleCreate}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
