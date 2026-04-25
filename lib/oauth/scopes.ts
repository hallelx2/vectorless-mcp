/**
 * OAuth scopes supported by the Vectorless MCP server.
 *
 * MCP clients request these during the authorization flow.
 * Each tool is mapped to a required scope in lib/mcp/scope-map.ts.
 */
export const SCOPES = {
  documentsRead: "documents:read",
  documentsWrite: "documents:write",
  query: "query",
} as const;

export const ALL_SCOPES: readonly string[] = Object.values(SCOPES);

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

/**
 * Human-readable description of each scope, shown on the consent screen.
 */
export const SCOPE_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  [SCOPES.documentsRead]: {
    label: "Read your documents",
    description:
      "List documents, view their structure, and read section content.",
  },
  [SCOPES.documentsWrite]: {
    label: "Manage your documents",
    description: "Upload new documents and delete existing ones.",
  },
  [SCOPES.query]: {
    label: "Query your documents",
    description:
      "Run natural-language questions against your documents using AI retrieval.",
  },
};

/**
 * Validate a space-separated scope string from an authorization request.
 * Returns an array of valid scopes; throws if any are unrecognized.
 */
export function parseScopes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const requested = raw.split(/\s+/).filter(Boolean);
  const invalid = requested.filter((s) => !ALL_SCOPES.includes(s));
  if (invalid.length > 0) {
    throw new Error(`Unsupported scopes: ${invalid.join(", ")}`);
  }
  return requested;
}
