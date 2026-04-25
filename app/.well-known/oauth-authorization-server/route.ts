import { NextResponse } from "next/server";

import { ALL_SCOPES } from "@/lib/oauth/scopes";

/**
 * RFC 8414 — OAuth 2.0 Authorization Server Metadata.
 *
 * Tells MCP clients where every OAuth endpoint lives, what grant types
 * we support, and which PKCE methods are required.
 */
export function GET() {
  const issuer = process.env.OAUTH_ISSUER || "http://localhost:3000";

  return NextResponse.json({
    issuer,
    authorization_endpoint: `${issuer}/api/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    revocation_endpoint: `${issuer}/api/oauth/revoke`,
    registration_endpoint: `${issuer}/api/oauth/register`,
    scopes_supported: ALL_SCOPES,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
}
