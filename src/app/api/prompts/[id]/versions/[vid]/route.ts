import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { PromptContent, PromptVariable, ModelConfig } from "@/lib/prompt";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const { vid } = await params;
  const version = await db.promptVersion.findUnique({
    where: { id: vid },
    include: {
      author: { select: { id: true, name: true, avatarColor: true } },
      tags: true,
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
      parent: { select: { id: true, semver: true, versionHash: true } },
    },
  });
  if (!version) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    version: {
      ...version,
      content: version.content as unknown as PromptContent,
      variables: version.variables as unknown as PromptVariable[],
      modelConfig: version.modelConfig as unknown as ModelConfig,
    },
  });
}
