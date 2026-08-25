import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

interface SimulateBody {
  eventCount?: number;
  controlRate?: number; // 0..1 success probability for the control variant
  variantRate?: number; // 0..1 success probability for non-control variants
  latencyMin?: number; // ms
  latencyMax?: number; // ms
  costPerRequest?: number; // USD
  hoursSpan?: number; // distribute createdAt over the last N hours
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}
function randFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Generate synthetic A/B experiment events so the statistical engine can be
 * exercised without real production traffic.
 *
 * Events are assigned to variants according to the experiment's traffic split,
 * the primary metric value is sampled from the requested rates (binary metrics)
 * or ranges (continuous metrics), and createdAt is spread over the last N hours
 * so the cumulative chart looks realistic.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as SimulateBody;

  const eventCount = Math.max(1, Math.min(50000, Number(body.eventCount) || 1000));
  const controlRate = clamp01(Number(body.controlRate) ?? 0.7);
  const variantRate = clamp01(Number(body.variantRate) ?? 0.8);
  const latencyMin = Math.max(1, Math.floor(Number(body.latencyMin) ?? 200));
  const latencyMax = Math.max(latencyMin, Math.floor(Number(body.latencyMax) ?? 1500));
  const costPerRequest = Math.max(0, Number(body.costPerRequest) ?? 0.01);
  const hoursSpan = Math.max(0.1, Number(body.hoursSpan) ?? 24);

  const experiment = await db.experiment.findUnique({
    where: { id },
    include: { variants: true },
  });
  if (!experiment) {
    return NextResponse.json({ error: "Эксперимент не найден" }, { status: 404 });
  }
  if (experiment.status === "concluded") {
    return NextResponse.json(
      { error: "Эксперимент завершён — симуляция недоступна" },
      { status: 400 }
    );
  }
  if (experiment.variants.length === 0) {
    return NextResponse.json({ error: "У эксперимента нет вариантов" }, { status: 400 });
  }

  const isBinary =
    experiment.primaryMetric === "eval_pass_rate" ||
    experiment.primaryMetric === "error_rate";

  // Weighted variant selection: cumulative thresholds from trafficWeight.
  const variants = experiment.variants;
  const totalWeight = variants.reduce((s, v) => s + v.trafficWeight, 0) || 1;
  const cumWeights: number[] = [];
  let acc = 0;
  for (const v of variants) {
    acc += v.trafficWeight / totalWeight;
    cumWeights.push(acc);
  }

  const rateFor = (name: string) => (name === "control" ? controlRate : variantRate);

  const now = Date.now();
  const spanMs = hoursSpan * 3600 * 1000;
  const userIds = Array.from({ length: 50 }, (_, i) => `sim-user-${i}`);

  // Insert in batches to keep memory/transaction size bounded.
  const BATCH = 500;
  let created = 0;
  for (let off = 0; off < eventCount; off += BATCH) {
    const n = Math.min(BATCH, eventCount - off);
    const rows: Prisma.ExperimentEventCreateManyInput[] = [];
    for (let i = 0; i < n; i++) {
      // Pick a variant according to the traffic split.
      const r = Math.random();
      let vi = 0;
      while (vi < variants.length - 1 && r > cumWeights[vi]) vi++;
      const variant = variants[vi];

      // Sample the primary metric value.
      let metricValue: number;
      if (isBinary) {
        metricValue = Math.random() < rateFor(variant.name) ? 1 : 0;
      } else if (experiment.primaryMetric === "latency") {
        metricValue = randFloat(latencyMin, latencyMax);
      } else if (experiment.primaryMetric === "cost_per_request") {
        metricValue = randFloat(costPerRequest * 0.5, costPerRequest * 1.5);
      } else {
        metricValue = randFloat(0, 1);
      }

      const latencyMs = randInt(latencyMin, latencyMax);
      const costUsd = +randFloat(costPerRequest * 0.5, costPerRequest * 1.5).toFixed(6);
      const tokensIn = randInt(150, 800);
      const tokensOut = randInt(80, 600);
      const createdAt = new Date(now - Math.random() * spanMs);

      rows.push({
        experimentId: id,
        variantId: variant.id,
        userId: userIds[randInt(0, userIds.length - 1)],
        metricName: experiment.primaryMetric,
        metricValue,
        tokensIn,
        tokensOut,
        costUsd,
        latencyMs,
        evalScore: experiment.primaryMetric === "eval_pass_rate" ? metricValue : null,
        createdAt,
      });
    }
    await db.experimentEvent.createMany({ data: rows });
    created += n;
  }

  return NextResponse.json({ created, eventCount: created });
}
