import { createHash } from "crypto";

/** Shared types for the platform. */

export type VersionStatus = "draft" | "review" | "active" | "deprecated" | "rejected";
export type ExperimentStatus = "draft" | "running" | "paused" | "concluded";
export type Environment = "development" | "staging" | "production";

export interface PromptContent {
  system: string;
  user: string;
  assistant?: string;
}

export interface PromptVariable {
  name: string;
  type: "string" | "number" | "boolean" | "object";
  required: boolean;
  default?: unknown;
  description?: string;
}

export interface ModelConfig {
  temperature: number;
  top_p: number;
  max_tokens: number;
  stop?: string[];
}

export interface TrafficSplit {
  [variantName: string]: number;
}

export interface GuardrailMetric {
  metric: string;
  op: "max" | "min";
  threshold: number;
}

export interface VersionWithRelations {
  id: string;
  versionHash: string;
  semver: string;
  branch: string;
  content: PromptContent;
  variables: PromptVariable[];
  modelConfig: ModelConfig;
  parentVersionId: string | null;
  commitMessage: string;
  authorId: string;
  status: VersionStatus;
  createdAt: Date;
  author?: { id: string; name: string; avatarColor: string };
  tags?: { id: string; name: string }[];
  children?: VersionWithRelations[];
}

/** SHA-256 content-addressed hash of the normalized prompt payload. */
export function computeVersionHash(payload: {
  content: PromptContent;
  variables: PromptVariable[];
  modelConfig: ModelConfig;
}): string {
  const normalized = JSON.stringify({
    content: payload.content,
    variables: payload.variables,
    modelConfig: payload.modelConfig,
  });
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

/** Semver helpers. */
export function parseSemver(v: string): [number, number, number] {
  const m = v.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return [0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function bumpSemver(
  current: string,
  kind: "patch" | "minor" | "major"
): string {
  const [maj, min, pat] = parseSemver(current);
  if (kind === "major") return `${maj + 1}.0.0`;
  if (kind === "minor") return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

export function semverCompare(a: string, b: string): number {
  const [amaj, amin, apat] = parseSemver(a);
  const [bmaj, bmin, bpat] = parseSemver(b);
  if (amaj !== bmaj) return amaj - bmaj;
  if (amin !== bmin) return amin - bmin;
  return apat - bpat;
}

/** LCS-based line diff. Returns unified-style rows for rendering. */
export interface DiffRow {
  type: "add" | "del" | "ctx";
  text: string;
  oldNo?: number;
  newNo?: number;
}

export function lineDiff(oldText: string, newText: string): DiffRow[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  let oldNo = 1;
  let newNo = 1;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ type: "ctx", text: a[i], oldNo: oldNo++, newNo: newNo++ });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ type: "del", text: a[i], oldNo: oldNo++ });
      i++;
    } else {
      rows.push({ type: "add", text: b[j], newNo: newNo++ });
      j++;
    }
  }
  while (i < n) rows.push({ type: "del", text: a[i++], oldNo: oldNo++ });
  while (j < m) rows.push({ type: "add", text: b[j++], newNo: newNo++ });
  return rows;
}

/** Mustache-like template renderer with {{var}}, {{obj.prop}}, {{#list}}...{{/list}}. */
export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  let out = template;
  // Sections (loops): {{#items}}...{{/items}}
  out = out.replace(
    /\{\{#(\w+(?:\.\w+)*)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_m, path: string, body: string) => {
      const val = resolvePath(vars, path);
      if (Array.isArray(val)) {
        return val
          .map((item) => {
            if (typeof item === "object" && item !== null) {
              return renderTemplate(body, { ...vars, ...item });
            }
            return renderTemplate(body, { ...vars, this: item });
          })
          .join("");
      }
      if (val) {
        return renderTemplate(body, vars);
      }
      return "";
    }
  );
  // Variables: {{name}} and {{a.b}}
  out = out.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_m, path: string) => {
    const val = resolvePath(vars, path);
    return val === undefined || val === null ? "" : String(val);
  });
  return out;
}

function resolvePath(vars: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = vars;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
}

/** Extract {{var}} tokens from a template. */
export function extractVariables(template: string): string[] {
  const set = new Set<string>();
  const re = /\{\{(#\/)?(\w+(?:\.\w+)*)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template))) {
    if (m[1]) continue; // skip section markers
    set.add(m[2]);
  }
  return [...set];
}

/** Validate that all required variables are provided. */
export function validateVariables(
  declared: PromptVariable[],
  provided: Record<string, unknown>
): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  for (const v of declared) {
    if (v.required && (provided[v.name] === undefined || provided[v.name] === null)) {
      missing.push(v.name);
    }
  }
  return { ok: missing.length === 0, missing };
}
