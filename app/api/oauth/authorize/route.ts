import { NextRequest, NextResponse } from "next/server";

import { clientHasRedirectUri, getClient } from "@/lib/oauth/clients";
import { parseScopes } from "@/lib/oauth/scopes";

/**
 * OAuth 2.1 Authorization Endpoint (entry).
 *
 * The MCP client opens this URL in the user's browser. We validate the
 * request, then redirect to /oauth/consent so the user can log in and
 * approve scopes. The actual code issuance happens via a server action
 * from the consent screen (see app/oauth/consent/actions.ts).
 *
 * This endpoint never issues codes directly — the user must approve first.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const responseType = params.get("response_type");
  const scope = params.get("scope");
  const state = params.get("state");
  const codeChallenge = params.get("code_challenge");
  const codeChallengeMethod = params.get("code_challenge_method");

  // Basic validation — these errors render to the user (no redirect possible)
  if (!clientId) return errorPage("Missing client_id");
  if (!redirectUri) return errorPage("Missing redirect_uri");

  const client = await getClient(clientId);
  if (!client) return errorPage("Unknown client_id");
  if (!clientHasRedirectUri(client, redirectUri)) {
    return errorPage("redirect_uri does not match a registered URI");
  }

  // From here on, errors redirect back to the client with ?error=...
  if (responseType !== "code") {
    return redirectErr(redirectUri, "unsupported_response_type", state);
  }
  if (codeChallengeMethod !== "S256") {
    return redirectErr(redirectUri, "invalid_request", state, "code_challenge_method must be S256");
  }
  if (!codeChallenge) {
    return redirectErr(redirectUri, "invalid_request", state, "Missing code_challenge");
  }

  let scopes: string[];
  try {
    scopes = parseScopes(scope);
  } catch (e) {
    return redirectErr(redirectUri, "invalid_scope", state, e instanceof Error ? e.message : undefined);
  }

  // Pack the validated authorization request into the consent URL.
  // The consent page is a regular Next.js page; on user approval it calls
  // a server action that issues the actual auth code.
  const consentUrl = new URL(
    "/oauth/consent",
    process.env.OAUTH_ISSUER || req.nextUrl.origin,
  );
  consentUrl.searchParams.set("client_id", clientId);
  consentUrl.searchParams.set("redirect_uri", redirectUri);
  consentUrl.searchParams.set("scope", scopes.join(" "));
  consentUrl.searchParams.set("code_challenge", codeChallenge);
  consentUrl.searchParams.set("code_challenge_method", codeChallengeMethod);
  if (state) consentUrl.searchParams.set("state", state);

  return NextResponse.redirect(consentUrl);
}

function errorPage(message: string) {
  return new NextResponse(
    `<html><body style="font-family: system-ui; padding: 2rem;">
      <h1>Authorization Error</h1>
      <p>${escapeHtml(message)}</p>
    </body></html>`,
    { status: 400, headers: { "Content-Type": "text/html" } },
  );
}

function redirectErr(
  redirectUri: string,
  error: string,
  state: string | null,
  description?: string,
) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (description) url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
