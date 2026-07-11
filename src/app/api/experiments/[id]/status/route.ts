import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId, logAudit } from "@/lib/data";
import type { ExperimentStatus } from "@/lib/prompt";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const { status } = (await req.json()) as { status: ExperimentStatus };

  const update: any = { status };
  if (status === "running") update.startedAt = new Date();
  if (status === "concluded") update.endedAt = new Date();

  const experiment = await db.experiment.update({ where: { id }, data: update });

  await logAudit({
    projectId: (await db.experiment.findUnique({ where: { id }, include: { prompt: true } }))!.prompt.projectId,
    actorId: userId,
    action: `experiment.${status}`,
    targetType: "experiment",
    targetId: id,
    detail: { name: experiment.name },
  });

  return NextResponse.json({ experiment });
}
