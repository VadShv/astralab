import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProjectId } from "@/lib/data";

export async function GET(req: NextRequest) {
  const projectId = await getProjectId();
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const limit = Number(searchParams.get("limit") ?? 50);

  const logs = await db.auditLog.findMany({
    where: {
      projectId,
      ...(action ? { action: { contains: action } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { name: true, avatarColor: true } } },
  });

  return NextResponse.json({ logs });
}
