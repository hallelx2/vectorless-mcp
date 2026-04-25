import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { registerClient } from "@/lib/oauth/clients";

/**
 * RFC 7591 — Dynamic Client Registration.
 *
 * MCP clients (Claude Desktop, Cursor, etc.) call this to register themselves
 * before initiating the OAuth flow. They get back a client_id they can reuse.
 *
 * No authentication required — this endpoint is intentionally open. Anyone
 * can register a client; what matters is that the user must approve it
 * during the consent step.
 */

const registerSchema = z.object({
  client_name: z.string().min(1).max(200),
  redirect_uris: z.array(z.string().url()).min(1).max(10),
  grant_types: z
    .array(z.enum(["authorization_code", "refresh_token"]))
    .optional(),
  token_endpoint_auth_method: z.enum(["none"]).optional(),
  logo_uri: z.string().url().optional(),
  client_uri: z.string().url().optional(),
  policy_uri: z.string().url().optional(),
  tos_uri: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Body must be JSON" },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_client_metadata",
        error_description: parsed.error.issues.map((i) => i.message).join("; "),
      },
      { status: 400 },
    );
  }

  try {
    const client = await registerClient({
      clientName: parsed.data.client_name,
      redirectUris: parsed.data.redirect_uris,
      grantTypes: parsed.data.grant_types,
      tokenEndpointAuthMethod: parsed.data.token_endpoint_auth_method,
      logoUri: parsed.data.logo_uri,
      clientUri: parsed.data.client_uri,
      policyUri: parsed.data.policy_uri,
      tosUri: parsed.data.tos_uri,
    });

    return NextResponse.json(
      {
        client_id: client.id,
        client_name: client.name,
        redirect_uris: client.redirectUris,
        grant_types: client.grantTypes,
        token_endpoint_auth_method: client.tokenEndpointAuthMethod,
        client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: "invalid_redirect_uri",
        error_description: e instanceof Error ? e.message : "Registration failed",
      },
      { status: 400 },
    );
  }
}
