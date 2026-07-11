import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProjectId } from "@/lib/data";

export async function GET() {
  const projectId = await getProjectId();

  const [prompts, versions, experiments, activeExperiments, audit, activeVersions, project] =
    await Promise.all([
      db.prompt.count({ where: { projectId, archivedAt: null } }),
      db.promptVersion.count({ where: { prompt: { projectId } } }),
      db.experiment.count({ where: { prompt: { projectId } } }),
      db.experiment.findMany({
        where: { prompt: { projectId }, status: "running" },
        include: { prompt: true, variants: true },
      }),
      db.auditLog.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { actor: true },
      }),
      db.activeVersion.count({ where: { prompt: { projectId }, environment: "production" } }),
      db.project.findUnique({ where: { id: projectId }, include: { organization: true } }),
    ]);

  const events = await db.experimentEvent.aggregate({
    where: { experiment: { prompt: { projectId } } },
    _sum: { costUsd: true, tokensIn: true, tokensOut: true },
    _count: true,
  });

  const since = new Date(Date.now() - 1000 * 60 * 60 * 24);
  const events24h = await db.experimentEvent.count({
    where: { experiment: { prompt: { projectId } }, createdAt: { gte: since } },
  });

  return NextResponse.json({
    project,
    kpis: {
      prompts,
      versions,
      experiments,
      activeExperiments: activeExperiments.length,
      prodActive: activeVersions,
      eventsTotal: events._count,
      events24h,
      cost24hUsd: Number(events._sum.costUsd?.toFixed(2) ?? 0),
      tokens24h: (events._sum.tokensIn ?? 0) + (events._sum.tokensOut ?? 0),
    },
    activeExperiments: activeExperiments.map((e) => ({
      id: e.id,
      name: e.name,
      promptName: e.prompt.name,
      primaryMetric: e.primaryMetric,
      startedAt: e.startedAt,
      variants: e.variants.length,
    })),
    recentActivity: audit.map((a) => ({
      id: a.id,
      action: a.action,
      targetType: a.targetType,
      actor: a.actor ? { name: a.actor.name, avatarColor: a.actor.avatarColor } : null,
      createdAt: a.createdAt,
      detail: a.detail,
    })),
  });
}
