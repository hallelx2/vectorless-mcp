import { z } from "zod";

// ── List Documents ──

export const listDocumentsSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .default(25)
    .describe("Maximum number of documents to return (1-200)."),
  cursor: z
    .string()
    .optional()
    .describe("Pagination cursor from a previous response."),
  status: z
    .enum(["pending", "parsing", "summarizing", "ready", "failed"])
    .optional()
    .describe("Filter by processing status."),
});

// ── Ingest Document ──

export const ingestDocumentSchema = z.object({
  source: z
    .string()
    .describe(
      "Document source — either a URL (https://...) or base64-encoded file content."
    ),
  filename: z
    .string()
    .optional()
    .describe(
      "Original filename with extension (e.g. 'report.pdf'). Used for format detection."
    ),
  metadata: z
    .record(z.string())
    .optional()
    .describe("Key-value metadata to attach to the document."),
  wait: z
    .boolean()
    .default(true)
    .describe(
      "If true, wait for the document to finish processing before returning. " +
        "If false, return immediately with the document ID and 'pending' status."
    ),
});

// ── Get Document ──

export const getDocumentSchema = z.object({
  document_id: z.string().describe("The document ID."),
});

// ── Get Document Tree ──

export const getTreeSchema = z.object({
  document_id: z.string().describe("The document ID."),
});

// ── Get Section ──

export const getSectionSchema = z.object({
  section_id: z.string().describe("The section ID."),
});

// ── Query ──

export const querySchema = z.object({
  document_id: z.string().describe("The document ID to query."),
  query: z
    .string()
    .min(3)
    .describe("Natural language question about the document."),
  max_sections: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Maximum number of sections to retrieve."),
});

// ── Delete Document ──

export const deleteDocumentSchema = z.object({
  document_id: z
    .string()
    .describe("The document ID to delete. This action is irreversible."),
});
