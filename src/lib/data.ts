import { db } from "./db";

/** The demo runs against a single project. Resolve it (creating nothing). */
export async function getProject() {
  const project = await db.project.findFirst({
    include: { organization: true },
  });
  return project;
}

export async function getProjectId(): Promise<string> {
  const p = await getProject();
  if (!p) throw new Error("No project found. Run the seed.");
  return p.id;
}

/** The "current" acting user for the demo (first admin). */
export async function getCurrentUser() {
  const user = await db.user.findFirst({ where: { role: "admin" } });
  return user;
}

export async function getCurrentUserId(): Promise<string> {
  const u = await getCurrentUser();
  if (!u) throw new Error("No user found. Run the seed.");
  return u.id;
}

export async function logAudit(opts: {
  projectId: string;
  actorId?: string;
  action: string;
  targetType: string;
  targetId: string;
  detail?: Record<string, unknown>;
}) {
  return db.auditLog.create({
    data: {
      projectId: opts.projectId,
      actorId: opts.actorId,
      action: opts.action,
      targetType: opts.targetType,
      targetId: opts.targetId,
      detail: opts.detail ?? {},
    },
  });
}

/** Standard JSON response helper. */
export function json<T>(data: T, init?: ResponseInit) {
  return Response.json(data, init);
}
