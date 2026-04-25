import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ── Better Auth managed tables ─────────────────────────────────────
//
// These four tables are managed by Better Auth itself. The shapes match
// Better Auth's drizzle adapter expectations.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── OAuth 2.1 Server tables ────────────────────────────────────────
//
// We implement an OAuth 2.1 server for MCP clients (Claude, Cursor, etc.).
// These tables track registered clients, codes, tokens, and consents.

/**
 * Dynamically registered OAuth clients (RFC 7591).
 *
 * Each row is a registered MCP client (e.g. one per Claude Desktop installation).
 */
export const oauthClient = pgTable("oauth_client", {
  id: text("id").primaryKey(), // generated client_id, e.g. "oac_..."
  name: text("name").notNull(), // human-readable client name
  redirectUris: jsonb("redirect_uris").$type<string[]>().notNull(),
  grantTypes: jsonb("grant_types").$type<string[]>().notNull(),
  tokenEndpointAuthMethod: text("token_endpoint_auth_method").notNull().default("none"),
  // Logo, policy, TOS URIs from RFC 7591 — optional metadata
  logoUri: text("logo_uri"),
  clientUri: text("client_uri"),
  policyUri: text("policy_uri"),
  tosUri: text("tos_uri"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Authorization codes (single-use, short-lived).
 *
 * Stored as SHA-256 hash so the raw code never sits in the DB.
 * Created during /oauth/authorize, exchanged at /oauth/token.
 */
export const oauthAuthorizationCode = pgTable(
  "oauth_authorization_code",
  {
    codeHash: text("code_hash").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    redirectUri: text("redirect_uri").notNull(),
    codeChallenge: text("code_challenge").notNull(),
    codeChallengeMethod: text("code_challenge_method").notNull().default("S256"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    expiresIdx: index("oauth_code_expires_idx").on(t.expiresAt),
  })
);

/**
 * Refresh tokens (long-lived, opaque, hashed).
 *
 * Issued at /oauth/token. Rotated on every use (parent_id chain tracks history).
 */
export const oauthRefreshToken = pgTable(
  "oauth_refresh_token",
  {
    tokenHash: text("token_hash").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    parentHash: text("parent_hash"), // previous refresh token in the rotation chain
    revokedAt: timestamp("revoked_at"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("oauth_refresh_user_idx").on(t.userId),
    expiresIdx: index("oauth_refresh_expires_idx").on(t.expiresAt),
  })
);

/**
 * User consent records — which user has granted which scopes to which client.
 *
 * Lets us skip the consent screen on subsequent logins if scopes are unchanged.
 */
export const oauthConsent = pgTable(
  "oauth_consent",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    clientId: text("client_id")
      .notNull()
      .references(() => oauthClient.id, { onDelete: "cascade" }),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    grantedAt: timestamp("granted_at").notNull().defaultNow(),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => ({
    userClientIdx: uniqueIndex("oauth_consent_user_client_idx").on(t.userId, t.clientId),
  })
);

/**
 * Revoked JWT access token JTIs (blacklist).
 *
 * Access tokens are JWTs validated stateless. To support revocation we keep
 * a blacklist of revoked JTIs until they would have expired anyway.
 */
export const oauthRevokedJti = pgTable("oauth_revoked_jti", {
  jti: text("jti").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at").notNull().defaultNow(),
});

// ── MCP Application State ──────────────────────────────────────────

/**
 * Per-user mapping of vectorless-server document IDs.
 *
 * Implements multi-tenancy: when a user uploads via MCP, we record
 * which vectorless-server document_id belongs to them. All MCP tool
 * calls verify ownership through this table before forwarding.
 */
export const mcpDocument = pgTable(
  "mcp_document",
  {
    id: text("id").primaryKey(), // vectorless-server document_id
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("mcp_document_user_idx").on(t.userId),
  })
);

// Type exports for convenience
export type User = typeof user.$inferSelect;
export type OAuthClient = typeof oauthClient.$inferSelect;
export type OAuthAuthorizationCode = typeof oauthAuthorizationCode.$inferSelect;
export type OAuthRefreshToken = typeof oauthRefreshToken.$inferSelect;
export type OAuthConsent = typeof oauthConsent.$inferSelect;
export type McpDocument = typeof mcpDocument.$inferSelect;
