import { createHash, randomBytes } from "crypto";

/**
 * Verify a PKCE challenge.
 *
 * The MCP client sends `code_challenge` (SHA-256 of `code_verifier`)
 * during /oauth/authorize, and `code_verifier` during /oauth/token.
 * We re-hash the verifier and compare.
 *
 * Only the S256 method is supported (RFC 7636 §4.2 — "plain" is forbidden by OAuth 2.1).
 */
export function verifyPkce(
  codeVerifier: string,
  storedChallenge: string,
  method: string,
): boolean {
  if (method !== "S256") return false;
  const computed = createHash("sha256")
    .update(codeVerifier)
    .digest()
    .toString("base64url");
  return constantTimeEquals(computed, storedChallenge);
}

/**
 * Generate a cryptographically random opaque token (URL-safe base64).
 * Used for authorization codes and refresh tokens.
 */
export function randomToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

/**
 * SHA-256 hash a token for at-rest storage.
 * The raw token is given out once; we never store it.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Constant-time string comparison to avoid timing attacks.
 */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
