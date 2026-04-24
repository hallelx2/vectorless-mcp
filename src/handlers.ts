import { VectorlessClient } from "vectorless";
import type {
  Document,
  DocumentTree,
  Section,
  QueryResponse,
  ListDocumentsResponse,
  IngestDocumentResponse,
} from "vectorless";

// ── List Documents ──

export async function handleListDocuments(
  client: VectorlessClient,
  args: { limit?: number; cursor?: string; status?: string }
): Promise<ListDocumentsResponse> {
  return client.listDocuments({
    limit: args.limit,
    cursor: args.cursor,
    status: args.status as any,
  });
}

// ── Ingest Document ──

export async function handleIngestDocument(
  client: VectorlessClient,
  args: {
    source: string;
    filename?: string;
    metadata?: Record<string, string>;
    wait?: boolean;
  }
): Promise<Document | IngestDocumentResponse> {
  let content: Buffer | Blob;
  let filename = args.filename;

  if (args.source.startsWith("http://") || args.source.startsWith("https://")) {
    // Fetch URL content
    const response = await fetch(args.source);
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    content = Buffer.from(arrayBuffer);

    // Guess filename from URL if not provided
    if (!filename) {
      const urlPath = new URL(args.source).pathname;
      filename = urlPath.split("/").pop() || "document";
    }
  } else {
    // Base64-encoded content
    content = Buffer.from(args.source, "base64");
    if (!filename) {
      filename = "document";
    }
  }

  const result = await client.ingestDocument(content, {
    filename,
    metadata: args.metadata,
  });

  if (args.wait !== false) {
    return client.waitForReady(result.document_id, {
      timeout: 120_000,
      onProgress: () => {},
    });
  }

  return result;
}

// ── Get Document ──

export async function handleGetDocument(
  client: VectorlessClient,
  args: { document_id: string }
): Promise<Document> {
  return client.getDocument(args.document_id);
}

// ── Get Document Tree ──

export async function handleGetTree(
  client: VectorlessClient,
  args: { document_id: string }
): Promise<DocumentTree> {
  return client.getDocumentTree(args.document_id);
}

// ── Get Section ──

export async function handleGetSection(
  client: VectorlessClient,
  args: { section_id: string }
): Promise<Section> {
  return client.getSection(args.section_id);
}

// ── Query ──

export async function handleQuery(
  client: VectorlessClient,
  args: { document_id: string; query: string; max_sections?: number }
): Promise<QueryResponse> {
  return client.query(args.document_id, args.query, {
    maxSections: args.max_sections,
  });
}

// ── Delete Document ──

export async function handleDeleteDocument(
  client: VectorlessClient,
  args: { document_id: string }
): Promise<{ success: true; document_id: string; message: string }> {
  await client.deleteDocument(args.document_id);
  return {
    success: true,
    document_id: args.document_id,
    message: `Document ${args.document_id} has been permanently deleted.`,
  };
}
