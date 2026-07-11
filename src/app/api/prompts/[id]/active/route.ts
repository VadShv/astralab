import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId, logAudit } from "@/lib/data";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: promptId } = await params;
  const { searchParams } = new URL(req.url);
  const env = searchParams.get("env") ?? "production";
  const active = await db.activeVersion.findUnique({
    where: { promptId_environment: { promptId, environment: env } },
    include: { version: true, activator: { select: { name: true, avatarColor: true } } },
  });
  return NextResponse.json({ active });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: promptId } = await params;
  const userId = await getCurrentUserId();
  const { versionId, environment } = (await req.json()) as { versionId: string; environment: string };

  const active = await db.activeVersion.upsert({
    where: { promptId_environment: { promptId, environment } },
    update: { versionId, activatedAt: new Date(), activatedBy: userId },
    create: { promptId, environment, versionId, activatedBy: userId },
  });

  const version = await db.promptVersion.findUnique({ where: { id: versionId } });

  await logAudit({
    projectId: (await db.prompt.findUnique({ where: { id: promptId } }))!.projectId,
    actorId: userId,
    action: "version.activated",
    targetType: "prompt_version",
    targetId: versionId,
    detail: { environment, semver: version?.semver },
  });

  return NextResponse.json({ active });
}
