import { db } from "./db";
import { decrypt } from "./crypto";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionParams {
  modelId: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stop?: string[];
  signal?: AbortSignal;
}

export interface ChatCompletionResult {
  output: string;
  usage: { tokensIn: number; tokensOut: number; total: number };
  model: string;
  raw: unknown;
}

/** Load a Model + its Provider from DB and decrypt the API key. */
export async function resolveModel(modelId: string) {
  const model = await db.model.findUnique({
    where: { id: modelId },
    include: { provider: true },
  });
  if (!model) throw new Error(`Model ${modelId} not found`);
  if (!model.provider.isActive) throw new Error(`Provider ${model.provider.name} is inactive`);
  const apiKey = decrypt(model.provider.apiKeyEnc, model.provider.apiKeyIv);
  return { model, provider: model.provider, apiKey };
}

/** Call an OpenAI-compatible /chat/completions endpoint. */
export async function chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
  const { model, provider, apiKey } = await resolveModel(params.modelId);
  const url = `${provider.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body: Record<string, unknown> = {
    model: model.externalId,
    messages: params.messages,
  };
  if (params.temperature !== undefined) body.temperature = params.temperature;
  if (params.top_p !== undefined) body.top_p = params.top_p;
  if (params.max_tokens !== undefined) body.max_tokens = params.max_tokens;
  if (params.stop) body.stop = params.stop;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: params.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  const output = data.choices?.[0]?.message?.content ?? "";
  const usage = data.usage;
  return {
    output,
    usage: {
      tokensIn: usage?.prompt_tokens ?? usage?.promptTokens ?? 0,
      tokensOut: usage?.completion_tokens ?? usage?.completionTokens ?? 0,
      total: usage?.total_tokens ?? usage?.totalTokens ?? 0,
    },
    model: model.externalId,
    raw: data,
  };
}

/** List models from a remote OpenAI-compatible /models endpoint (for connection test). */
export async function listRemoteModels(
  baseUrl: string,
  apiKey: string
): Promise<{ id: string }[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/models`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`List models failed (${res.status}): ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  return (data.data ?? data.models ?? []) as { id: string }[];
}
