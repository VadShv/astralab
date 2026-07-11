import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lineDiff, type PromptContent } from "@/lib/prompt";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> }
) {
  const { vid } = await params;
  const { searchParams } = new URL(req.url);
  const against = searchParams.get("against"); // version id to diff against
  if (!against)
    return NextResponse.json({ error: "?against=<versionId> required" }, { status: 400 });

  const [a, b] = await Promise.all([
    db.promptVersion.findUnique({ where: { id: against } }),
    db.promptVersion.findUnique({ where: { id: vid } }),
  ]);
  if (!a || !b) return NextResponse.json({ error: "version not found" }, { status: 404 });

  const ac = a.content as PromptContent;
  const bc = b.content as PromptContent;

  return NextResponse.json({
    from: { id: a.id, semver: a.semver, branch: a.branch },
    to: { id: b.id, semver: b.semver, branch: b.branch },
    diffs: {
      system: lineDiff(ac.system ?? "", bc.system ?? ""),
      user: lineDiff(ac.user ?? "", bc.user ?? ""),
    },
    modelConfigChanged: JSON.stringify(a.modelConfig) !== JSON.stringify(b.modelConfig),
    fromModelConfig: a.modelConfig,
    toModelConfig: b.modelConfig,
  });
}
