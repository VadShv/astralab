import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `org-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * SaaS signup: create a user (password), an organization, an admin membership
 * and a default project in one transaction.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name?: string;
    email?: string;
    password?: string;
    companyName?: string;
  };

  const name = body.name?.trim();
  const email = body.email?.toLowerCase().trim();
  const password = body.password;
  const companyName = body.companyName?.trim() || name || "My Team";

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Имя, email и пароль обязательны" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Пароль должен быть не короче 8 символов" }, { status: 400 });
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const slug = slugify(companyName);

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, name, passwordHash, role: "admin" } });
    const org = await tx.organization.create({ data: { name: companyName, slug, plan: "growth" } });
    await tx.membership.create({ data: { userId: user.id, organizationId: org.id, role: "admin" } });
    const project = await tx.project.create({
      data: {
        organizationId: org.id,
        name: "Рекрутинговая лаборатория",
        slug: `${slug}-default`,
        description: "Проект по умолчанию",
      },
    });
    return { user, org, project };
  });

  return NextResponse.json({ ok: true, userId: result.user.id });
}
