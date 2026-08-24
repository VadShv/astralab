import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const models = await db.model.findMany({
    include: { provider: { select: { id: true, name: true, isActive: true } } },
    orderBy: [{ isDefault: "desc" }, { displayName: "asc" }],
  });
  return NextResponse.json({ models });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { providerId, externalId, displayName, contextWindow, isDefault } = body;
  if (!providerId || !externalId || !displayName)
    return NextResponse.json({ error: "providerId, externalId, displayName required" }, { status: 400 });

  try {
    const model = await db.$transaction(async (tx) => {
      if (isDefault) {
        await tx.model.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }
      return tx.model.create({
        data: {
          providerId,
          externalId,
          displayName,
          contextWindow: contextWindow ?? null,
          isDefault: isDefault ?? false,
        },
      });
    });
    return NextResponse.json({ model }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
