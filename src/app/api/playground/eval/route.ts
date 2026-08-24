import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatCompletion } from "@/lib/llm";

/** Resolve the judge model: org setting > default model > first available. */
async function resolveJudgeModelId(): Promise<string | null> {
  const project = await db.project.findFirst({ include: { organization: true } });
  const orgJudge = project?.organization?.judgeModelId;
  if (orgJudge) return orgJudge;
  const def = await db.model.findFirst({ where: { isDefault: true } });
  if (def) return def.id;
  const any = await db.model.findFirst();
  return any?.id ?? null;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    input: string;
    output: string;
    criteria?: string;
    scale?: "pass_fail" | "1_5" | "0_1";
  };

  const scale = body.scale ?? "pass_fail";
  const criteria = body.criteria ?? "Relevance, accuracy, and tone. Does the response directly answer the input correctly and professionally?";

  const scaleInstruction =
    scale === "pass_fail"
      ? '"score": 1.0 (pass) or 0.0 (fail)'
      : scale === "1_5"
        ? '"score": a number from 1 to 5 (integers)'
        : '"score": a float from 0.0 to 1.0';

  const judgeSystem = `You are a strict LLM evaluator (LLM-as-judge). Evaluate the model's response against the input using these criteria:
${criteria}

Respond ONLY with JSON: {${scaleInstruction}, "reason": "<one concise sentence>"}`;

  const judgeUser = `Input:
${body.input}

Response to evaluate:
${body.output}`;

  const judgeModelId = await resolveJudgeModelId();
  if (!judgeModelId) {
    return NextResponse.json({ error: "No judge model configured. Add a model in Settings." }, { status: 400 });
  }

  try {
    const result = await chatCompletion({
      modelId: judgeModelId,
      messages: [
        { role: "system", content: judgeSystem },
        { role: "user", content: judgeUser },
      ],
      temperature: 0,
    });
    const raw = result.output;
    // extract JSON
    const m = raw.match(/\{[\s\S]*\}/);
    let parsed: { score?: number; reason?: string } = {};
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        parsed = { reason: raw };
      }
    }
    return NextResponse.json({
      score: typeof parsed.score === "number" ? parsed.score : 0,
      reason: parsed.reason ?? raw,
      raw,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "eval failed" }, { status: 500 });
  }
}
