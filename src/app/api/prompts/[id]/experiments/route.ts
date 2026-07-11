import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId, logAudit } from "@/lib/data";
import type { TrafficSplit, GuardrailMetric } from "@/lib/prompt";
import { sampleSizeBinary } from "@/lib/stats";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: promptId } = await params;
  const experiments = await db.experiment.findMany({
    where: { promptId },
    orderBy: { createdAt: "desc" },
    include: { variants: { include: { version: { select: { semver: true, branch: true } } } } },
  });
  return NextResponse.json({ experiments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: promptId } = await params;
  const userId = await getCurrentUserId();
  const body = (await req.json()) as {
    name: string;
    hypothesis: string;
    trafficSplit: TrafficSplit;
    primaryMetric: string;
    confidenceLevel?: number;
    minSampleSize?: number;
    guardrailMetrics?: GuardrailMetric[];
    variants: { name: string; versionId: string; trafficWeight: number }[];
  };

  if (!body.variants || body.variants.length < 2)
    return NextResponse.json({ error: "need >=2 variants" }, { status: 400 });

  const experiment = await db.experiment.create({
    data: {
      promptId,
      name: body.name,
      hypothesis: body.hypothesis,
      trafficSplit: body.trafficSplit as any,
      targetingRules: {} as any,
      minSampleSize: body.minSampleSize ?? sampleSizeBinary({ baselineRate: 0.7, mde: 0.03, confidenceLevel: body.confidenceLevel ?? 0.95 }),
      confidenceLevel: body.confidenceLevel ?? 0.95,
      primaryMetric: body.primaryMetric,
      guardrailMetrics: (body.guardrailMetrics ?? []) as any,
      status: "draft",
    },
  });

  for (const v of body.variants) {
    await db.experimentVariant.create({
      data: { experimentId: experiment.id, name: v.name, versionId: v.versionId, trafficWeight: v.trafficWeight },
    });
  }

  await logAudit({
    projectId: (await db.prompt.findUnique({ where: { id: promptId } }))!.projectId,
    actorId: userId,
    action: "experiment.created",
    targetType: "experiment",
    targetId: experiment.id,
    detail: { name: body.name },
  });

  return NextResponse.json({ experiment }, { status: 201 });
}
