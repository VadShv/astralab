import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { db } from "./db";

export interface OrgContext {
  userId: string;
  orgId: string;
  projectId: string;
  role: string;
}

/** Whether demo (no-auth) access is allowed. Defaults to true unless ALLOW_DEMO=false. */
export function demoAllowed(): boolean {
  return process.env.ALLOW_DEMO !== "false";
}

/** The authenticated session, or null. */
export async function getAuthSession() {
  return getServerSession(authOptions);
}

/**
 * Resolve the acting user.
 * - If authenticated, returns the DB user.
 * - If no session but ALLOW_DEMO != false, falls back to the first admin (demo mode).
 * - Otherwise null (caller should return 401).
 */
export async function requireUser() {
  const session = await getAuthSession();
  if (session?.user) {
    const u = await db.user.findUnique({ where: { id: (session.user as any).id } });
    if (u) return u;
  }
  if (demoAllowed()) {
    const demo = await db.user.findFirst({ where: { role: "admin" } });
    if (demo) return demo;
  }
  return null;
}

export async function requireUserId(): Promise<string> {
  const u = await requireUser();
  if (!u) throw new Error("Unauthorized");
  return u.id;
}

/**
 * Resolve the org/project context for the current request.
 * - Authenticated: orgId/projectId/role from the JWT.
 * - Demo fallback: first project + first admin.
 */
export async function requireOrgContext(): Promise<OrgContext | null> {
  const session = await getAuthSession();
  const su = session?.user as any;
  if (su?.projectId && su?.orgId) {
    return { userId: su.id, orgId: su.orgId, projectId: su.projectId, role: su.role ?? "admin" };
  }
  if (demoAllowed()) {
    const demo = await db.user.findFirst({ where: { role: "admin" } });
    const project = await db.project.findFirst();
    if (demo && project) {
      return { userId: demo.id, orgId: project.organizationId, projectId: project.id, role: "admin" };
    }
  }
  return null;
}
