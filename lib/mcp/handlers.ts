import { VectorlessClient, NotFoundError } from "vectorless";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { mcpDocument } from "@/lib/db/schema";

/**
 * Tool handlers — each one validates ownership and calls the vectorless SDK.
 *
 * All multi-tenancy is enforced HERE: we look up `mcp_document` rows by
 * userId before forwarding any operation that references a document_id.
 */

interface HandlerContext {
  userId: string;
  client: VectorlessClient;
}

function buildClient(): VectorlessClient {
  return new VectorlessClient({
    baseUrl: process.env.VECTORLESS_API_URL || "http://localhost:8080",
    apiKey: process.env.VECTORLESS_SERVICE_API_KEY,
    timeout: 120_000,
  });
}

export function makeContext(userId: string): HandlerContext {
  return { userId, client: buildClient() };
}

/**
 * Verify that a document_id belongs to the requesting user.
 * Throws NotFoundError if it doesn't (we deliberately don't disclose
 * whether the doc exists for someone else).
 */
async function assertDocumentOwned(userId: string, documentId: string): Promise<void> {
  const [row] = await db
    .select({ id: mcpDocument.id })
    .from(mcpDocument)
    .where(
      and(eq(mcpDocument.userId, userId), eq(mcpDocument.id, documentId)),
    )
    .limit(1);

  if (!row) {
    throw new NotFoundError(`Document ${documentId} not found`);
  }
}

// ── Handlers ──

export async function handleListDocuments(
  ctx: HandlerContext,
  args: { limit?: number; cursor?: string; status?: string },
) {
  // Multi-tenant: fetch ONLY documents this user owns from our local table.
  // We then enrich with live metadata from vectorless-server.
  const owned = await db
    .select()
    .from(mcpDocument)
    .where(eq(mcpDocument.userId, ctx.userId))
    .orderBy(desc(mcpDocument.createdAt))
    .limit(args.limit ?? 50);

  const enriched = await Promise.all(
    owned.map(async (row) => {
      try {
        const doc = await ctx.client.getDocument(row.id);
        if (args.status && doc.status !== args.status) return null;
        return {
          id: doc.id,
          title: doc.title,
          status: doc.status,
          byte_size: doc.byte_size,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
        };
      } catch {
        // Doc was deleted on the server side — clean up our mapping
        return null;
      }
    }),
  );

  return {
    items: enriched.filter((d) => d !== null),
  };
}

export async function handleIngestDocument(
  ctx: HandlerContext,
  args: {
    source_url?: string;
    content_base64?: string;
    filename: string;
    wait_for_ready?: boolean;
  },
) {
  if (!args.source_url && !args.content_base64) {
    throw new Error("Provide either source_url or content_base64");
  }

  // Resolve content
  let bytes: Buffer;
  if (args.source_url) {
    const resp = await fetch(args.source_url);
    if (!resp.ok) {
      throw new Error(`Failed to fetch source_url: HTTP ${resp.status}`);
    }
    bytes = Buffer.from(await resp.arrayBuffer());
  } else {
    bytes = Buffer.from(args.content_base64!, "base64");
  }

  // Tag with our user_id in metadata (defense in depth — local table is primary)
  const result = await ctx.client.ingestDocument(bytes, {
    filename: args.filename,
    metadata: { mcp_user_id: ctx.userId },
  });

  // Record ownership in our local table
  await db.insert(mcpDocument).values({
    id: result.document_id,
    userId: ctx.userId,
    title: args.filename,
  });

  if (args.wait_for_ready) {
    const doc = await ctx.client.waitForReady(result.document_id, {
      timeout: 120_000,
    });
    return {
      document_id: doc.id,
      status: doc.status,
      title: doc.title,
    };
  }

  return {
    document_id: result.document_id,
    status: result.status,
  };
}

export async function handleGetDocument(
  ctx: HandlerContext,
  args: { document_id: string },
) {
  await assertDocumentOwned(ctx.userId, args.document_id);
  return ctx.client.getDocument(args.document_id);
}

export async function handleGetTree(
  ctx: HandlerContext,
  args: { document_id: string },
) {
  await assertDocumentOwned(ctx.userId, args.document_id);
  return ctx.client.getDocumentTree(args.document_id);
}

export async function handleGetSection(
  ctx: HandlerContext,
  args: { section_id: string },
) {
  // Sections don't have user_id; we verify the parent document is owned.
  const section = await ctx.client.getSection(args.section_id);
  await assertDocumentOwned(ctx.userId, section.document_id);
  return section;
}

export async function handleQuery(
  ctx: HandlerContext,
  args: { document_id: string; query: string; max_sections?: number },
) {
  await assertDocumentOwned(ctx.userId, args.document_id);
  return ctx.client.query(args.document_id, args.query, {
    maxSections: args.max_sections,
  });
}

export async function handleDeleteDocument(
  ctx: HandlerContext,
  args: { document_id: string },
) {
  await assertDocumentOwned(ctx.userId, args.document_id);

  await ctx.client.deleteDocument(args.document_id);

  // Clean up our local mapping
  await db
    .delete(mcpDocument)
    .where(
      and(
        eq(mcpDocument.userId, ctx.userId),
        eq(mcpDocument.id, args.document_id),
      ),
    );

  return { document_id: args.document_id, deleted: true };
}

export const TOOL_HANDLERS: Record<
  string,
  (ctx: HandlerContext, args: any) => Promise<unknown>
> = {
  vectorless_list_documents: handleListDocuments,
  vectorless_ingest_document: handleIngestDocument,
  vectorless_get_document: handleGetDocument,
  vectorless_get_tree: handleGetTree,
  vectorless_get_section: handleGetSection,
  vectorless_query: handleQuery,
  vectorless_delete_document: handleDeleteDocument,
};
