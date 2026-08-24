import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const runs = await db.evalRun.findMany({
    where: { promptId: id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    evalRuns: runs.map((r) => ({
      id: r.id,
      versionId: r.versionId,
      modelId: r.modelId,
      passRate: r.passRate,
      avgScore: r.avgScore,
      totalCount: r.totalCount,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promptId } = await params;
  const body = await req.json();
  const { versionId, modelId, passRate, avgScore, totalCount, results } = body;
  try {
    const run = await db.evalRun.create({
      data: {
        promptId,
        versionId: versionId ?? null,
        modelId: modelId ?? null,
        passRate,
        avgScore,
        totalCount,
        results: results as any,
      },
    });
    return NextResponse.json({ evalRun: run }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
