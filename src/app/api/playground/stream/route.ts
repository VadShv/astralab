import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { chatCompletionStream } from "@/lib/llm";
import { renderTemplate, validateVariables, type PromptContent, type PromptVariable, type ModelConfig } from "@/lib/prompt";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    versionId?: string;
    content?: PromptContent;
    variables?: PromptVariable[];
    modelConfig?: ModelConfig;
    inputs: Record<string, unknown>;
    modelId?: string;
  };

  let content: PromptContent;
  let variables: PromptVariable[];
  let modelConfig: ModelConfig;
  let versionModelId: string | null = null;
  let promptModelId: string | null = null;

  if (body.versionId) {
    const v = await db.promptVersion.findUnique({
      where: { id: body.versionId },
      include: { prompt: { select: { defaultModelId: true } } },
    });
    if (!v) {
      return new Response(JSON.stringify({ error: "version not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    content = v.content as unknown as PromptContent;
    variables = v.variables as unknown as PromptVariable[];
    modelConfig = v.modelConfig as unknown as ModelConfig;
    versionModelId = v.modelId;
    promptModelId = v.prompt.defaultModelId;
  } else {
    content = body.content!;
    variables = body.variables ?? [];
    modelConfig = body.modelConfig ?? { temperature: 0.2, top_p: 0.9, max_tokens: 800 };
  }

  const resolvedModelId = body.modelId ?? versionModelId ?? promptModelId;
  if (!resolvedModelId) {
    return new Response(
      JSON.stringify({ error: "No model configured. Set a default model for the prompt or pass modelId." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { ok, missing } = validateVariables(variables, body.inputs);
  if (!ok) {
    return new Response(
      JSON.stringify({ error: `Missing required variables: ${missing.join(", ")}` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const filled: Record<string, unknown> = {};
  for (const v of variables) {
    filled[v.name] = body.inputs[v.name] ?? v.default ?? "";
  }

  const system = renderTemplate(content.system ?? "", filled);
  const user = renderTemplate(content.user ?? "", filled);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        for await (const chunk of chatCompletionStream({
          modelId: resolvedModelId,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: modelConfig.temperature,
          top_p: modelConfig.top_p,
          max_tokens: modelConfig.max_tokens,
          stop: modelConfig.stop,
        })) {
          send(chunk);
          if (chunk.done || chunk.error) break;
        }
      } catch (e: any) {
        send({ error: e?.message ?? "stream failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
