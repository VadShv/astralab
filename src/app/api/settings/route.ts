import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

async function getOrg() {
  const project = await db.project.findFirst({ include: { organization: true } });
  return project?.organization ?? null;
}

export async function GET() {
  const org = await getOrg();
  const judgeModel = org?.judgeModelId
    ? await db.model.findUnique({
        where: { id: org.judgeModelId },
        include: { provider: { select: { name: true } } },
      })
    : null;
  return NextResponse.json({
    judgeModelId: org?.judgeModelId ?? null,
    judgeModel: judgeModel
      ? { id: judgeModel.id, displayName: judgeModel.displayName, providerName: judgeModel.provider.name }
      : null,
  });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { judgeModelId } = body;
  const org = await getOrg();
  if (!org) return NextResponse.json({ error: "no organization found" }, { status: 404 });
  try {
    const updated = await db.organization.update({
      where: { id: org.id },
      data: { judgeModelId: judgeModelId ?? null },
    });
    return NextResponse.json({ judgeModelId: updated.judgeModelId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
