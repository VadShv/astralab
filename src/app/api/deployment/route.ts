import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getProjectId } from "@/lib/data";

export async function GET() {
  const projectId = await getProjectId();
  const prompts = await db.prompt.findMany({
    where: { projectId, archivedAt: null },
    orderBy: { name: "asc" },
    include: {
      defaultModel: { select: { id: true, displayName: true } },
      activeVersions: { include: { version: true, activator: { select: { name: true } } } },
      versions: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, semver: true, status: true, branch: true, createdAt: true },
      },
    },
  });

  const envs = ["development", "staging", "production"];

  return NextResponse.json({
    environments: envs,
    rows: prompts.map((p) => {
      const byEnv: Record<string, { versionId: string; semver: string; activatedAt: Date; activator: string | null } | null> = {};
      for (const e of envs) {
        const av = p.activeVersions.find((a) => a.environment === e);
        byEnv[e] = av
          ? {
              versionId: av.versionId,
              semver: av.version.semver,
              activatedAt: av.activatedAt,
              activator: av.activator?.name ?? null,
            }
          : null;
      }
      return {
        promptId: p.id,
        promptName: p.name,
        defaultModel: p.defaultModel?.displayName ?? null,
        environments: byEnv,
        recentVersions: p.versions,
      };
    }),
  });
}
