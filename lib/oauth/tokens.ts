import { db } from "@/lib/db";
import {
  oauthRefreshToken,
  oauthRevokedJti,
  type OAuthRefreshToken,
} from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

import { hashToken, randomToken } from "./pkce";
import { signAccessToken } from "./jwt";

const REFRESH_TOKEN_TTL = Number(process.env.OAUTH_REFRESH_TOKEN_TTL || 2592000); // 30 days

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  scope: string;
}

/**
 * Issue a fresh access + refresh token pair.
 *
 * Used after successful authorization code exchange.
 */
export async function issueTokens(params: {
  userId: string;
  clientId: string;
  scopes: string[];
  parentHash?: string | null;
}): Promise<IssuedTokens> {
  const jti = randomUUID();
  const refreshToken = randomToken(48);
  const refreshTokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

  // Persist refresh token (hashed)
  await db.insert(oauthRefreshToken).values({
    tokenHash: refreshTokenHash,
    clientId: params.clientId,
    userId: params.userId,
    scopes: params.scopes,
    parentHash: params.parentHash ?? null,
    expiresAt,
  });

  // Mint access token (stateless JWT)
  const { token: accessToken, expiresIn } = await signAccessToken({
    userId: params.userId,
    clientId: params.clientId,
    scopes: params.scopes,
    jti,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: "Bearer",
    scope: params.scopes.join(" "),
  };
}

/**
 * Exchange a refresh token for a new pair (rotation).
 *
 * Returns the new tokens or null if the refresh token is invalid/expired/revoked.
 * The old refresh token is revoked (single-use rotation, RFC 6749 §10.4).
 */
export async function rotateRefreshToken(
  rawRefreshToken: string,
  clientId: string,
): Promise<IssuedTokens | null> {
  const refreshHash = hashToken(rawRefreshToken);

  const [existing] = await db
    .select()
    .from(oauthRefreshToken)
    .where(
      and(
        eq(oauthRefreshToken.tokenHash, refreshHash),
        eq(oauthRefreshToken.clientId, clientId),
        isNull(oauthRefreshToken.revokedAt),
      ),
    )
    .limit(1);

  if (!existing) return null;
  if (existing.expiresAt < new Date()) return null;

  // Revoke the old refresh token (single-use rotation)
  await db
    .update(oauthRefreshToken)
    .set({ revokedAt: new Date() })
    .where(eq(oauthRefreshToken.tokenHash, refreshHash));

  // Issue new pair, link via parentHash for audit trail
  return issueTokens({
    userId: existing.userId,
    clientId: existing.clientId,
    scopes: existing.scopes,
    parentHash: refreshHash,
  });
}

/**
 * Revoke a refresh token by raw value.
 *
 * Used by /oauth/revoke and the user-facing "disconnect" UI.
 */
export async function revokeRefreshToken(
  rawRefreshToken: string,
): Promise<boolean> {
  const refreshHash = hashToken(rawRefreshToken);
  const result = await db
    .update(oauthRefreshToken)
    .set({ revokedAt: new Date() })
    .where(eq(oauthRefreshToken.tokenHash, refreshHash))
    .returning({ tokenHash: oauthRefreshToken.tokenHash });
  return result.length > 0;
}

/**
 * Revoke an access token JTI by adding it to the blacklist.
 */
export async function revokeAccessTokenJti(
  jti: string,
  expiresAt: Date,
): Promise<void> {
  await db
    .insert(oauthRevokedJti)
    .values({ jti, expiresAt })
    .onConflictDoNothing();
}

export type RefreshTokenRecord = OAuthRefreshToken;
