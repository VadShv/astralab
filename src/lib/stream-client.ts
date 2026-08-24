export interface RunResult {
  output: string;
  streaming: boolean;
  usage?: { tokensIn: number; tokensOut: number; total: number };
  latencyMs?: number;
  model?: string;
  error?: string;
}

/** Read an SSE stream from /api/playground/stream and invoke callbacks. */
export async function streamRun(
  body: Record<string, unknown>,
  cb: {
    onToken: (t: string) => void;
    onDone: (usage: any, model: string) => void;
    onError: (e: string) => void;
  },
  signal?: AbortSignal
) {
  try {
    const res = await fetch("/api/playground/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      cb.onError(data.error ?? `HTTP ${res.status}`);
      return;
    }
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const evt of events) {
        const line = evt.trim();
        if (!line.startsWith("data: ")) continue;
        try {
          const chunk = JSON.parse(line.slice(6));
          if (chunk.token) cb.onToken(chunk.token);
          if (chunk.done) cb.onDone(chunk.usage, chunk.model);
          if (chunk.error) cb.onError(chunk.error);
        } catch {
          /* skip */
        }
      }
    }
  } catch (e: any) {
    if (e?.name !== "AbortError") cb.onError(e?.message ?? "stream error");
  }
}
