import { withAuth } from "next-auth/middleware";

/**
 * Protect app pages: redirect to /login when there is no session.
 * - Demo mode (ALLOW_DEMO != "false") allows everything — preserves the
 *   single-tenant demo experience until real auth is enforced.
 * - /api/* is intentionally not matched here; API authorization is enforced
 *   in the routes themselves (requireUser / requireOrgContext).
 */
export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token }) => {
      if (process.env.ALLOW_DEMO !== "false") return true;
      return !!token;
    },
  },
});

export const config = {
  matcher: ["/((?!api|login|register|_next/static|_next/image|favicon.ico|s/).*)"],
};
