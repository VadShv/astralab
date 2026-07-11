import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId, logAudit } from "@/lib/data";
import { computeVersionHash, bumpSemver, type PromptContent, type PromptVariable, type ModelConfig } from "@/lib/prompt";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const versions = await db.promptVersion.findMany({
    where: { promptId: id },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { id: true, name: true, avatarColor: true } },
      tags: { select: { id: true, name: true } },
    },
  });

  const branches = await db.branch.findMany({ where: { promptId: id } });

  return NextResponse.json({
    versions: versions.map((v) => ({
      id: v.id,
      versionHash: v.versionHash,
      semver: v.semver,
      branch: v.branch,
      content: v.content as PromptContent,
      variables: v.variables as PromptVariable[],
      modelConfig: v.modelConfig as ModelConfig,
      parentVersionId: v.parentVersionId,
      commitMessage: v.commitMessage,
      author: v.author,
      status: v.status,
      createdAt: v.createdAt,
      tags: v.tags,
    })),
    branches: branches.map((b) => ({ id: b.id, name: b.name, headVersionId: b.headVersionId })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promptId } = await params;
  const userId = await getCurrentUserId();
  const body = await req.json();
  const {
    content,
    variables,
    modelConfig,
    branch = "main",
    parentVersionId,
    commitMessage,
    semverKind,
    semver,
  } = body as {
    content: PromptContent;
    variables: PromptVariable[];
    modelConfig: ModelConfig;
    branch?: string;
    parentVersionId?: string | null;
    commitMessage: string;
    semverKind?: "patch" | "minor" | "major";
    semver?: string;
  };

  if (!content || !commitMessage)
    return NextResponse.json({ error: "content + commitMessage required" }, { status: 400 });

  const versionHash = computeVersionHash({ content, variables, modelConfig });

  // dedupe: if hash exists on this prompt, return it
  const existing = await db.promptVersion.findUnique({ where: { versionHash } });
  if (existing) {
    return NextResponse.json({ version: existing, reused: true });
  }

  // resolve semver
  let finalSemver = semver;
  if (!finalSemver) {
    const parent = parentVersionId
      ? await db.promptVersion.findUnique({ where: { id: parentVersionId } })
      : await db.promptVersion.findFirst({
          where: { promptId, branch },
          orderBy: { createdAt: "desc" },
        });
    finalSemver = bumpSemver(parent?.semver ?? "0.0.0", semverKind ?? "patch");
  }

  // ensure branch exists
  const branchRec = await db.branch.upsert({
    where: { promptId_name: { promptId, name: branch } },
    update: {},
    create: { promptId, name: branch },
  });

  const version = await db.promptVersion.create({
    data: {
      promptId,
      versionHash,
      semver: finalSemver,
      branch,
      content: content as any,
      variables: variables as any,
      modelConfig: modelConfig as any,
      parentVersionId: parentVersionId ?? null,
      commitMessage,
      authorId: userId,
      status: "draft",
    },
  });

  await db.branch.update({
    where: { id: branchRec.id },
    data: { headVersionId: version.id },
  });

  await logAudit({
    projectId: (await db.prompt.findUnique({ where: { id: promptId } }))!.projectId,
    actorId: userId,
    action: "version.created",
    targetType: "prompt_version",
    targetId: version.id,
    detail: { semver: finalSemver, branch, commitMessage },
  });

  return NextResponse.json({ version }, { status: 201 });
}
