import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { TOOLS } from "./tools";
import { TOOL_HANDLERS, makeContext } from "./handlers";
import { TOOL_SCOPE_MAP } from "./scope-map";

interface AuthContext {
  userId: string;
  scopes: string[];
}

/**
 * Build a fresh MCP Server instance for a single request.
 *
 * The server is configured with the requesting user's scopes — `tools/list`
 * is filtered, `tools/call` enforces scope before dispatching to handlers.
 */
export function createMcpServer(auth: AuthContext): Server {
  const server = new Server(
    {
      name: "vectorless",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // ── tools/list ── return only tools the user has scopes for
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const allowed = TOOLS.filter((tool) => {
      const required = TOOL_SCOPE_MAP[tool.name];
      return required && auth.scopes.includes(required);
    });
    return { tools: allowed };
  });

  // ── tools/call ── validate scope, run handler, return result
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const requiredScope = TOOL_SCOPE_MAP[name];
    if (!requiredScope) {
      return errorResult(`Unknown tool: ${name}`);
    }
    if (!auth.scopes.includes(requiredScope)) {
      return errorResult(`Scope "${requiredScope}" not granted`);
    }

    const handler = TOOL_HANDLERS[name];
    if (!handler) {
      return errorResult(`No handler for tool: ${name}`);
    }

    try {
      const ctx = makeContext(auth.userId);
      const result = await handler(ctx, args ?? {});
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      // Scrub internal API keys from error messages
      const safe = message
        .replace(/vl_[a-zA-Z0-9_]+/g, "vl_***")
        .replace(/Bearer [^\s]+/g, "Bearer ***");
      return errorResult(safe);
    }
  });

  return server;
}

function errorResult(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ error: message }),
      },
    ],
    isError: true,
  };
}
