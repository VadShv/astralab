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
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
  } catch (e: any) {
    throw new Error(
      `Не удалось подключиться к ${url}. Проверьте baseUrl и сетевую доступность (${e?.message ?? "network error"}).`
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const ct = res.headers.get("content-type") ?? "";
    const isHtml = ct.includes("text/html") || /^\s*(<!doctype|<html)/i.test(text);
    if (isHtml) {
      throw new Error(
        `baseUrl вернул HTML-страницу (HTTP ${res.status}), а не JSON API. Возможные причины: (1) baseUrl указывает на сайт/приложение, а не на API провайдера; (2) неверный baseUrl — провайдер перенаправил на маркетинг. Для Cloud.ru используйте: https://foundation-models.api.cloud.ru/v1`
      );
    }
    if (res.status === 404) {
      throw new Error(
        `endpoint /models не найден (404). Проверьте, что baseUrl указывает на корень API нужной версии (например, https://foundation-models.api.cloud.ru/v1), а не на сайт или приложение.`
      );
    }
    throw new Error(`List models failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.data ?? data.models ?? []) as { id: string }[];
}

export interface StreamChunk {
  token?: string;
  done?: boolean;
  usage?: { tokensIn: number; tokensOut: number; total: number };
  model?: string;
  error?: string;
}

/**
 * Stream a chat completion from an OpenAI-compatible endpoint.
 * Yields { token } chunks as tokens arrive, then a final { done, usage, model } chunk.
 * Falls back to a single-chunk non-streaming response if the provider doesn't support SSE.
 */
export async function* chatCompletionStream(
  params: ChatCompletionParams
): AsyncGenerator<StreamChunk> {
  const { model, provider, apiKey } = await resolveModel(params.modelId);
  const url = `${provider.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body: Record<string, unknown> = {
    model: model.externalId,
    messages: params.messages,
    stream: true,
  };
  if (params.temperature !== undefined) body.temperature = params.temperature;
  if (params.top_p !== undefined) body.top_p = params.top_p;
  if (params.max_tokens !== undefined) body.max_tokens = params.max_tokens;
  if (params.stop) body.stop = params.stop;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: params.signal,
    });
  } catch (e: any) {
    yield { error: e?.message ?? "stream request failed" };
    return;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    yield { error: `LLM request failed (${res.status}): ${text.slice(0, 500)}` };
    return;
  }

  // If the response is not SSE (no stream header), fall back to JSON parsing.
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream") || !res.body) {
    const data = await res.json();
    const output = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage;
    if (output) yield { token: output };
    yield {
      done: true,
      model: model.externalId,
      usage: {
        tokensIn: usage?.prompt_tokens ?? usage?.promptTokens ?? 0,
        tokensOut: usage?.completion_tokens ?? usage?.completionTokens ?? 0,
        total: usage?.total_tokens ?? usage?.totalTokens ?? 0,
      },
    };
    return;
  }

  // Parse SSE stream
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalUsage: StreamChunk["usage"];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") {
          yield { done: true, model: model.externalId, usage: finalUsage };
          return;
        }
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield { token: delta };
          if (json.usage) {
            finalUsage = {
              tokensIn: json.usage.prompt_tokens ?? json.usage.promptTokens ?? 0,
              tokensOut: json.usage.completion_tokens ?? json.usage.completionTokens ?? 0,
              total: json.usage.total_tokens ?? json.usage.totalTokens ?? 0,
            };
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
    // Stream ended without [DONE]
    yield { done: true, model: model.externalId, usage: finalUsage };
  } catch (e: any) {
    yield { error: e?.message ?? "stream read error" };
  }
}
