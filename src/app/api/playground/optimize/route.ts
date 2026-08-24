import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatCompletion } from "@/lib/llm";
import type { PromptContent, PromptVariable } from "@/lib/prompt";

export const runtime = "nodejs";

async function resolveOptimizeModelId(): Promise<string | null> {
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
    content: PromptContent;
    variables: PromptVariable[];
    sampleOutput?: string;
  };

  if (!body.content?.system && !body.content?.user) {
    return NextResponse.json({ error: "Prompt content required" }, { status: 400 });
  }

  const modelId = await resolveOptimizeModelId();
  if (!modelId) {
    return NextResponse.json({ error: "No model configured. Add a model in Settings." }, { status: 400 });
  }

  const varList = (body.variables ?? []).map((v) => `{{${v.name}}} (${v.type}${v.required ? ", required" : ""})`).join(", ") || "none";

  const metaSystem = `You are a world-class prompt engineering expert. You analyze prompts for LLMs and suggest concrete improvements.

Your task:
1. Analyze the given prompt for weaknesses: ambiguity, missing constraints, poor output format instructions, lack of examples, missing edge case handling, tone issues, etc.
2. Suggest exactly 3 improved versions, each with a different focus (e.g., "precision", "clarity", "robustness").

Respond ONLY with valid JSON (no markdown):
{
  "analysis": "2-3 sentences identifying the main weaknesses",
  "suggestions": [
    {
      "title": "short title for this variant",
      "rationale": "1 sentence explaining what this variant improves",
      "system": "the improved system message (full text)",
      "user": "the improved user template (full text, keep {{variables}} intact)"
    }
  ]
}

CRITICAL: Keep all {{variable}} placeholders intact in the improved versions. Do not remove or rename variables.`;

  const metaUser = `CURRENT PROMPT:

System message:
${body.content.system ?? "(empty)"}

User template:
${body.content.user ?? "(empty)"}

Variables: ${varList}

${body.sampleOutput ? `SAMPLE OUTPUT (from a recent run):\n${body.sampleOutput.slice(0, 1500)}\n` : ""}
Analyze this prompt and suggest 3 improved versions.`;

  try {
    const result = await chatCompletion({
      modelId,
      messages: [
        { role: "system", content: metaSystem },
        { role: "user", content: metaUser },
      ],
      temperature: 0.4,
      max_tokens: 3000,
    });

    // Extract JSON from response
    const m = result.output.match(/\{[\s\S]*\}/);
    let parsed: any = {};
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        return NextResponse.json({
          analysis: "Could not parse LLM response. Raw output below.",
          suggestions: [],
          raw: result.output,
        });
      }
    }

    return NextResponse.json({
      analysis: parsed.analysis ?? "",
      suggestions: (parsed.suggestions ?? []).map((s: any) => ({
        title: s.title ?? "Variant",
        rationale: s.rationale ?? "",
        system: s.system ?? "",
        user: s.user ?? "",
      })),
      raw: result.output,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "optimization failed" }, { status: 500 });
  }
}
