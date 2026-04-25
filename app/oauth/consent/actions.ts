"use server";

import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { oauthConsent } from "@/lib/db/schema";
import { getClient, clientHasRedirectUri } from "@/lib/oauth/clients";
import { issueAuthorizationCode } from "@/lib/oauth/codes";
import { parseScopes } from "@/lib/oauth/scopes";
import { randomUUID } from "crypto";

export interface ConsentInput {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string | null;
  codeChallenge: string;
  codeChallengeMethod: string;
}

export type ConsentResult =
  | { ok: true; redirectTo: string }
  | { ok: false; redirectTo: string };

/**
 * User approved the OAuth request — issue an authorization code and
 * redirect back to the MCP client.
 */
export async function approveConsent(input: ConsentInput): Promise<ConsentResult> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return { ok: false, redirectTo: "/login" };
  }

  const client = await getClient(input.clientId);
  if (!client) {
    return { ok: false, redirectTo: buildRedirectError(input.redirectUri, "invalid_client", input.state) };
  }

  if (!clientHasRedirectUri(client, input.redirectUri)) {
    return { ok: false, redirectTo: buildRedirectError(input.redirectUri, "invalid_redirect_uri", input.state) };
  }

  // Re-validate scopes server-side
  let scopes: string[];
  try {
    scopes = parseScopes(input.scopes.join(" "));
  } catch {
    return { ok: false, redirectTo: buildRedirectError(input.redirectUri, "invalid_scope", input.state) };
  }

  // Record the consent so future authorizations can skip the screen
  // for the same scopes.
  await db
    .insert(oauthConsent)
    .values({
      id: randomUUID(),
      userId: session.user.id,
      clientId: client.id,
      scopes,
      revokedAt: null,
    })
    .onConflictDoUpdate({
      target: [oauthConsent.userId, oauthConsent.clientId],
      set: { scopes, grantedAt: new Date(), revokedAt: null },
    });

  // Mint single-use authorization code
  const { code } = await issueAuthorizationCode({
    clientId: client.id,
    userId: session.user.id,
    scopes,
    redirectUri: input.redirectUri,
    codeChallenge: input.codeChallenge,
    codeChallengeMethod: input.codeChallengeMethod,
  });

  // Build success redirect: ?code=...&state=...
  const url = new URL(input.redirectUri);
  url.searchParams.set("code", code);
  if (input.state) url.searchParams.set("state", input.state);

  return { ok: true, redirectTo: url.toString() };
}

/**
 * User denied the OAuth request — redirect back with error=access_denied.
 */
export async function denyConsent(input: ConsentInput): Promise<ConsentResult> {
  return {
    ok: false,
    redirectTo: buildRedirectError(input.redirectUri, "access_denied", input.state),
  };
}

function buildRedirectError(
  redirectUri: string,
  error: string,
  state: string | null,
): string {
  try {
    const url = new URL(redirectUri);
    url.searchParams.set("error", error);
    if (state) url.searchParams.set("state", state);
    return url.toString();
  } catch {
    return "/";
  }
}
