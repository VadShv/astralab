import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  summarize,
  twoProportionTest,
  welchTTest,
  sequentialTest,
  sampleSizeBinary,
  sampleSizeContinuous,
  formatP,
  significanceStars,
} from "@/lib/stats";
import type { GuardrailMetric } from "@/lib/prompt";

function pctile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * (sorted.length - 1)));
  return sorted[idx];
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

  const events = await db.experimentEvent.findMany({
    where: { experimentId: id },
    orderBy: { createdAt: "asc" },
  });

  const confidenceLevel = experiment.confidenceLevel;
  const guardrails = (experiment.guardrailMetrics as GuardrailMetric[]) ?? [];

  // group events by variant
  const byVariant: Record<string, typeof events> = {};
  for (const e of events) {
    (byVariant[e.variantId] ??= []).push(e);
  }

  const controlVariant = experiment.variants.find((v) => v.name === "control") ?? experiment.variants[0];

  // per-variant metric summaries
  const variantResults = experiment.variants.map((v) => {
    const evs = byVariant[v.id] ?? [];
    const evalValues = evs.map((e) => e.metricValue);
    const latencies = evs.map((e) => e.latencyMs).sort((a, b) => a - b);
    const costs = evs.map((e) => e.costUsd);
    const tokensIn = evs.reduce((a, e) => a + e.tokensIn, 0);
    const tokensOut = evs.reduce((a, e) => a + e.tokensOut, 0);

    const evalStats = summarize(v.name, evalValues);
    const latStats = summarize(v.name, latencies);
    const costStats = summarize(v.name, costs);

    const isBinary = experiment.primaryMetric === "eval_pass_rate" || experiment.primaryMetric === "error_rate";
    const rate = isBinary ? evalStats.mean : evalStats.mean;

    return {
      variantId: v.id,
      name: v.name,
      version: v.version,
      trafficWeight: v.trafficWeight,
      n: evs.length,
      primary: {
        metric: experiment.primaryMetric,
        mean: rate,
        ...(isBinary
          ? { successes: evalStats.sum, rate, std: evalStats.std }
          : { std: evalStats.std }),
      },
      latency: {
        mean: latStats.mean,
        p50: pctile(latencies, 50),
        p95: pctile(latencies, 95),
        p99: pctile(latencies, 99),
        std: latStats.std,
      },
      cost: { mean: costStats.mean, total: costStats.sum, std: costStats.std },
      tokens: { in: tokensIn, out: tokensOut, total: tokensIn + tokensOut },
    };
  });

  // significance tests: control vs each non-control variant
  const control = variantResults.find((r) => r.variantId === controlVariant.id) ?? variantResults[0];
  const comparisons = variantResults
    .filter((r) => r.variantId !== control.variantId)
    .map((r) => {
      const isBinary = experiment.primaryMetric === "eval_pass_rate" || experiment.primaryMetric === "error_rate";
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

  // sequential test (always-valid) for early stopping
  const obs = events.map((e) => ({ variant: e.variantId, value: e.metricValue }));
  const seq = sequentialTest({
    observations: obs,
    controlName: controlVariant.id,
    variancePrior: 0.25,
    threshold: 1 - confidenceLevel,
  });

  // sample size / power progress
  const controlRate = control.primary.rate ?? 0.7;
  const requiredPerVariant =
    experiment.primaryMetric === "eval_pass_rate" || experiment.primaryMetric === "error_rate"
      ? sampleSizeBinary({ baselineRate: controlRate, mde: 0.03, confidenceLevel })
      : sampleSizeContinuous({ baselineStd: control.primary.std || 1, mde: 0.1, confidenceLevel });
  const progressPct = Math.min(100, Math.round((control.n / requiredPerVariant) * 100));

  // time series: cumulative rate per variant, bucketed
  const buckets = 24;
  const minTime = events[0]?.createdAt?.getTime() ?? Date.now();
  const maxTime = events[events.length - 1]?.createdAt?.getTime() ?? Date.now();
  const span = Math.max(1, maxTime - minTime);
  const series: { t: number; [variantName: string]: number | string }[] = [];
  const variantNameById: Record<string, string> = {};
  for (const v of experiment.variants) variantNameById[v.id] = v.name;

  // cumulative counters
  const cumCount: Record<string, number> = {};
  const cumSum: Record<string, number> = {};
  for (const v of experiment.variants) {
    cumCount[v.id] = 0;
    cumSum[v.id] = 0;
  }
  let ei = 0;
  for (let b = 0; b <= buckets; b++) {
    const tBoundary = minTime + (span * b) / buckets;
    while (ei < events.length && events[ei].createdAt.getTime() <= tBoundary) {
      const e = events[ei];
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
    totalEvents: events.length,
  });
}
