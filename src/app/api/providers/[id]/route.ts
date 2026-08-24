import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, baseUrl, apiKey, kind, isActive } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (baseUrl !== undefined) data.baseUrl = baseUrl;
  if (kind !== undefined) data.kind = kind;
  if (isActive !== undefined) data.isActive = isActive;
  if (apiKey) {
    const { enc, iv } = encrypt(apiKey);
    data.apiKeyEnc = enc;
    data.apiKeyIv = iv;
  }

  try {
    const provider = await db.provider.update({ where: { id }, data });
    return NextResponse.json({ provider: { id: provider.id, name: provider.name } });
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
    await db.provider.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
