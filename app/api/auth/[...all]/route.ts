import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

/**
 * Catch-all handler for Better Auth routes.
 *
 * Better Auth exposes:
 *   POST /api/auth/sign-up/email
 *   POST /api/auth/sign-in/email
 *   POST /api/auth/sign-out
 *   GET  /api/auth/session
 *   GET  /api/auth/sign-in/social/{provider}
 *   GET  /api/auth/callback/{provider}
 *   ...etc.
 */
export const { GET, POST } = toNextJsHandler(auth.handler);
