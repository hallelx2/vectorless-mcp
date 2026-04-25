import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db, schema } from "@/lib/db";

/**
 * Better Auth configuration.
 *
 * Handles user-facing authentication (login for the OAuth consent screen).
 * Supports email/password and Google OAuth. GitHub can be added when
 * GITHUB_CLIENT_ID is set.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },

  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh after 1 day of activity
  },

  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
    "https://mcp.vectorless.store",
  ],
});

export type Session = typeof auth.$Infer.Session;
