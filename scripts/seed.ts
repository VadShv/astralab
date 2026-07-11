import { db } from "../src/lib/db";
import { computeVersionHash } from "../src/lib/prompt";

async function main() {
  console.log("Resetting database...");
  await db.experimentEvent.deleteMany();
  await db.experimentVariant.deleteMany();
  await db.experiment.deleteMany();
  await db.comment.deleteMany();
  await db.activeVersion.deleteMany();
  await db.tag.deleteMany();
  await db.branch.deleteMany();
  await db.promptVersion.deleteMany();
  await db.prompt.deleteMany();
  await db.auditLog.deleteMany();
  await db.project.deleteMany();
  await db.organization.deleteMany();
  await db.user.deleteMany();

  console.log("Creating users...");
  const users = await Promise.all([
    db.user.create({ data: { email: "elena@acme.ai", name: "Elena Vasquez", avatarColor: "#10b981", role: "admin" } }),
    db.user.create({ data: { email: "marcus@acme.ai", name: "Marcus Chen", avatarColor: "#f59e0b", role: "reviewer" } }),
    db.user.create({ data: { email: "priya@acme.ai", name: "Priya Nair", avatarColor: "#06b6d4", role: "developer" } }),
    db.user.create({ data: { email: "tom@acme.ai", name: "Tom Becker", avatarColor: "#a855f7", role: "developer" } }),
  ]);
  const [elena, marcus, priya, tom] = users;

  console.log("Creating org & project...");
  const org = await db.organization.create({
    data: { name: "Acme AI", slug: "acme-ai", plan: "growth" },
  });
  const project = await db.project.create({
    data: {
      organizationId: org.id,
      name: "ATS Platform",
      slug: "ats-platform",
      description: "AI-powered applicant tracking & resume screening.",
    },
  });

  const baseConfig = { temperature: 0.2, top_p: 0.9, max_tokens: 800 };

  // ---------- Prompt 1: resume-screener ----------
  console.log("Creating resume-screener prompt + version DAG...");
  const resumePrompt = await db.prompt.create({
    data: {
      projectId: project.id,
      name: "resume-screener",
      description: "Screens candidate resumes against job requirements and returns a structured score.",
      tags: ["ats", "screening", "production"],
      defaultModel: "glm-4.6",
    },
  });

  const r_v1_content = {
    system: "You are an expert technical recruiter. Evaluate the candidate's resume against the job requirements objectively.",
    user: `Candidate: {{candidate_name}}
Applying for: {{job_title}}

Resume:
{{resume}}

Requirements:
{{#requirements}}- {{this}}
{{/requirements}}

Analyze the fit and respond ONLY with JSON:
{"score": <0-100>, "recommendation": "advance" | "reject" | "maybe", "reasons": ["..."]}`,
  };
  const r_v1_vars = [
    { name: "candidate_name", type: "string", required: true, description: "Full name of the candidate" },
    { name: "job_title", type: "string", required: true, description: "Role being applied for" },
    { name: "resume", type: "string", required: true, description: "Full resume text" },
    { name: "requirements", type: "object", required: true, description: "List of job requirements" },
  ];
  const r_v1 = await db.promptVersion.create({
    data: {
      promptId: resumePrompt.id,
      versionHash: computeVersionHash({ content: r_v1_content, variables: r_v1_vars, modelConfig: baseConfig }),
      semver: "1.0.0",
      branch: "main",
      content: r_v1_content,
      variables: r_v1_vars,
      modelConfig: baseConfig,
      commitMessage: "Initial resume screening prompt",
      authorId: elena.id,
      status: "deprecated",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 28),
    },
  });

  const r_v11_content = {
    system: `You are an expert technical recruiter for a high-growth AI company.
Evaluate the candidate's resume against the job requirements with rigor.
Apply the rubric:
- Skills match (40%): exact + adjacent skills
- Experience relevance (30%): domain, scope, impact
- Signals (20%): promotions, ownership, measurable outcomes
- Red flags (10%): gaps, job-hopping, vague claims

Be concise and evidence-based. Never invent facts not in the resume.`,
    user: `Candidate: {{candidate_name}}
Applying for: {{job_title}}

Resume:
{{resume}}

Requirements:
{{#requirements}}- {{this}}
{{/requirements}}

Respond ONLY with this JSON schema:
{"score": <0-100>, "recommendation": "advance" | "reject" | "maybe", "top_reasons": ["..."], "concerns": ["..."]}`,
  };
  const r_v11 = await db.promptVersion.create({
    data: {
      promptId: resumePrompt.id,
      versionHash: computeVersionHash({ content: r_v11_content, variables: r_v1_vars, modelConfig: { ...baseConfig, temperature: 0.15 } }),
      semver: "1.1.0",
      branch: "main",
      content: r_v11_content,
      variables: r_v1_vars,
      modelConfig: { ...baseConfig, temperature: 0.15 },
      parentVersionId: r_v1.id,
      commitMessage: "Add scoring rubric + concerns field; lower temperature for consistency",
      authorId: priya.id,
      status: "active",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
    },
  });

  const r_v2_content = {
    system: `You are a thoughtful, encouraging technical recruiter for a high-growth AI company.
Evaluate the candidate's resume against the job requirements with rigor AND warmth.
Use the rubric:
- Skills match (40%)
- Experience relevance (30%)
- Signals (20%)
- Red flags (10%)

Frame concerns constructively. Be concise and evidence-based. Never invent facts.`,
    user: `Candidate: {{candidate_name}}
Applying for: {{job_title}}

Resume:
{{resume}}

Requirements:
{{#requirements}}- {{this}}
{{/requirements}}

Respond ONLY with this JSON schema:
{"score": <0-100>, "recommendation": "advance" | "reject" | "maybe", "top_reasons": ["..."], "concerns": ["..."], "encouragement": "one-sentence note to candidate"}`,
  };
  const r_v2 = await db.promptVersion.create({
    data: {
      promptId: resumePrompt.id,
      versionHash: computeVersionHash({ content: r_v2_content, variables: r_v1_vars, modelConfig: { ...baseConfig, temperature: 0.2 } }),
      semver: "1.2.0",
      branch: "experiment/tone-v2",
      content: r_v2_content,
      variables: r_v1_vars,
      modelConfig: { ...baseConfig, temperature: 0.2 },
      parentVersionId: r_v11.id,
      commitMessage: "Warm tone variant + candidate encouragement note",
      authorId: tom.id,
      status: "review",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    },
  });

  const r_dev_content = { ...r_v11_content, system: r_v11_content.system + "\n- Reject resumes missing measurable outcomes." };
  const r_dev = await db.promptVersion.create({
    data: {
      promptId: resumePrompt.id,
      versionHash: computeVersionHash({ content: r_dev_content, variables: r_v1_vars, modelConfig: { ...baseConfig, temperature: 0.15 } }),
      semver: "1.1.1",
      branch: "dev",
      content: r_dev_content,
      variables: r_v1_vars,
      modelConfig: { ...baseConfig, temperature: 0.15 },
      parentVersionId: r_v11.id,
      commitMessage: "Hard reject on missing measurable outcomes",
      authorId: priya.id,
      status: "draft",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
  });

  await db.branch.createMany({
    data: [
      { promptId: resumePrompt.id, name: "main", headVersionId: r_v11.id },
      { promptId: resumePrompt.id, name: "dev", headVersionId: r_dev.id },
      { promptId: resumePrompt.id, name: "experiment/tone-v2", headVersionId: r_v2.id },
    ],
  });
  await db.tag.createMany({
    data: [
      { promptId: resumePrompt.id, name: "v1.0.0", versionId: r_v1.id },
      { promptId: resumePrompt.id, name: "stable", versionId: r_v11.id },
      { promptId: resumePrompt.id, name: "hotfix-2026-07", versionId: r_v11.id },
    ],
  });
  await db.activeVersion.createMany({
    data: [
      { promptId: resumePrompt.id, environment: "development", versionId: r_dev.id, activatedBy: priya.id },
      { promptId: resumePrompt.id, environment: "staging", versionId: r_v11.id, activatedBy: marcus.id },
      { promptId: resumePrompt.id, environment: "production", versionId: r_v11.id, activatedBy: elena.id },
    ],
  });
  await db.comment.create({
    data: { versionId: r_v2.id, authorId: marcus.id, body: "Love the encouragement note. Worried it inflates token cost though — can we make it optional?" },
  });

  // ---------- Prompt 2: support-classifier ----------
  console.log("Creating support-classifier prompt...");
  const supportPrompt = await db.prompt.create({
    data: {
      projectId: project.id,
      name: "support-classifier",
      description: "Routes inbound support tickets to the correct queue.",
      tags: ["support", "routing"],
      defaultModel: "glm-4.6",
    },
  });
  const s_content = {
    system: "You classify customer support messages into exactly one category.",
    user: `Message: {{message}}
Categories: billing, bug, feature_request, account, other
Respond with JSON: {"category": "<one>", "urgency": "low" | "medium" | "high", "summary": "<=12 words"}`,
  };
  const s_vars = [{ name: "message", type: "string", required: true, description: "Inbound support message" }];
  const s_v1 = await db.promptVersion.create({
    data: {
      promptId: supportPrompt.id,
      versionHash: computeVersionHash({ content: s_content, variables: s_vars, modelConfig: baseConfig }),
      semver: "2.0.0",
      branch: "main",
      content: s_content,
      variables: s_vars,
      modelConfig: baseConfig,
      commitMessage: "Migrated classifier to structured JSON output",
      authorId: marcus.id,
      status: "active",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
    },
  });
  await db.branch.create({ data: { promptId: supportPrompt.id, name: "main", headVersionId: s_v1.id } });
  await db.activeVersion.createMany({
    data: [
      { promptId: supportPrompt.id, environment: "production", versionId: s_v1.id, activatedBy: elena.id },
      { promptId: supportPrompt.id, environment: "staging", versionId: s_v1.id },
    ],
  });

  // ---------- Prompt 3: code-reviewer ----------
  console.log("Creating code-reviewer prompt...");
  const codePrompt = await db.prompt.create({
    data: {
      projectId: project.id,
      name: "code-reviewer",
      description: "Reviews pull requests for bugs, security, and style.",
      tags: ["engineering", "security"],
      defaultModel: "glm-4.6",
    },
  });
  const c_v1_content = {
    system: "You are a senior staff engineer reviewing a pull request. Focus on correctness, security, and maintainability.",
    user: `Diff:
{{diff}}

Return JSON: {"severity": "block" | "comment" | "approve", "issues": [{"file","line","category","message"}], "summary": "..."}`,
  };
  const c_v1_vars = [{ name: "diff", type: "string", required: true, description: "Unified diff of the PR" }];
  const c_v1 = await db.promptVersion.create({
    data: {
      promptId: codePrompt.id,
      versionHash: computeVersionHash({ content: c_v1_content, variables: c_v1_vars, modelConfig: { ...baseConfig, max_tokens: 1500 } }),
      semver: "0.9.0",
      branch: "main",
      content: c_v1_content,
      variables: c_v1_vars,
      modelConfig: { ...baseConfig, max_tokens: 1500 },
      commitMessage: "Initial PR review prompt",
      authorId: tom.id,
      status: "review",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    },
  });
  await db.branch.create({ data: { promptId: codePrompt.id, name: "main", headVersionId: c_v1.id } });

  // ---------- Prompt 4: email-drafter ----------
  console.log("Creating email-drafter prompt...");
  const emailPrompt = await db.prompt.create({
    data: {
      projectId: project.id,
      name: "email-drafter",
      description: "Drafts personalized outbound sales emails.",
      tags: ["sales", "outbound"],
      defaultModel: "glm-4.6",
    },
  });
  const e_content = {
    system: "You are a concise B2B sales copywriter. Write a 90-word cold email. No buzzwords.",
    user: `Prospect: {{prospect_name}} at {{company}}
Context: {{context}}
Value prop: {{value_prop}}

Subject + body.`,
  };
  const e_vars = [
    { name: "prospect_name", type: "string", required: true },
    { name: "company", type: "string", required: true },
    { name: "context", type: "string", required: false, default: "" },
    { name: "value_prop", type: "string", required: true },
  ];
  const e_v1 = await db.promptVersion.create({
    data: {
      promptId: emailPrompt.id,
      versionHash: computeVersionHash({ content: e_content, variables: e_vars, modelConfig: { ...baseConfig, temperature: 0.7 } }),
      semver: "1.3.0",
      branch: "main",
      content: e_content,
      variables: e_vars,
      modelConfig: { ...baseConfig, temperature: 0.7 },
      commitMessage: "Tighten to 90 words, kill buzzwords",
      authorId: priya.id,
      status: "active",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9),
    },
  });
  await db.branch.create({ data: { promptId: emailPrompt.id, name: "main", headVersionId: e_v1.id } });
  await db.activeVersion.create({ data: { promptId: emailPrompt.id, environment: "production", versionId: e_v1.id, activatedBy: elena.id } });

  // ---------- Experiment: Tone v2 vs Control ----------
  console.log("Creating A/B experiment + generating events...");
  const startedAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 4);
  const experiment = await db.experiment.create({
    data: {
      promptId: resumePrompt.id,
      name: "Tone v2 vs Control",
      hypothesis: "A warmer tone with an encouragement note will lift eval pass rate (relevance) by >=3pp without raising latency p95 above 1200ms.",
      trafficSplit: { control: 0.5, variant_a: 0.5 },
      targetingRules: { segment: "all", region: "eu" },
      minSampleSize: 3600,
      confidenceLevel: 0.95,
      primaryMetric: "eval_pass_rate",
      guardrailMetrics: [{ metric: "latency_p95", op: "max", threshold: 1200 }],
      status: "running",
      startedAt,
    },
  });
  const variantControl = await db.experimentVariant.create({
    data: { experimentId: experiment.id, name: "control", versionId: r_v11.id, trafficWeight: 0.5 },
  });
  const variantA = await db.experimentVariant.create({
    data: { experimentId: experiment.id, name: "variant_a", versionId: r_v2.id, trafficWeight: 0.5 },
  });

  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const events: any[] = [];
  const N = 3600;
  const spanMs = 4 * 24 * 60 * 60 * 1000;
  for (let i = 0; i < N; i++) {
    // deterministic sticky assignment by interleaving control / variant
    const t = startedAt.getTime() + (i / (N * 2)) * spanMs;
    for (const [variant, vid, passP, latMu, latSd, costMu, tokIn, tokOut] of [
      ["control", variantControl.id, 0.71, 820, 140, 0.0122, 540, 320],
      ["variant_a", variantA.id, 0.80, 880, 150, 0.0130, 560, 360],
    ] as [string, string, number, number, number, number, number, number][]) {
      const pass = Math.random() < passP ? 1 : 0;
      const latency = Math.max(280, Math.round(latMu + randn() * latSd));
      const cost = Math.max(0.001, +(costMu + randn() * 0.0015).toFixed(5));
      const tin = Math.max(120, Math.round(tokIn + randn() * 60));
      const tout = Math.max(80, Math.round(tokOut + randn() * 50));
      events.push({
        experimentId: experiment.id,
        variantId: vid,
        userId: `u_${variant}_${i}`,
        metricName: "eval_pass_rate",
        metricValue: pass,
        tokensIn: tin,
        tokensOut: tout,
        costUsd: cost,
        latencyMs: latency,
        evalScore: pass,
        createdAt: new Date(t + (variant === "variant_a" ? spanMs / (N * 2) : 0)),
      });
    }
  }
  for (let i = 0; i < events.length; i += 300) {
    await db.experimentEvent.createMany({ data: events.slice(i, i + 300) });
  }

  // ---------- Audit log ----------
  console.log("Creating audit log entries...");
  await db.auditLog.createMany({
    data: [
      { projectId: project.id, actorId: elena.id, action: "version.activated", targetType: "prompt_version", targetId: r_v11.id, detail: { environment: "production", semver: "1.1.0" }, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) },
      { projectId: project.id, actorId: priya.id, action: "version.created", targetType: "prompt_version", targetId: r_v11.id, detail: { semver: "1.1.0", branch: "main" }, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) },
      { projectId: project.id, actorId: tom.id, action: "version.created", targetType: "prompt_version", targetId: r_v2.id, detail: { semver: "1.2.0", branch: "experiment/tone-v2" }, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5) },
      { projectId: project.id, actorId: elena.id, action: "experiment.started", targetType: "experiment", targetId: experiment.id, detail: { name: "Tone v2 vs Control" }, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4) },
      { projectId: project.id, actorId: marcus.id, action: "comment.created", targetType: "prompt_version", targetId: r_v2.id, detail: { body: "Love the encouragement note..." }, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) },
      { projectId: project.id, actorId: priya.id, action: "version.created", targetType: "prompt_version", targetId: r_dev.id, detail: { semver: "1.1.1", branch: "dev" }, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) },
      { projectId: project.id, actorId: marcus.id, action: "version.activated", targetType: "prompt_version", targetId: r_dev.id, detail: { environment: "development" }, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) },
    ],
  });

  console.log("Seed complete.");
  console.log(JSON.stringify({ prompts: 4, versions: 7, experimentEvents: events.length }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
