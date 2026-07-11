import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const prompt = await db.prompt.findUnique({
    where: { id },
    include: {
      branches: true,
      tags_rel: { include: { version: true } },
      activeVersions: { include: { version: true } },
      experiments: { include: { variants: true } },
      _count: { select: { versions: true } },
    },
  });
  if (!prompt) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    prompt: {
      ...prompt,
      tags: (prompt.tags as string[]) ?? [],
    },
  });
}
