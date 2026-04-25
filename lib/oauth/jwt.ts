import { SignJWT, jwtVerify } from "jose";

import { db } from "@/lib/db";
import { oauthRevokedJti } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const ISSUER = process.env.OAUTH_ISSUER || "http://localhost:3000";
const ACCESS_TOKEN_TTL = Number(process.env.OAUTH_ACCESS_TOKEN_TTL || 900);

function getSecret(): Uint8Array {
  const secret = process.env.OAUTH_JWT_SECRET;
  if (!secret) {
    throw new Error("OAUTH_JWT_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export interface AccessTokenClaims {
  sub: string; // user_id
  client_id: string;
  scopes: string[];
  jti: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

/**
 * Mint a JWT access token.
 *
 * Stateless — the MCP endpoint validates this without a DB lookup.
 * For revocation, we maintain a JTI blacklist (`oauth_revoked_jti`).
 */
export async function signAccessToken(params: {
  userId: string;
  clientId: string;
  scopes: string[];
  jti: string;
}): Promise<{ token: string; expiresIn: number }> {
  const secret = getSecret();
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({
    client_id: params.clientId,
    scopes: params.scopes,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(`${ISSUER}/api/mcp`)
    .setSubject(params.userId)
    .setJti(params.jti)
    .setIssuedAt(now)
    .setExpirationTime(now + ACCESS_TOKEN_TTL)
    .sign(secret);

  return { token, expiresIn: ACCESS_TOKEN_TTL };
}

/**
 * Verify a JWT access token and check the revocation list.
 *
 * Returns claims if valid, null otherwise.
 */
export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: `${ISSUER}/api/mcp`,
    });

    const jti = payload.jti as string;
    if (!jti) return null;

    // Check revocation list
    const revoked = await db
      .select({ jti: oauthRevokedJti.jti })
      .from(oauthRevokedJti)
      .where(eq(oauthRevokedJti.jti, jti))
      .limit(1);

    if (revoked.length > 0) return null;

    return payload as unknown as AccessTokenClaims;
  } catch {
    return null;
  }
}
