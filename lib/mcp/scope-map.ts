import { SCOPES } from "@/lib/oauth/scopes";

/**
 * Maps each MCP tool to the OAuth scope that grants permission to call it.
 *
 * The MCP server filters `tools/list` to only those scopes the user granted,
 * and rejects `tools/call` for any tool whose scope wasn't approved.
 */
export const TOOL_SCOPE_MAP: Record<string, string> = {
  vectorless_list_documents: SCOPES.documentsRead,
  vectorless_get_document: SCOPES.documentsRead,
  vectorless_get_tree: SCOPES.documentsRead,
  vectorless_get_section: SCOPES.documentsRead,
  vectorless_ingest_document: SCOPES.documentsWrite,
  vectorless_delete_document: SCOPES.documentsWrite,
  vectorless_query: SCOPES.query,
};
