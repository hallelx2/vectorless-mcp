import { db } from "@/lib/db";
import { oauthAuthorizationCode } from "@/lib/db/schema";
import { eq, lt } from "drizzle-orm";

import { randomToken, hashToken } from "./pkce";

const AUTH_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export interface IssuedCode {
  code: string;
  expiresAt: Date;
}

/**
 * Issue a new single-use authorization code.
 *
 * The raw code is returned only here — only the SHA-256 hash is persisted.
 */
export async function issueAuthorizationCode(params: {
  clientId: string;
  userId: string;
  scopes: string[];
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}): Promise<IssuedCode> {
  const code = randomToken(32);
  const codeHash = hashToken(code);
  const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS);

  await db.insert(oauthAuthorizationCode).values({
    codeHash,
    clientId: params.clientId,
    userId: params.userId,
    scopes: params.scopes,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    expiresAt,
  });

  return { code, expiresAt };
}

/**
 * Look up and consume an authorization code (single-use).
 *
 * Returns the row if it exists, hasn't expired, and matches the client+redirect.
 * Always deletes the code (whether or not validation succeeds).
 */
export async function consumeAuthorizationCode(
  rawCode: string,
  clientId: string,
  redirectUri: string,
): Promise<{
  userId: string;
  scopes: string[];
  codeChallenge: string;
  codeChallengeMethod: string;
} | null> {
  const codeHash = hashToken(rawCode);

  const [row] = await db
    .select()
    .from(oauthAuthorizationCode)
    .where(eq(oauthAuthorizationCode.codeHash, codeHash))
    .limit(1);

  if (!row) return null;

  // Always delete (single-use, even on failed validation prevents re-attempts)
  await db
    .delete(oauthAuthorizationCode)
    .where(eq(oauthAuthorizationCode.codeHash, codeHash));

  // Validate
  if (row.expiresAt < new Date()) return null;
  if (row.clientId !== clientId) return null;
  if (row.redirectUri !== redirectUri) return null;

  return {
    userId: row.userId,
    scopes: row.scopes,
    codeChallenge: row.codeChallenge,
    codeChallengeMethod: row.codeChallengeMethod,
  };
}

/**
 * Sweep expired codes. Call from a cron or on-demand to keep the table small.
 */
export async function purgeExpiredCodes(): Promise<number> {
  const result = await db
    .delete(oauthAuthorizationCode)
    .where(lt(oauthAuthorizationCode.expiresAt, new Date()))
    .returning({ codeHash: oauthAuthorizationCode.codeHash });
  return result.length;
}
