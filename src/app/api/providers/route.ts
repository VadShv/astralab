import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encrypt, maskKey, decrypt } from "@/lib/crypto";

export async function GET() {
  const providers = await db.provider.findMany({
    include: { _count: { select: { models: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    providers: providers.map((p) => {
      let apiKeyMask = "••••";
      try {
        apiKeyMask = maskKey(decrypt(p.apiKeyEnc, p.apiKeyIv));
      } catch {
        /* key rotation / env mismatch */
      }
      return {
        id: p.id,
        name: p.name,
        baseUrl: p.baseUrl,
        kind: p.kind,
        isActive: p.isActive,
        createdAt: p.createdAt,
        modelCount: p._count.models,
        apiKeyMask,
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, baseUrl, apiKey, kind, isActive } = body;
  if (!name || !baseUrl || !apiKey)
    return NextResponse.json({ error: "name, baseUrl, apiKey required" }, { status: 400 });
  try {
    const { enc, iv } = encrypt(apiKey);
    const provider = await db.provider.create({
      data: {
        name,
        baseUrl,
        apiKeyEnc: enc,
        apiKeyIv: iv,
        kind: kind ?? "openai_compatible",
        isActive: isActive ?? true,
      },
    });
    return NextResponse.json({ provider: { id: provider.id, name: provider.name } }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
