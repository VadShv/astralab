import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId, logAudit } from "@/lib/data";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const body = (await req.json().catch(() => ({}))) as { variantId?: string; environment?: string };

  const experiment = await db.experiment.findUnique({
    where: { id },
    include: { prompt: true, variants: { include: { version: true } } },
  });
  if (!experiment) return NextResponse.json({ error: "not found" }, { status: 404 });

  const winnerVariant =
    experiment.variants.find((v) => v.id === body.variantId) ??
    experiment.variants.find((v) => v.id === experiment.winnerVariantId) ??
    experiment.variants[1];

  if (!winnerVariant)
    return NextResponse.json({ error: "no winner variant" }, { status: 400 });

  const env = body.environment ?? "production";

  await db.activeVersion.upsert({
    where: { promptId_environment: { promptId: experiment.promptId, environment: env } },
    update: {
      versionId: winnerVariant.versionId,
      activatedAt: new Date(),
      activatedBy: userId,
    },
    create: {
      promptId: experiment.promptId,
      environment: env,
      versionId: winnerVariant.versionId,
      activatedBy: userId,
    },
  });

  await db.experiment.update({
    where: { id },
    data: {
      status: "concluded",
      endedAt: new Date(),
      winnerVariantId: winnerVariant.id,
    },
  });

  // auto-tag the winning version
  await db.tag.upsert({
    where: { promptId_name: { promptId: experiment.promptId, name: "stable" } },
    update: { versionId: winnerVariant.versionId },
    create: { promptId: experiment.promptId, name: "stable", versionId: winnerVariant.versionId },
  });

  await logAudit({
    projectId: experiment.prompt.projectId,
    actorId: userId,
    action: "experiment.concluded",
    targetType: "experiment",
    targetId: id,
    detail: {
      winner: winnerVariant.name,
      semver: winnerVariant.version.semver,
      environment: env,
    },
  });

  return NextResponse.json({
    promoted: {
      variant: winnerVariant.name,
      versionId: winnerVariant.versionId,
      semver: winnerVariant.version.semver,
      environment: env,
    },
  });
}
