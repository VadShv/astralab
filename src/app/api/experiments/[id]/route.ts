import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const experiment = await db.experiment.findUnique({
    where: { id },
    include: {
      prompt: { select: { name: true, id: true } },
      variants: {
        include: {
          version: { select: { id: true, semver: true, branch: true, commitMessage: true } },
        },
      },
    },
  });
  if (!experiment) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ experiment });
}
