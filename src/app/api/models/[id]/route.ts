import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { displayName, contextWindow, isDefault } = body;

  try {
    const model = await db.$transaction(async (tx) => {
      if (isDefault === true) {
        await tx.model.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }
      const data: Record<string, unknown> = {};
      if (displayName !== undefined) data.displayName = displayName;
      if (contextWindow !== undefined) data.contextWindow = contextWindow;
      if (isDefault !== undefined) data.isDefault = isDefault;
      return tx.model.update({ where: { id }, data });
    });
    return NextResponse.json({ model });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await db.model.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
