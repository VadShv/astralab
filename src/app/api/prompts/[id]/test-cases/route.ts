import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const testCases = await db.testCase.findMany({
    where: { promptId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    testCases: testCases.map((tc) => ({
      id: tc.id,
      name: tc.name,
      inputs: tc.inputs,
      createdAt: tc.createdAt,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: promptId } = await params;
  const body = await req.json();
  const { name, inputs } = body;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  try {
    const tc = await db.testCase.create({
      data: { promptId, name, inputs: inputs ?? {} },
    });
    return NextResponse.json({ testCase: tc }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
