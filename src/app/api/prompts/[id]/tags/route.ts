import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId, logAudit } from "@/lib/data";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tags = await db.tag.findMany({
    where: { promptId: id },
    include: { version: { select: { id: true, semver: true, versionHash: true } } },
  });
  return NextResponse.json({ tags });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: promptId } = await params;
  const userId = await getCurrentUserId();
  const { name, versionId } = (await req.json()) as { name: string; versionId: string };

  // upsert tag name -> version
  const existing = await db.tag.findUnique({
    where: { promptId_name: { promptId, name } },
  });
  const tag = existing
    ? await db.tag.update({ where: { id: existing.id }, data: { versionId } })
    : await db.tag.create({ data: { promptId, name, versionId } });

  await logAudit({
    projectId: (await db.prompt.findUnique({ where: { id: promptId } }))!.projectId,
    actorId: userId,
    action: "tag.moved",
    targetType: "tag",
    targetId: tag.id,
    detail: { name, versionId },
  });

  return NextResponse.json({ tag });
}
