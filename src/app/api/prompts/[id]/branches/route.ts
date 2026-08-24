import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const branches = await db.branch.findMany({
    where: { promptId: id },
  });
  return NextResponse.json({ branches });
}
