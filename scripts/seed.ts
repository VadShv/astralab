import { db } from "../src/lib/db";
import { computeVersionHash } from "../src/lib/prompt";
import type { ModelConfig, PromptContent, PromptVariable } from "../src/lib/prompt";
import { MARKETING_PROMPTS } from "../src/data/prompts/marketing";
import { DEVELOPMENT_PROMPTS } from "../src/data/prompts/development";
import { BUSINESS_PROMPTS } from "../src/data/prompts/business";
import { EDUCATION_PROMPTS } from "../src/data/prompts/education";
import { CREATIVE_PROMPTS } from "../src/data/prompts/creative";
import { PROFESSIONAL_PROMPTS } from "../src/data/prompts/professional";
import { HR_PROMPTS } from "../src/data/prompts/hr";
import type { SeedPrompt } from "../src/data/prompts/types";

const ALL: SeedPrompt[] = [
  ...HR_PROMPTS,          // HR-промпты — ПЕРВЫЕ, центральные
  ...MARKETING_PROMPTS,
  ...DEVELOPMENT_PROMPTS,
  ...BUSINESS_PROMPTS,
  ...EDUCATION_PROMPTS,
  ...CREATIVE_PROMPTS,
  ...PROFESSIONAL_PROMPTS,
];

async function main() {
  console.log(`Загрузка ${ALL.length} промптов...`);
  console.log("Очистка БД...");
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

  console.log("Создание пользователей...");
  const users = await Promise.all([
    db.user.create({ data: { email: "elena@astra-hr.io", name: "Елена Васкес", avatarColor: "#22d3ee", role: "admin" } }),
    db.user.create({ data: { email: "marcus@astra-hr.io", name: "Маркус Чен", avatarColor: "#38bdf8", role: "reviewer" } }),
    db.user.create({ data: { email: "priya@astra-hr.io", name: "Прия Наир", avatarColor: "#818cf8", role: "developer" } }),
    db.user.create({ data: { email: "tom@astra-hr.io", name: "Том Беккер", avatarColor: "#a5b4fc", role: "developer" } }),
  ]);
  const [elena, marcus, priya, tom] = users;
  const allUsers = [elena, marcus, priya, tom];

  console.log("Создание организации и проекта...");
  const org = await db.organization.create({
    data: { name: "Astra HR", slug: "astra-hr", plan: "growth" },
  });
  const project = await db.project.create({
    data: {
      organizationId: org.id,
      name: "HR-орбита Acme AI",
      slug: "hr-orbit",
      description: "Космическая лаборатория HR-промптов: скрининг, интервью, онбординг, performance, развитие.",
    },
  });

  // Категории для распределения по окружениям — HR-категория в проде
  const categoryEnv: Record<string, "development" | "staging" | "production"> = {
    "HR-лаборатория": "production",
    "Маркетинг и контент": "production",
    "Разработка и код": "production",
    "Бизнес и операции": "production",
    "Образование и наука": "staging",
    "Креатив и медиа": "production",
    "Профессиональные услуги": "staging",
  };

  const auditEntries: any[] = [];
  const experimentCandidates: { promptId: string; promptName: string; mainVersionId: string; variantVersionId: string; variantBranch: string; category: string }[] = [];
  let created = 0;

  console.log("Создание промптов, версий, веток, тегов, активных версий...");
  for (const sp of ALL) {
    const author = allUsers[created % allUsers.length];
    const env = categoryEnv[sp.category] ?? "production";

    // 1. Промпт
    const prompt = await db.prompt.create({
      data: {
        projectId: project.id,
        name: sp.name,
        description: sp.description,
        tags: sp.tags,
        defaultModel: sp.defaultModel,
      },
    });

    // 2. Основная версия (main)
    const mainHash = computeVersionHash({
      content: sp.content as PromptContent,
      variables: sp.variables as PromptVariable[],
      modelConfig: sp.modelConfig as ModelConfig,
    });
    const mainVersion = await db.promptVersion.create({
      data: {
        promptId: prompt.id,
        versionHash: mainHash,
        semver: "1.0.0",
        branch: "main",
        content: sp.content as any,
        variables: sp.variables as any,
        modelConfig: sp.modelConfig as any,
        commitMessage: sp.commitMessage,
        authorId: author.id,
        status: "active",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (10 + (created % 20))),
      },
    });

    // 3. Ветки: main + variant-ветка (если есть)
    await db.branch.create({ data: { promptId: prompt.id, name: "main", headVersionId: mainVersion.id } });

    // 4. Тег stable на main
    await db.tag.create({ data: { promptId: prompt.id, name: "stable", versionId: mainVersion.id } });
    await db.tag.create({ data: { promptId: prompt.id, name: "v1.0.0", versionId: mainVersion.id } });

    // 5. Активная версия в окружении (production для большинства)
    await db.activeVersion.create({
      data: { promptId: prompt.id, environment: env, versionId: mainVersion.id, activatedBy: elena.id },
    });
    // 30% промптов также активны в development (если env != development)
    if (created % 3 === 0 && env !== "development") {
      await db.activeVersion.create({
        data: { promptId: prompt.id, environment: "development", versionId: mainVersion.id, activatedBy: priya.id },
      });
    }
    // 25% промптов также активны в staging (если env != staging)
    if (created % 4 === 0 && env !== "staging") {
      await db.activeVersion.create({
        data: { promptId: prompt.id, environment: "staging", versionId: mainVersion.id, activatedBy: marcus.id },
      });
    }

    // 6. Variant-версия (если есть) — для DAG и A/B-тестов
    let variantVersionId: string | null = null;
    let variantBranch = "";
    if (sp.variant) {
      variantBranch = sp.variant.branch;
      const vContent = sp.variant.content as PromptContent;
      const vVars = (sp.variant.variables ?? sp.variables) as PromptVariable[];
      const vConfig = (sp.variant.modelConfig ?? sp.modelConfig) as ModelConfig;
      const vHash = computeVersionHash({ content: vContent, variables: vVars, modelConfig: vConfig });
      const variantVersion = await db.promptVersion.create({
        data: {
          promptId: prompt.id,
          versionHash: vHash,
          semver: "1.1.0",
          branch: variantBranch,
          content: vContent as any,
          variables: vVars as any,
          modelConfig: vConfig as any,
          parentVersionId: mainVersion.id,
          commitMessage: sp.variant.commitMessage,
          authorId: allUsers[(created + 1) % allUsers.length].id,
          status: "review",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (2 + (created % 6))),
        },
      });
      variantVersionId = variantVersion.id;
      await db.branch.create({ data: { promptId: prompt.id, name: variantBranch, headVersionId: variantVersion.id } });

      experimentCandidates.push({
        promptId: prompt.id,
        promptName: sp.name,
        mainVersionId: mainVersion.id,
        variantVersionId,
        variantBranch,
        category: sp.category,
      });
    }

    // audit
    auditEntries.push({
      projectId: project.id,
      actorId: author.id,
      action: "version.created",
      targetType: "prompt_version",
      targetId: mainVersion.id,
      detail: { semver: "1.0.0", branch: "main", prompt: sp.name },
      createdAt: mainVersion.createdAt,
    });
    auditEntries.push({
      projectId: project.id,
      actorId: elena.id,
      action: "version.activated",
      targetType: "prompt_version",
      targetId: mainVersion.id,
      detail: { environment: env, semver: "1.0.0", prompt: sp.name },
      createdAt: new Date(mainVersion.createdAt.getTime() + 60000),
    });
    if (variantVersionId) {
      auditEntries.push({
        projectId: project.id,
        actorId: allUsers[(created + 1) % allUsers.length].id,
        action: "version.created",
        targetType: "prompt_version",
        targetId: variantVersionId,
        detail: { semver: "1.1.0", branch: variantBranch, prompt: sp.name },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * (2 + (created % 6))),
      });
    }

    created++;
    if (created % 20 === 0) console.log(`  ...${created}/${ALL.length}`);
  }

  console.log(`Создано ${created} промптов.`);

  // Создаём эксперименты для первых 8 кандидатов с variant
  console.log(`Создание A/B-экспериментов для ${Math.min(8, experimentCandidates.length)} промптов...`);
  function randn() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  const experiments: any[] = [];
  const startedAt = new Date(Date.now() - 1000 * 60 * 60 * 24 * 4);
  for (let i = 0; i < Math.min(8, experimentCandidates.length); i++) {
    const c = experimentCandidates[i];
    // Контроль: 0.72, претендент: 0.78-0.84 (значимое улучшение)
    const controlP = 0.70 + Math.random() * 0.05;
    const variantP = controlP + 0.05 + Math.random() * 0.07;
    const exp = await db.experiment.create({
      data: {
        promptId: c.promptId,
        name: `A/B тест: ${c.promptName}`,
        hypothesis: `Вариант на ветке ${c.variantBranch} улучшит eval_pass_rate минимум на 3 п.п. без нарушения guardrail-метрик.`,
        trafficSplit: { control: 0.5, variant_a: 0.5 },
        targetingRules: { segment: "all", region: "eu" },
        minSampleSize: 3000,
        confidenceLevel: 0.95,
        primaryMetric: "eval_pass_rate",
        guardrailMetrics: [{ metric: "latency_p95", op: "max", threshold: 1500 }],
        status: "running",
        startedAt,
      },
    });
    const vCtrl = await db.experimentVariant.create({
      data: { experimentId: exp.id, name: "control", versionId: c.mainVersionId, trafficWeight: 0.5 },
    });
    const vVar = await db.experimentVariant.create({
      data: { experimentId: exp.id, name: "variant_a", versionId: c.variantVersionId, trafficWeight: 0.5 },
    });
    experiments.push({ exp, vCtrl, vVar, controlP, variantP });

    auditEntries.push({
      projectId: project.id,
      actorId: elena.id,
      action: "experiment.started",
      targetType: "experiment",
      targetId: exp.id,
      detail: { name: exp.name },
      createdAt: startedAt,
    });
  }

  // Генерация метрик для экспериментов
  console.log("Генерация метрик экспериментов...");
  const N = 3000;
  const spanMs = 4 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();
  let totalEvents = 0;
  for (const { vCtrl, vVar, controlP, variantP } of experiments) {
    const batch: any[] = [];
    for (let i = 0; i < N; i++) {
      const t = startedAt.getTime() + (i / N) * (nowMs - startedAt.getTime());
      for (const [variant, vid, passP, latMu, latSd, costMu, tokIn, tokOut] of [
        ["control", vCtrl.id, controlP, 820, 140, 0.0122, 540, 320],
        ["variant_a", vVar.id, variantP, 900, 150, 0.0130, 560, 360],
      ] as [string, string, number, number, number, number, number, number][]) {
        const pass = Math.random() < passP ? 1 : 0;
        const latency = Math.max(280, Math.round(latMu + randn() * latSd));
        const cost = Math.max(0.001, +(costMu + randn() * 0.0015).toFixed(5));
        const tin = Math.max(120, Math.round(tokIn + randn() * 60));
        const tout = Math.max(80, Math.round(tokOut + randn() * 50));
        batch.push({
          experimentId: vCtrl.experimentId,
          variantId: vid,
          userId: `u_${variant}_${i}`,
          metricName: "eval_pass_rate",
          metricValue: pass,
          tokensIn: tin,
          tokensOut: tout,
          costUsd: cost,
          latencyMs: latency,
          evalScore: pass,
          createdAt: new Date(t + (variant === "variant_a" ? 30000 : 0)),
        });
        totalEvents++;
      }
    }
    for (let i = 0; i < batch.length; i += 400) {
      await db.experimentEvent.createMany({ data: batch.slice(i, i + 400) });
    }
  }
  console.log(`Сгенерировано ${totalEvents} событий метрик.`);

  // Audit log
  console.log("Создание записей аудита...");
  // Ограничиваем audit log последними ~150 записями, чтобы не раздувать
  const recentAudit = auditEntries
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 150);
  for (let i = 0; i < recentAudit.length; i += 50) {
    await db.auditLog.createMany({ data: recentAudit.slice(i, i + 50) });
  }

  // Сводка
  const counts = await Promise.all([
    db.prompt.count({ where: { projectId: project.id } }),
    db.promptVersion.count({ where: { prompt: { projectId: project.id } } }),
    db.branch.count({ where: { prompt: { projectId: project.id } } }),
    db.tag.count({ where: { prompt: { projectId: project.id } } }),
    db.activeVersion.count({ where: { prompt: { projectId: project.id } } }),
    db.experiment.count({ where: { prompt: { projectId: project.id } } }),
    db.experimentEvent.count(),
    db.auditLog.count({ where: { projectId: project.id } }),
  ]);
  console.log("=== Сводка ===");
  console.log(JSON.stringify({
    prompts: counts[0],
    versions: counts[1],
    branches: counts[2],
    tags: counts[3],
    activeVersions: counts[4],
    experiments: counts[5],
    experimentEvents: counts[6],
    auditLogs: counts[7],
  }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
