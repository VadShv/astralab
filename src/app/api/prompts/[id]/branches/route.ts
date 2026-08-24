import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId, logAudit } from "@/lib/data";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const branches = await db.branch.findMany({
    where: { promptId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ branches });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promptId } = await params;
  const userId = await getCurrentUserId();
  const body = await req.json();
  const { name } = body;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  try {
    const branch = await db.branch.upsert({
      where: { promptId_name: { promptId, name } },
      update: {},
      create: { promptId, name },
    });
    const prompt = await db.prompt.findUnique({ where: { id: promptId } });
    if (prompt) {
      await logAudit({
        projectId: prompt.projectId,
        actorId: userId,
        action: "branch.created",
        targetType: "branch",
        targetId: branch.id,
        detail: { name },
      });
    }
    return NextResponse.json({ branch }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
