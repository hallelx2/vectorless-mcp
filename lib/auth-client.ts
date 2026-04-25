import { createAuthClient } from "better-auth/react";

/**
 * Client-side Better Auth helper.
 *
 * Used in client components for sign-in / sign-up / sign-out / session reads.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});
