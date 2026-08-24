import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProjectId, getCurrentUserId, logAudit } from "@/lib/data";

export async function GET(req: NextRequest) {
  const projectId = await getProjectId();
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get("tag");
  const q = searchParams.get("q");

  const prompts = await db.prompt.findMany({
    where: {
      projectId,
      archivedAt: null,
      ...(q ? { name: { contains: q } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { versions: true, experiments: true } },
      defaultModel: { select: { id: true, displayName: true } },
      activeVersions: { include: { version: true } },
      versions: {
        where: { status: "active" },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // tag filter in JS (Json column)
  const filtered = tag
    ? prompts.filter((p) => ((p.tags as string[]) ?? []).includes(tag))
    : prompts;

  const all = await db.prompt.findMany({
    where: { projectId },
    select: { tags: true },
  });
  const tagSet = new Set<string>();
  for (const p of all) {
    for (const t of (p.tags as string[]) ?? []) tagSet.add(t);
  }

  return NextResponse.json({
    prompts: filtered.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      tags: (p.tags as string[]) ?? [],
      defaultModel: p.defaultModel ? { id: p.defaultModel.id, displayName: p.defaultModel.displayName } : null,
      createdAt: p.createdAt,
      versionCount: p._count.versions,
      experimentCount: p._count.experiments,
      activeVersion: p.versions[0] ?? null,
      environments: p.activeVersions.map((av) => ({
        environment: av.environment,
        versionId: av.versionId,
        semver: av.version.semver,
        activatedAt: av.activatedAt,
      })),
    })),
    tags: [...tagSet],
  });
}

export async function POST(req: NextRequest) {
  const projectId = await getProjectId();
  const userId = await getCurrentUserId();
  const body = await req.json();
  const { name, description, tags, defaultModelId } = body;

  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  try {
    const prompt = await db.prompt.create({
      data: {
        projectId,
        name,
        description: description ?? "",
        tags: tags ?? [],
        defaultModelId: defaultModelId ?? null,
      },
    });
    await db.branch.create({ data: { promptId: prompt.id, name: "main" } });

    await logAudit({
      projectId,
      actorId: userId,
      action: "prompt.created",
      targetType: "prompt",
      targetId: prompt.id,
      detail: { name },
    });

    return NextResponse.json({ prompt }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
