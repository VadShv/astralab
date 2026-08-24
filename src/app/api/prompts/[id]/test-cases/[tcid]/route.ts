import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tcid: string }> }
) {
  const { tcid } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.inputs !== undefined) data.inputs = body.inputs;
  try {
    const tc = await db.testCase.update({ where: { id: tcid }, data });
    return NextResponse.json({ testCase: tc });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tcid: string }> }
) {
  const { tcid } = await params;
  try {
    await db.testCase.delete({ where: { id: tcid } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
