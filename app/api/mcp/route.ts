import { NextRequest, NextResponse } from "next/server";

import { verifyAccessToken } from "@/lib/oauth/jwt";
import { createMcpServer } from "@/lib/mcp/server";

/**
 * MCP endpoint — Streamable HTTP transport.
 *
 * All requests are JSON-RPC 2.0 over POST. The protocol supports:
 *   - tools/list                  → returns scope-filtered tools
 *   - tools/call                  → enforces scope, dispatches to handler
 *   - initialize                  → handshake
 *
 * Authentication: Bearer token (JWT) issued by /api/oauth/token.
 *
 * Stateless: a fresh MCP Server instance is created per request, so we
 * scale to zero on serverless without session state in memory.
 */

export async function POST(req: NextRequest) {
  // ── Authenticate ──────────────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return wwwAuthenticate("missing_token");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const claims = await verifyAccessToken(token);
  if (!claims) {
    return wwwAuthenticate("invalid_token");
  }

  // ── Parse JSON-RPC body ──────────────────────────────────────
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }

  if (!body || typeof body !== "object" || body.jsonrpc !== "2.0") {
    return jsonRpcError(body?.id ?? null, -32600, "Invalid request");
  }

  // ── Handle the JSON-RPC method ───────────────────────────────
  const server = createMcpServer({
    userId: claims.sub,
    scopes: claims.scopes,
  });

  try {
    const result = await dispatchToServer(server, body);
    return NextResponse.json(result);
  } catch (e) {
    return jsonRpcError(
      body.id ?? null,
      -32603,
      "Internal error",
      e instanceof Error ? e.message : String(e),
    );
  }
}

/**
 * GET / DELETE — not used in stateless mode.
 * Streaming GET (server-sent events) could be added later for long-lived sessions.
 */
export function GET() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}

export function DELETE() {
  return new NextResponse(null, { status: 200 });
}

// ── Internal helpers ─────────────────────────────────────────

/**
 * Dispatch a JSON-RPC request to the MCP Server's registered handlers.
 *
 * The official @modelcontextprotocol/sdk Server expects to be connected to a
 * Transport. For stateless HTTP we hand-dispatch by calling the handlers we
 * registered during createMcpServer().
 */
async function dispatchToServer(server: any, request: any): Promise<any> {
  const method = request.method;
  const id = request.id;

  // Pull the registered handlers off the Server instance.
  // @modelcontextprotocol/sdk stores them in `_requestHandlers`.
  const handlers: Map<string, (req: any) => Promise<any>> =
    server._requestHandlers ?? server.requestHandlers;

  if (!handlers || !handlers.has(method)) {
    if (method === "initialize") {
      // Standard MCP handshake response
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "vectorless", version: "1.0.0" },
        },
      };
    }
    if (method === "notifications/initialized") {
      // Notification, no response
      return { jsonrpc: "2.0", id, result: {} };
    }
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    };
  }

  const handler = handlers.get(method)!;
  const result = await handler(request);
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: string,
) {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id,
      error: data ? { code, message, data } : { code, message },
    },
    { status: 200 }, // JSON-RPC errors return 200 with error in body
  );
}

function wwwAuthenticate(error: string) {
  return new NextResponse(
    JSON.stringify({ error }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer realm="vectorless-mcp", error="${error}"`,
      },
    },
  );
}
