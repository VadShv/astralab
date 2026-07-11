import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId, logAudit } from "@/lib/data";
import type { VersionStatus } from "@/lib/prompt";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const { id: promptId, vid } = await params;
  const userId = await getCurrentUserId();
  const { status } = (await req.json()) as { status: VersionStatus };

  const updated = await db.promptVersion.update({
    where: { id: vid },
    data: { status },
  });

  await logAudit({
    projectId: (await db.prompt.findUnique({ where: { id: promptId } }))!.projectId,
    actorId: userId,
    action: "version.status_changed",
    targetType: "prompt_version",
    targetId: vid,
    detail: { status, semver: updated.semver },
  });

  return NextResponse.json({ version: updated });
}
