import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { VectorlessClient } from "vectorless";
import { z } from "zod";

import { tools } from "./tools.js";
import {
  listDocumentsSchema,
  ingestDocumentSchema,
  getDocumentSchema,
  getTreeSchema,
  getSectionSchema,
  querySchema,
  deleteDocumentSchema,
} from "./schemas.js";
import {
  handleListDocuments,
  handleIngestDocument,
  handleGetDocument,
  handleGetTree,
  handleGetSection,
  handleQuery,
  handleDeleteDocument,
} from "./handlers.js";

// ── Configuration ──

const apiKey = process.env.VECTORLESS_API_KEY;
const baseUrl = process.env.VECTORLESS_BASE_URL ?? "http://localhost:8080";
const transport = (process.env.VECTORLESS_TRANSPORT ?? "http") as "http" | "connect";

if (!apiKey && baseUrl.includes("vectorless.dev")) {
  console.error(
    "Error: VECTORLESS_API_KEY is required for deployed instances.\n" +
      "Set it in your environment or MCP client configuration.\n" +
      "For self-hosted instances, the API key is optional."
  );
  process.exit(1);
}

// ── Client ──

const client = new VectorlessClient({
  apiKey,
  baseUrl,
  transport,
  timeout: 120_000, // generous timeout for ingestion
});

// ── MCP Server ──

const server = new Server(
  {
    name: "vectorless",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ── List Tools ──

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// ── Call Tool ──

const schemaMap: Record<string, z.ZodType<any>> = {
  vectorless_list_documents: listDocumentsSchema,
  vectorless_ingest_document: ingestDocumentSchema,
  vectorless_get_document: getDocumentSchema,
  vectorless_get_tree: getTreeSchema,
  vectorless_get_section: getSectionSchema,
  vectorless_query: querySchema,
  vectorless_delete_document: deleteDocumentSchema,
};

const handlerMap: Record<string, (client: VectorlessClient, args: any) => Promise<any>> = {
  vectorless_list_documents: handleListDocuments,
  vectorless_ingest_document: handleIngestDocument,
  vectorless_get_document: handleGetDocument,
  vectorless_get_tree: handleGetTree,
  vectorless_get_section: handleGetSection,
  vectorless_query: handleQuery,
  vectorless_delete_document: handleDeleteDocument,
};

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;

  const schema = schemaMap[name];
  const handler = handlerMap[name];

  if (!schema || !handler) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: `Unknown tool: ${name}` }),
        },
      ],
      isError: true,
    };
  }

  try {
    // Validate input
    const args = schema.parse(rawArgs ?? {});

    // Execute
    const result = await handler(client, args);

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    // Scrub sensitive data from error messages
    let message = error.message ?? String(error);
    message = message.replace(/vl_[a-zA-Z0-9_]+/g, "vl_***");
    message = message.replace(/sk-[a-zA-Z0-9_-]+/g, "sk-***");
    message = message.replace(/Bearer [^\s]+/g, "Bearer ***");

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: message,
            code: error.code ?? "unknown",
            status: error.status ?? undefined,
          }),
        },
      ],
      isError: true,
    };
  }
});

// ── Start ──

async function main() {
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
  console.error(`Vectorless MCP server running (${baseUrl}, transport=${transport})`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
