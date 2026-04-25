# Vectorless MCP — Claude Notes

Remote MCP server for Vectorless. Next.js 15 App Router, deployed to Vercel.

## What This Service Does

1. Hosts an OAuth 2.1 server for MCP clients (Claude Desktop, Cursor, etc.)
2. Hosts the user-facing OAuth consent screen
3. Exposes `/api/mcp` — Streamable HTTP MCP endpoint
4. Translates MCP tool calls into vectorless-server API calls (using the `vectorless` TS SDK)
5. Enforces multi-tenancy via the `mcp_document` table

## Critical Rules

- **Multi-tenancy is enforced HERE, not in vectorless-server.** Every handler that accepts a `document_id` MUST call `assertDocumentOwned()` first.
- **PKCE is mandatory.** Only `S256` is accepted (OAuth 2.1 forbids `plain`).
- **Refresh tokens rotate on every use.** The old token is marked revoked.
- **All raw tokens are hashed at rest.** We store `SHA-256(token)`, never the raw value.
- **JWT access tokens are stateless** but checked against `oauth_revoked_jti` for revocation.

## Adding a New Tool

1. Define it in `lib/mcp/tools.ts` (name, description, input schema)
2. Add a handler in `lib/mcp/handlers.ts` — must validate ownership for any `document_id`/`section_id` arg
3. Register it in `TOOL_HANDLERS` map
4. Map it to a scope in `lib/mcp/scope-map.ts`

## Running Locally

The MCP service alone isn't useful — you need the vectorless-server running too:

```bash
# Terminal 1: vectorless-server
cd ../vectorless-server && go run ./cmd/server

# Terminal 2: MCP service
cd vectorless-mcp && pnpm dev
```

Then test the OAuth + MCP flow with `mcp-inspector`:

```bash
npx @modelcontextprotocol/inspector
# URL: http://localhost:3000/api/mcp
# Transport: Streamable HTTP
```

## Common Pitfalls

- **`@neondatabase/serverless` requires HTTPS** in production. For local dev, point `DATABASE_URL` at a real Neon DB or use a regular Postgres + swap `drizzle/neon-http` for `drizzle/node-postgres`.
- **Better Auth uses cookies**, so the consent flow must run on the same origin as `BETTER_AUTH_URL`.
- **Vercel free tier has 10s function timeouts** — long-running MCP tool calls (especially `vectorless_query` with big documents) can hit it. Use `wait_for_ready: false` for ingestion and let the AI poll.
