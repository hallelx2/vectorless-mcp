import type { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * MCP tool definitions exposed to AI clients.
 *
 * These are the JSON Schemas the AI sees when it calls `tools/list`.
 * Handlers in handlers.ts implement the actual logic.
 */
export const TOOLS: Tool[] = [
  {
    name: "vectorless_list_documents",
    description:
      "List documents the user has uploaded to Vectorless. Returns metadata only — call vectorless_get_tree for structure or vectorless_query for content.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max documents to return (1-200, default 50)",
        },
        cursor: {
          type: "string",
          description: "Cursor from a previous page",
        },
        status: {
          type: "string",
          enum: ["pending", "parsing", "summarizing", "ready", "failed"],
          description: "Filter by processing status",
        },
      },
    },
  },

  {
    name: "vectorless_ingest_document",
    description:
      "Upload a document (PDF, DOCX, MD, HTML, TXT) from a URL or base64-encoded content. Returns immediately with a document_id; the document goes through parsing → summarizing → ready. Use vectorless_get_document to check status.",
    inputSchema: {
      type: "object",
      properties: {
        source_url: {
          type: "string",
          description: "URL to fetch the document from",
        },
        content_base64: {
          type: "string",
          description: "Base64-encoded document content (alternative to source_url)",
        },
        filename: {
          type: "string",
          description: "Original filename (helps with format detection)",
        },
        wait_for_ready: {
          type: "boolean",
          description: "If true, wait until processing completes (up to 2 minutes). Default false.",
        },
      },
      required: ["filename"],
    },
  },

  {
    name: "vectorless_get_document",
    description:
      "Get metadata and processing status for a specific document.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string" },
      },
      required: ["document_id"],
    },
  },

  {
    name: "vectorless_get_tree",
    description:
      "Get the hierarchical structure of a document — sections with titles, summaries, depth, and token counts. Use this to understand what's in a document before querying it.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string" },
      },
      required: ["document_id"],
    },
  },

  {
    name: "vectorless_get_section",
    description:
      "Fetch the full text content of a specific section by ID.",
    inputSchema: {
      type: "object",
      properties: {
        section_id: { type: "string" },
      },
      required: ["section_id"],
    },
  },

  {
    name: "vectorless_query",
    description:
      "Ask a natural-language question about a document. An LLM navigates the document tree to find the most relevant sections and returns them with full content, retrieval strategy, timing, and cost.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string" },
        query: {
          type: "string",
          description: "The question to ask",
        },
        max_sections: {
          type: "number",
          description: "Cap on sections returned (0 = no cap, default)",
        },
      },
      required: ["document_id", "query"],
    },
  },

  {
    name: "vectorless_delete_document",
    description:
      "Permanently delete a document and all its sections.",
    inputSchema: {
      type: "object",
      properties: {
        document_id: { type: "string" },
      },
      required: ["document_id"],
    },
  },
];
