import { NextRequest, NextResponse } from "next/server";

import { revokeRefreshToken } from "@/lib/oauth/tokens";

/**
 * RFC 7009 — OAuth 2.0 Token Revocation.
 *
 * Clients call this to revoke a refresh token (e.g. on user logout).
 * Per RFC, always returns 200 even if the token wasn't found, to avoid
 * disclosing token validity.
 */
export async function POST(req: NextRequest) {
  let body: URLSearchParams;
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const json = (await req.json()) as Record<string, string>;
    body = new URLSearchParams(Object.entries(json));
  } else {
    body = new URLSearchParams(await req.text());
  }

  const token = body.get("token");
  if (token) {
    await revokeRefreshToken(token);
  }

  // Always 200 (RFC 7009 §2.2)
  return new NextResponse(null, { status: 200 });
}
