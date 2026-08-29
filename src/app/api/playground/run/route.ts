import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatCompletion } from "@/lib/llm";
import { renderTemplate, validateVariables, type PromptContent, type PromptVariable, type ModelConfig } from "@/lib/prompt";

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
    if (!v) return NextResponse.json({ error: "version not found" }, { status: 404 });
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

  // resolve model: run override > version override > prompt default > system default
  let resolvedModelId = body.modelId ?? versionModelId ?? promptModelId;
  if (!resolvedModelId) {
    const fallback = await db.model.findFirst({ where: { isDefault: true } });
    if (fallback) resolvedModelId = fallback.id;
  }
  if (!resolvedModelId) {
    return NextResponse.json(
      { error: "No model configured. Set a default model for the prompt or pass modelId." },
      { status: 400 }
    );
  }

  // validate required vars
  const { ok, missing } = validateVariables(variables, body.inputs);
  if (!ok) {
    return NextResponse.json({ error: `Missing required variables: ${missing.join(", ")}` }, { status: 400 });
  }

  // fill defaults
  const filled: Record<string, unknown> = {};
  for (const v of variables) {
    filled[v.name] = body.inputs[v.name] ?? v.default ?? "";
  }

  const system = renderTemplate(content.system ?? "", filled);
  const user = renderTemplate(content.user ?? "", filled);

  const started = Date.now();
  try {
    const result = await chatCompletion({
      modelId: resolvedModelId,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: modelConfig.temperature,
      top_p: modelConfig.top_p,
      max_tokens: modelConfig.max_tokens,
      stop: modelConfig.stop,
    });
    const latencyMs = Date.now() - started;

    return NextResponse.json({
      output: result.output,
      latencyMs,
      rendered: { system, user },
      usage: {
        tokensIn: result.usage.tokensIn,
        tokensOut: result.usage.tokensOut,
        total: result.usage.total,
      },
      model: result.model,
    });
  } catch (e: any) {
    const latencyMs = Date.now() - started;
    return NextResponse.json(
      { error: e?.message ?? "LLM call failed", latencyMs },
      { status: 500 }
    );
  }
}
