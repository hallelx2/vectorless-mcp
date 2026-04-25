import { db } from "@/lib/db";
import { oauthClient, type OAuthClient } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

/**
 * Generate a new OAuth client_id with the "oac_" prefix.
 */
export function generateClientId(): string {
  return `oac_${randomBytes(16).toString("base64url")}`;
}

/**
 * Validate a redirect URI per OAuth 2.1 / RFC 8252.
 *
 * - HTTPS required, EXCEPT loopback (127.0.0.1, [::1]) on any port (RFC 8252 §7.3)
 * - Custom URI schemes allowed (mobile/desktop apps, e.g. "claude://callback")
 */
export function isValidRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);

    // HTTPS — always allowed
    if (url.protocol === "https:") return true;

    // Loopback — HTTP on 127.0.0.1, [::1], or localhost on any port
    if (url.protocol === "http:") {
      const host = url.hostname.toLowerCase();
      return host === "127.0.0.1" || host === "[::1]" || host === "localhost";
    }

    // Custom scheme (claude://, cursor://, etc.) — allowed for native apps
    if (url.protocol.endsWith(":") && !["http:", "https:", "file:"].includes(url.protocol)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export interface RegisterClientInput {
  clientName: string;
  redirectUris: string[];
  grantTypes?: string[];
  tokenEndpointAuthMethod?: string;
  logoUri?: string;
  clientUri?: string;
  policyUri?: string;
  tosUri?: string;
}

/**
 * Register a new OAuth client (Dynamic Client Registration, RFC 7591).
 */
export async function registerClient(
  input: RegisterClientInput,
): Promise<OAuthClient> {
  // Validate all redirect URIs
  for (const uri of input.redirectUris) {
    if (!isValidRedirectUri(uri)) {
      throw new Error(`Invalid redirect_uri: ${uri}`);
    }
  }

  const clientId = generateClientId();

  const [created] = await db
    .insert(oauthClient)
    .values({
      id: clientId,
      name: input.clientName,
      redirectUris: input.redirectUris,
      grantTypes: input.grantTypes ?? ["authorization_code", "refresh_token"],
      tokenEndpointAuthMethod: input.tokenEndpointAuthMethod ?? "none",
      logoUri: input.logoUri ?? null,
      clientUri: input.clientUri ?? null,
      policyUri: input.policyUri ?? null,
      tosUri: input.tosUri ?? null,
    })
    .returning();

  return created;
}

/**
 * Look up a registered client by client_id.
 */
export async function getClient(clientId: string): Promise<OAuthClient | null> {
  const [row] = await db
    .select()
    .from(oauthClient)
    .where(eq(oauthClient.id, clientId))
    .limit(1);
  return row ?? null;
}

/**
 * Verify a redirect_uri matches one registered for this client (exact match).
 */
export function clientHasRedirectUri(
  client: OAuthClient,
  redirectUri: string,
): boolean {
  return client.redirectUris.includes(redirectUri);
}
