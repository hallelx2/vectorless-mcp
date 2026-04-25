# Vectorless MCP

Remote Model Context Protocol server for Vectorless — give AI agents access to structure-preserving document retrieval over OAuth 2.1.

## Architecture

```
AI Client (Claude / Cursor / Windsurf)
     │
     │  Streamable HTTP + Bearer JWT
     ▼
mcp.vectorless.store
     │
     ├── /api/mcp              JSON-RPC endpoint (tools/list, tools/call)
     ├── /api/oauth/*          OAuth 2.1 server (DCR, authorize, token, revoke)
     ├── /.well-known/oauth-*  RFC 8414 / 9728 discovery
     ├── /oauth/consent        User-facing scope approval UI
     └── /login                Better Auth (email/password, Google)
     │
     │ uses vectorless TS SDK
     ▼
api.vectorless.store (vectorless-server)
```

## Stack

- **Next.js 15** App Router (deploys to Vercel)
- **Better Auth** for user login (email/password + Google)
- **Drizzle ORM** + Neon Postgres
- **jose** for JWT signing
- **@modelcontextprotocol/sdk** for the MCP server primitives
- **vectorless** SDK for backend calls

## Local Setup

```bash
# 1. Install
pnpm install

# 2. Configure env (copy .env.example → .env, fill values)
cp .env.example .env

# 3. Generate + apply migrations
pnpm db:generate
pnpm db:push

# 4. Run dev server
pnpm dev
# → http://localhost:3000
```

## Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `BETTER_AUTH_SECRET` | Random 32+ chars (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Public URL (e.g. `https://mcp.vectorless.store`) |
| `OAUTH_JWT_SECRET` | Random 32+ chars — signs access tokens |
| `OAUTH_ISSUER` | Same as the public URL |
| `OAUTH_ACCESS_TOKEN_TTL` | Seconds, default 900 (15m) |
| `OAUTH_REFRESH_TOKEN_TTL` | Seconds, default 2592000 (30d) |
| `GOOGLE_CLIENT_ID` | (optional) Better Auth Google OAuth |
| `GOOGLE_CLIENT_SECRET` | (optional) Better Auth Google OAuth |
| `VECTORLESS_API_URL` | Where the MCP forwards calls (e.g. `https://api.vectorless.store`) |
| `VECTORLESS_SERVICE_API_KEY` | Service-level key for the vectorless-server |

## Folder Layout

```
app/
├── .well-known/
│   ├── oauth-protected-resource/route.ts   RFC 9728 discovery
│   └── oauth-authorization-server/route.ts RFC 8414 discovery
├── api/
│   ├── auth/[...all]/route.ts              Better Auth handler
│   ├── mcp/route.ts                        JSON-RPC endpoint
│   └── oauth/
│       ├── register/route.ts               RFC 7591 DCR
│       ├── authorize/route.ts              entry → /oauth/consent
│       ├── token/route.ts                  code/refresh → tokens
│       └── revoke/route.ts                 RFC 7009 revocation
├── login/                                  user login UI
├── oauth/consent/                          scope approval UI
└── page.tsx                                landing page

lib/
├── auth.ts                                 Better Auth config
├── auth-client.ts                          Better Auth React client
├── db/                                     Drizzle schema + client
├── oauth/
│   ├── scopes.ts                           scope definitions
│   ├── pkce.ts                             SHA-256 verification
│   ├── jwt.ts                              JWT mint + verify
│   ├── codes.ts                            authorization code lifecycle
│   ├── tokens.ts                           refresh token rotation
│   └── clients.ts                          OAuth client registry
└── mcp/
    ├── server.ts                           MCP Server factory
    ├── tools.ts                            tool definitions
    ├── handlers.ts                         tool handlers (multi-tenant)
    └── scope-map.ts                        tool → scope mapping
```

## Multi-Tenancy

The vectorless-server is single-tenant. The MCP layer enforces per-user isolation:

1. On ingest, the MCP records `(document_id, user_id)` in its own `mcp_document` table
2. Every handler that takes a `document_id` calls `assertDocumentOwned(userId, documentId)` before forwarding
3. Listing documents filters by ownership in our DB before enriching with server data

## Deployment

This deploys cleanly to Vercel:

1. Connect the GitHub repo
2. Add the Neon Postgres integration (sets `DATABASE_URL` automatically)
3. Add the other env vars in Project Settings → Environment Variables
4. Push to main → deploys

For production, point `mcp.vectorless.store` DNS at the Vercel project.

## License

Proprietary — internal use only.
