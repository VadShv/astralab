import { NextRequest, NextResponse } from "next/server";
import { listRemoteModels } from "@/lib/llm";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

/**
 * Test an OpenAI-compatible connection and list available models.
 * Body: { baseUrl, apiKey?, providerId? }
 *  - apiKey is required for new providers.
 *  - If apiKey is omitted and providerId is given, the stored (encrypted) key
 *    is decrypted and used — handy when re-testing an existing provider.
 * Always returns 200 with { ok, models?, error? } so the client can render
 * the result inline without a JSON parse failure.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  let { baseUrl, apiKey, providerId } = body as {
    baseUrl?: string;
    apiKey?: string;
    providerId?: string;
  };

  if (!baseUrl) {
    return NextResponse.json({ ok: false, error: "baseUrl обязательен" });
  }
  baseUrl = baseUrl.trim();

  // Use the stored key when re-testing an existing provider without re-entering it.
  if (!apiKey && providerId) {
    const p = await db.provider.findUnique({ where: { id: providerId } });
    if (!p) return NextResponse.json({ ok: false, error: "Провайдер не найден" });
    try {
      apiKey = decrypt(p.apiKeyEnc, p.apiKeyIv);
    } catch {
      return NextResponse.json({
        ok: false,
        error: "Не удалось расшифровать ключ (ENCRYPTION_KEY изменён?).",
      });
    }
  }

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "apiKey обязательен" });
  }

  try {
    const models = await listRemoteModels(baseUrl, apiKey);
    const ids = models
      .map((m) => m.id)
      .filter((id): id is string => !!id)
      .sort();
    return NextResponse.json({ ok: true, models: ids });
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e?.message ?? "Не удалось подключиться к провайдеру",
    });
  }
}
