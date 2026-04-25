import { NextResponse } from "next/server";

/**
 * RFC 9728 — OAuth 2.0 Protected Resource Metadata.
 *
 * MCP clients fetch this first to discover which authorization server
 * protects this resource (the MCP endpoint).
 */
export function GET() {
  const issuer = process.env.OAUTH_ISSUER || "http://localhost:3000";

  return NextResponse.json({
    resource: `${issuer}/api/mcp`,
    authorization_servers: [issuer],
    bearer_methods_supported: ["header"],
    resource_documentation: "https://docs.vectorless.store/mcp",
  });
}
