import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId, logAudit } from "@/lib/data";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: promptId } = await params;
  const userId = await getCurrentUserId();
  const { environment, targetVersionId } = (await req.json()) as {
    environment: string;
    targetVersionId?: string;
  };

  const prompt = await db.prompt.findUnique({ where: { id: promptId } });
  if (!prompt) return NextResponse.json({ error: "not found" }, { status: 404 });

  // resolve target: explicit, else previous active version (find last-but-one)
  const current = await db.activeVersion.findUnique({
    where: { promptId_environment: { promptId, environment } },
    include: { version: true },
  });

  let targetId = targetVersionId;
  if (!targetId) {
    // pick the most recent version that is NOT the current active, on main branch
    const candidates = await db.promptVersion.findMany({
      where: { promptId, branch: "main", id: { not: current?.versionId ?? "" } },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    targetId = candidates[0]?.id;
  }
  if (!targetId) return NextResponse.json({ error: "no rollback target" }, { status: 400 });

  await db.activeVersion.upsert({
    where: { promptId_environment: { promptId, environment } },
    update: { versionId: targetId, activatedAt: new Date(), activatedBy: userId },
    create: { promptId, environment, versionId: targetId, activatedBy: userId },
  });

  const target = await db.promptVersion.findUnique({ where: { id: targetId } });

  await logAudit({
    projectId: prompt.projectId,
    actorId: userId,
    action: "rollback.triggered",
    targetType: "prompt_version",
    targetId: targetId,
    detail: {
      promptId: prompt.id,
      environment,
      fromSemver: current?.version?.semver,
      toSemver: target?.semver,
    },
  });

  return NextResponse.json({ rolledBackTo: target });
}
