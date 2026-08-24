import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  twoProportionTest,
  welchTTest,
  sequentialTest,
  sampleSizeBinary,
  sampleSizeContinuous,
  formatP,
  significanceStars,
} from "@/lib/stats";
import type { GuardrailMetric } from "@/lib/prompt";

interface AggRow {
  variantId: string;
  n: number;
  eval_mean: number | null;
  eval_std: number | null;
  eval_sum: number | null;
  lat_mean: number | null;
  lat_std: number | null;
  lat_p50: number | null;
  lat_p95: number | null;
  lat_p99: number | null;
  cost_mean: number | null;
  cost_std: number | null;
  cost_total: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
}

interface VariantResult {
  variantId: string;
  name: string;
  version: { semver: string; branch: string; commitMessage: string };
  trafficWeight: number;
  n: number;
  primary: { metric: string; mean: number; successes?: number; rate?: number; std: number };
  latency: { mean: number; p50: number; p95: number; p99: number; std: number };
  cost: { mean: number; total: number; std: number };
  tokens: { in: number; out: number; total: number };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const experiment = await db.experiment.findUnique({
    where: { id },
    include: {
      variants: {
        include: { version: { select: { semver: true, branch: true, commitMessage: true } } },
      },
    },
  });
  if (!experiment) return NextResponse.json({ error: "not found" }, { status: 404 });

  const confidenceLevel = experiment.confidenceLevel;
  const guardrails = (experiment.guardrailMetrics as unknown as GuardrailMetric[]) ?? [];
  const isBinary = experiment.primaryMetric === "eval_pass_rate" || experiment.primaryMetric === "error_rate";

  // Per-variant descriptive stats via SQL aggregation (avoids loading all events into JS).
  const aggRows = await db.$queryRaw<AggRow[]>(Prisma.sql`
    SELECT
      "variantId",
      COUNT(*)::int AS n,
      AVG("metricValue") AS eval_mean,
      STDDEV_SAMP("metricValue") AS eval_std,
      SUM("metricValue") AS eval_sum,
      AVG("latencyMs") AS lat_mean,
      STDDEV_SAMP("latencyMs") AS lat_std,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY "latencyMs") AS lat_p50,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY "latencyMs") AS lat_p95,
      percentile_cont(0.99) WITHIN GROUP (ORDER BY "latencyMs") AS lat_p99,
      AVG("costUsd") AS cost_mean,
      STDDEV_SAMP("costUsd") AS cost_std,
      SUM("costUsd") AS cost_total,
      SUM("tokensIn")::int AS tokens_in,
      SUM("tokensOut")::int AS tokens_out
    FROM "ExperimentEvent"
    WHERE "experimentId" = ${id}
    GROUP BY "variantId"
  `);
  const aggByVariant: Record<string, AggRow> = {};
  for (const r of aggRows) aggByVariant[r.variantId] = r;

  const controlVariant = experiment.variants.find((v) => v.name === "control") ?? experiment.variants[0];

  const variantResults: VariantResult[] = experiment.variants.map((v) => {
    const a = aggByVariant[v.id];
    const n = a?.n ?? 0;
    const evalMean = a?.eval_mean ?? 0;
    const evalStd = a?.eval_std ?? 0;
    const evalSum = a?.eval_sum ?? 0;
    const rate = evalMean;

    return {
      variantId: v.id,
      name: v.name,
      version: v.version,
      trafficWeight: v.trafficWeight,
      n,
      primary: {
        metric: experiment.primaryMetric,
        mean: rate,
        ...(isBinary
          ? { successes: evalSum, rate, std: evalStd }
          : { std: evalStd }),
      },
      latency: {
        mean: a?.lat_mean ?? 0,
        p50: a?.lat_p50 ?? 0,
        p95: a?.lat_p95 ?? 0,
        p99: a?.lat_p99 ?? 0,
        std: a?.lat_std ?? 0,
      },
      cost: { mean: a?.cost_mean ?? 0, total: a?.cost_total ?? 0, std: a?.cost_std ?? 0 },
      tokens: { in: a?.tokens_in ?? 0, out: a?.tokens_out ?? 0, total: (a?.tokens_in ?? 0) + (a?.tokens_out ?? 0) },
    };
  });

  // significance tests: control vs each non-control variant
  const control = variantResults.find((r) => r.variantId === controlVariant.id) ?? variantResults[0];
  const comparisons = variantResults
    .filter((r) => r.variantId !== control.variantId)
    .map((r) => {
      if (isBinary) {
        const test = twoProportionTest(
          { n: control.n, successes: control.primary.successes ?? 0 },
          { n: r.n, successes: r.primary.successes ?? 0 },
          confidenceLevel
        );
        return {
          variant: r.name,
          controlRate: control.primary.rate,
          variantRate: r.primary.rate,
          diff: test.diff,
          uplift: test.uplift,
          ciLow: test.ciLow,
          ciHigh: test.ciHigh,
          pValue: test.pValue,
          pFormatted: formatP(test.pValue),
          stars: significanceStars(test.pValue),
          significant: test.significant,
          z: test.z,
          metric: experiment.primaryMetric,
          testType: "two-proportion z-test",
        };
      }
      const test = welchTTest(
        { name: control.name, n: control.n, mean: control.primary.mean, std: control.primary.std, sum: 0 },
        { name: r.name, n: r.n, mean: r.primary.mean, std: r.primary.std, sum: 0 },
        confidenceLevel
      );
      return {
        variant: r.name,
        controlRate: control.primary.mean,
        variantRate: r.primary.mean,
        diff: test.diff,
        uplift: test.uplift,
        ciLow: test.ciLow,
        ciHigh: test.ciHigh,
        pValue: test.pValue,
        pFormatted: formatP(test.pValue),
        stars: significanceStars(test.pValue),
        significant: test.significant,
        z: test.t,
        metric: experiment.primaryMetric,
        testType: "Welch's t-test",
      };
    });

  // guardrail checks
  const guardrailStatus = guardrails.map((g) => {
    const offenders = variantResults.filter((r) => {
      if (g.metric === "latency_p95") {
        return g.op === "max" ? r.latency.p95 > g.threshold : r.latency.p95 < g.threshold;
      }
      if (g.metric === "cost_per_request") {
        return g.op === "max" ? r.cost.mean > g.threshold : r.cost.mean < g.threshold;
      }
      return false;
    });
    return {
      metric: g.metric,
      op: g.op,
      threshold: g.threshold,
      violated: offenders.length > 0,
      violatingVariants: offenders.map((o) => o.name),
      values: variantResults.map((r) => ({
        variant: r.name,
        value: g.metric === "latency_p95" ? r.latency.p95 : r.cost.mean,
      })),
    };
  });

  // Lean event fetch (only 3 columns) for sequential test + time series.
  const leanEvents = await db.experimentEvent.findMany({
    where: { experimentId: id },
    select: { variantId: true, metricValue: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // sequential test (always-valid) for early stopping
  const obs = leanEvents.map((e) => ({ variant: e.variantId, value: e.metricValue }));
  const seq = sequentialTest({
    observations: obs,
    controlName: controlVariant.id,
    variancePrior: 0.25,
    threshold: 1 - confidenceLevel,
  });

  // sample size / power progress
  const controlRate = control.primary.rate ?? 0.7;
  const requiredPerVariant = isBinary
    ? sampleSizeBinary({ baselineRate: controlRate, mde: 0.03, confidenceLevel })
    : sampleSizeContinuous({ baselineStd: control.primary.std || 1, mde: 0.1, confidenceLevel });
  const progressPct = Math.min(100, Math.round((control.n / requiredPerVariant) * 100));

  // time series: cumulative rate per variant, bucketed
  const buckets = 24;
  const minTime = leanEvents[0]?.createdAt?.getTime() ?? Date.now();
  const maxTime = leanEvents[leanEvents.length - 1]?.createdAt?.getTime() ?? Date.now();
  const span = Math.max(1, maxTime - minTime);
  const series: { t: number; [variantName: string]: number | string }[] = [];
  const variantNameById: Record<string, string> = {};
  for (const v of experiment.variants) variantNameById[v.id] = v.name;

  const cumCount: Record<string, number> = {};
  const cumSum: Record<string, number> = {};
  for (const v of experiment.variants) {
    cumCount[v.id] = 0;
    cumSum[v.id] = 0;
  }
  let ei = 0;
  for (let b = 0; b <= buckets; b++) {
    const tBoundary = minTime + (span * b) / buckets;
    while (ei < leanEvents.length && leanEvents[ei].createdAt.getTime() <= tBoundary) {
      const e = leanEvents[ei];
      cumCount[e.variantId]++;
      cumSum[e.variantId] += e.metricValue;
      ei++;
    }
    const point: { t: number; [k: string]: number | string } = { t: tBoundary };
    for (const v of experiment.variants) {
      point[variantNameById[v.id]] = cumCount[v.id] > 0 ? cumSum[v.id] / cumCount[v.id] : 0;
    }
    series.push(point);
  }

  // winner recommendation
  let winner: { variantId: string; name: string; reason: string } | null = null;
  const best = comparisons
    .filter((c) => c.uplift > 0)
    .sort((a, b) => b.uplift - a.uplift)[0];
  const guardrailViolated = guardrailStatus.some((g) => g.violated);
  if (best && best.significant && !guardrailViolated && progressPct >= 100) {
    const winVariant = experiment.variants.find((v) => v.name === best.variant)!;
    winner = {
      variantId: winVariant.id,
      name: best.variant,
      reason: `${best.variant} shows +${(best.uplift * 100).toFixed(1)}% uplift on ${experiment.primaryMetric} (p=${best.pFormatted}) with all guardrails intact.`,
    };
  } else if (seq.stoppedVariant) {
    const v = experiment.variants.find((x) => x.id === seq.stoppedVariant);
    winner = {
      variantId: seq.stoppedVariant,
      name: v?.name ?? "",
      reason: `Sequential (always-valid) test reached significance early — safe to stop and decide.`,
    };
  }

  const totalEvents = aggRows.reduce((s, r) => s + r.n, 0);

  return NextResponse.json({
    experiment: {
      id: experiment.id,
      name: experiment.name,
      hypothesis: experiment.hypothesis,
      status: experiment.status,
      primaryMetric: experiment.primaryMetric,
      confidenceLevel,
      minSampleSize: experiment.minSampleSize,
      startedAt: experiment.startedAt,
      endedAt: experiment.endedAt,
    },
    variants: variantResults,
    controlVariantId: controlVariant.id,
    comparisons,
    guardrailStatus,
    sequential: {
      alwaysValidP: seq.alwaysValidP,
      stoppedVariant: seq.stoppedVariant
        ? variantNameById[seq.stoppedVariant] ?? null
        : null,
      evidence: seq.evidence.map((e) => ({
        variant: variantNameById[e.variant] ?? e.variant,
        llr: e.llr,
      })),
    },
    power: {
      requiredPerVariant,
      collected: control.n,
      progressPct,
      mde: 0.03,
      confidenceLevel,
      power: 0.8,
    },
    series,
    seriesVariantNames: experiment.variants.map((v) => v.name),
    winner,
    totalEvents,
  });
}
