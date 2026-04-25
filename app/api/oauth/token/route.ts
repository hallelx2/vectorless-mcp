import { NextRequest, NextResponse } from "next/server";

import { getClient } from "@/lib/oauth/clients";
import { consumeAuthorizationCode } from "@/lib/oauth/codes";
import { verifyPkce } from "@/lib/oauth/pkce";
import { issueTokens, rotateRefreshToken } from "@/lib/oauth/tokens";

/**
 * OAuth 2.1 Token Endpoint.
 *
 * Two grant types:
 *   - authorization_code: exchange a code (with PKCE verifier) for tokens
 *   - refresh_token:      rotate a refresh token for a new pair
 *
 * Accepts both application/x-www-form-urlencoded (standard) and JSON
 * (some MCP clients use JSON).
 */
export async function POST(req: NextRequest) {
  const body = await readBody(req);

  const grantType = body.get("grant_type");
  const clientId = body.get("client_id");

  if (!clientId) {
    return tokenError("invalid_request", "Missing client_id");
  }

  const client = await getClient(clientId);
  if (!client) {
    return tokenError("invalid_client", "Unknown client_id");
  }

  if (grantType === "authorization_code") {
    return handleAuthorizationCode(body, clientId);
  }

  if (grantType === "refresh_token") {
    return handleRefresh(body, clientId);
  }

  return tokenError("unsupported_grant_type", `Grant type "${grantType}" is not supported`);
}

async function handleAuthorizationCode(body: URLSearchParams, clientId: string) {
  const code = body.get("code");
  const redirectUri = body.get("redirect_uri");
  const codeVerifier = body.get("code_verifier");

  if (!code || !redirectUri || !codeVerifier) {
    return tokenError("invalid_request", "Missing code, redirect_uri, or code_verifier");
  }

  const consumed = await consumeAuthorizationCode(code, clientId, redirectUri);
  if (!consumed) {
    return tokenError("invalid_grant", "Authorization code is invalid or expired");
  }

  // Verify PKCE
  if (!verifyPkce(codeVerifier, consumed.codeChallenge, consumed.codeChallengeMethod)) {
    return tokenError("invalid_grant", "PKCE verification failed");
  }

  const tokens = await issueTokens({
    userId: consumed.userId,
    clientId,
    scopes: consumed.scopes,
  });

  return tokenResponse(tokens);
}

async function handleRefresh(body: URLSearchParams, clientId: string) {
  const refreshToken = body.get("refresh_token");
  if (!refreshToken) {
    return tokenError("invalid_request", "Missing refresh_token");
  }

  const tokens = await rotateRefreshToken(refreshToken, clientId);
  if (!tokens) {
    return tokenError("invalid_grant", "Refresh token is invalid, expired, or revoked");
  }

  return tokenResponse(tokens);
}

async function readBody(req: NextRequest): Promise<URLSearchParams> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    return new URLSearchParams(text);
  }

  if (contentType.includes("application/json")) {
    const json = (await req.json()) as Record<string, string>;
    return new URLSearchParams(Object.entries(json));
  }

  // Try form-encoded as a fallback
  const text = await req.text();
  return new URLSearchParams(text);
}

function tokenResponse(tokens: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  scope: string;
}) {
  return NextResponse.json(
    {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn,
      token_type: tokens.tokenType,
      scope: tokens.scope,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}

function tokenError(code: string, description: string, status = 400) {
  return NextResponse.json(
    { error: code, error_description: description },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    },
  );
}
