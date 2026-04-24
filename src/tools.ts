import { zodToJsonSchema } from "zod-to-json-schema";
import {
  listDocumentsSchema,
  ingestDocumentSchema,
  getDocumentSchema,
  getTreeSchema,
  getSectionSchema,
  querySchema,
  deleteDocumentSchema,
} from "./schemas.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const tools: ToolDefinition[] = [
  {
    name: "vectorless_list_documents",
    description:
      "List all documents in Vectorless with their processing status. " +
      "Returns document IDs, titles, status (pending/parsing/summarizing/ready/failed), " +
      "and metadata. Supports pagination and status filtering.",
    inputSchema: zodToJsonSchema(listDocumentsSchema) as Record<string, unknown>,
  },
  {
    name: "vectorless_ingest_document",
    description:
      "Upload and ingest a document into Vectorless. Accepts a URL or base64-encoded file. " +
      "Supported formats: PDF, DOCX, Markdown, HTML, plain text. " +
      "The document is parsed into a hierarchical tree of sections with summaries. " +
      "By default waits for processing to complete before returning.",
    inputSchema: zodToJsonSchema(ingestDocumentSchema) as Record<string, unknown>,
  },
  {
    name: "vectorless_get_document",
    description:
      "Get metadata and processing status for a specific document. " +
      "Returns the document ID, title, content type, status, byte size, and timestamps.",
    inputSchema: zodToJsonSchema(getDocumentSchema) as Record<string, unknown>,
  },
  {
    name: "vectorless_get_tree",
    description:
      "Get the hierarchical document tree — the structural outline of the document. " +
      "Returns sections with IDs, titles, summaries, depth, parent/child relationships, " +
      "and token counts. Does NOT include full section content (use vectorless_get_section for that). " +
      "Use this to understand document structure before querying or fetching specific sections.",
    inputSchema: zodToJsonSchema(getTreeSchema) as Record<string, unknown>,
  },
  {
    name: "vectorless_get_section",
    description:
      "Fetch a single section with its FULL content. " +
      "Use after inspecting the document tree to retrieve specific sections by ID. " +
      "Returns the section title, summary, content, token count, and position in the tree.",
    inputSchema: zodToJsonSchema(getSectionSchema) as Record<string, unknown>,
  },
  {
    name: "vectorless_query",
    description:
      "Query a document using natural language — an LLM navigates the document tree " +
      "to find and return the most relevant sections with full content. " +
      "Returns the retrieval strategy used, matched sections, time taken, and token usage/cost. " +
      "This is the primary way to find information in a document.",
    inputSchema: zodToJsonSchema(querySchema) as Record<string, unknown>,
  },
  {
    name: "vectorless_delete_document",
    description:
      "Permanently delete a document and all its sections. This action is irreversible.",
    inputSchema: zodToJsonSchema(deleteDocumentSchema) as Record<string, unknown>,
  },
];
