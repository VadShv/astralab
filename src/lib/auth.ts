import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "./db";

/**
 * next-auth configuration.
 * - Credentials provider (email + password, bcrypt) for SaaS signup/login.
 * - Optional GitHub / Google OAuth (env-gated).
 * - JWT strategy: orgId, role and projectId are attached on first token creation
 *   and persisted, so subsequent requests don't hit the DB.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image ?? null };
      },
    }),
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GithubProvider({
            clientId: process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          }),
        ]
      : []),
    ...(process.env.GOOGLE_ID && process.env.GOOGLE_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      // Attach org + role + project once (persisted in the JWT afterwards).
      if (token.uid && !token.orgId) {
        const m = await db.membership.findFirst({
          where: { userId: token.uid as string },
          include: { organization: { include: { projects: true } } },
        });
        if (m) {
          token.orgId = m.organizationId;
          token.orgSlug = m.organization.slug;
          token.role = m.role;
          token.projectId = m.organization.projects[0]?.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.uid;
        (session.user as any).orgId = token.orgId;
        (session.user as any).orgSlug = token.orgSlug;
        (session.user as any).role = token.role;
        (session.user as any).projectId = token.projectId;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
};
