import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { renderTemplate, validateVariables, type PromptContent, type PromptVariable, type ModelConfig } from "@/lib/prompt";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    versionId?: string;
    content?: PromptContent;
    variables?: PromptVariable[];
    modelConfig?: ModelConfig;
    inputs: Record<string, unknown>;
    model?: string;
  };

  let content: PromptContent;
  let variables: PromptVariable[];
  let modelConfig: ModelConfig;

  if (body.versionId) {
    const v = await db.promptVersion.findUnique({ where: { id: body.versionId } });
    if (!v) return NextResponse.json({ error: "version not found" }, { status: 404 });
    content = v.content as PromptContent;
    variables = v.variables as PromptVariable[];
    modelConfig = v.modelConfig as ModelConfig;
  } else {
    content = body.content!;
    variables = body.variables ?? [];
    modelConfig = body.modelConfig ?? { temperature: 0.2, top_p: 0.9, max_tokens: 800 };
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
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: system },
        { role: "user", content: user },
      ],
      temperature: modelConfig.temperature,
      top_p: modelConfig.top_p,
      max_tokens: modelConfig.max_tokens,
      thinking: { type: "disabled" },
    });
    const latencyMs = Date.now() - started;
    const output = completion.choices[0]?.message?.content ?? "";
    const usage = (completion as any).usage;

    return NextResponse.json({
      output,
      latencyMs,
      rendered: { system, user },
      usage: usage
        ? {
            tokensIn: usage.prompt_tokens ?? usage.promptTokens,
            tokensOut: usage.completion_tokens ?? usage.completionTokens,
            total: usage.total_tokens ?? usage.totalTokens,
          }
        : { tokensIn: Math.ceil(system.length / 4 + user.length / 4), tokensOut: Math.ceil(output.length / 4), total: 0 },
      model: body.model ?? "glm-4.6",
    });
  } catch (e: any) {
    const latencyMs = Date.now() - started;
    return NextResponse.json(
      { error: e?.message ?? "LLM call failed", latencyMs },
      { status: 500 }
    );
  }
}
