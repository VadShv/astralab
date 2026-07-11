---
Task ID: 1
Agent: Z.ai Code (main)
Task: Build PromptVault — a SaaS Prompt Versioning Platform (Git-like prompt management + A/B testing) as a Next.js 16 single-route app.

Work Log:
- Designed emerald/slate theme (globals.css) + dark-mode-first layout with JetBrains Mono accents; added ThemeProvider (next-themes) and metadata in layout.tsx.
- Authored Prisma schema (prisma/schema.prisma): User, Organization, Project, Prompt, PromptVersion (content-addressed hash, semver, branch, status, parent DAG), Branch, Tag, ActiveVersion (per env), Experiment, ExperimentVariant, ExperimentEvent (metrics), Comment, AuditLog. Pushed to SQLite (resolved JSON-default limitation).
- Built lib utilities: prompt.ts (SHA-256 hashing, semver bump, LCS line diff, Mustache-like template engine, variable extraction/validation) and stats.ts (normal CDF/PPF, power analysis, two-proportion z-test, Welch t-test, CI, mSPRT sequential test).
- Seeded realistic demo data (scripts/seed.ts): org Acme AI / project ATS Platform, 4 prompts (resume-screener w/ 4-version DAG across main/dev/experiment branches + tags, support-classifier, code-reviewer, email-drafter), 1 running A/B experiment with 7200 metric events (control 0.71 vs variant 0.80 eval pass rate, latency/cost/tokens), audit log.
- Implemented 20+ API routes: overview, prompts CRUD, versions+diff+status, branches, tags, active/activate, rollback, experiments + results (real stats), status, promote-winner, audit, deployment map, users, stats/power, and playground/run + playground/eval using z-ai-web-dev-sdk (LLM + LLM-as-judge).
- Built frontend: AppShell (sticky sidebar, topbar, sticky footer), Zustand nav store, TanStack Query provider, and 8 views — Overview (hero+KPIs+live experiments+activity), Library (filters+create), History (custom SVG DAG graph), Editor (split-view+diff+variables+model config), Playground (variable inputs, multi-version compare, real LLM, judge), Experiments (recharts cumulative chart, comparison table w/ p-values & CI, power progress, guardrails, mSPRT, winner banner + promote), Deployment Map (env grid + rollback), Audit Log.
- Fixed React Hooks rules (split History/Editor into router+inner), fixed normalPpf sign bug (power analysis was underestimating sample size), tuned seed so the experiment is significant + powered (winner recommended).
- Verified end-to-end with Agent Browser: all 8 views render, DAG/charts/tables populated, Playground LLM returns coherent output, LLM-as-judge returns PASS, Promote-winner flow completes, sticky footer correct on short+long pages, mobile responsive, no runtime errors, lint clean.

Stage Summary:
- Product: PromptVault — "Git for Prompts" SaaS with immutable content-addressed versions, Git-like DAG history, statistically correct A/B testing (power analysis, z-test, CI, sequential mSPRT), LLM-as-judge eval, multi-env deployment with instant rollback.
- Stack: Next.js 16 App Router, TypeScript, Tailwind 4, shadcn/ui, Prisma+SQLite, recharts, z-ai-web-dev-sdk, Zustand, TanStack Query.
- Single route `/` with client-side view routing; 20+ API routes; 8 feature views.
- Browser-verified: interactive, data-driven, no errors. Demo experiment shows variant_a as significant winner (+12.7% uplift, p<0.001, powered, guardrails intact) with one-click promote.
