<h1 align="center">
  <code>vectorless-mcp</code>
</h1>

<p align="center">
  <strong>MCP server for Vectorless — give AI agents access to structure-preserving document retrieval.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/vectorless-mcp"><img src="https://img.shields.io/npm/v/vectorless-mcp?style=flat-square&logo=npm&logoColor=white&color=CB3837" alt="npm" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-4A90D9?style=flat-square" alt="MCP" /></a>
  <img src="https://img.shields.io/badge/OAuth_2.1-PKCE-green?style=flat-square" alt="OAuth" />
  <img src="https://img.shields.io/badge/transport-Streamable_HTTP-blue?style=flat-square" alt="Streamable HTTP" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" /></a>
</p>

---

## How It Works

Vectorless provides a **remote MCP server** at `https://api.vectorless.store/mcp`. Your AI assistant connects to it directly over the internet — no local process, no API keys to manage.

Authentication uses **OAuth 2.1 with PKCE**: on first connect your AI client opens the Vectorless dashboard where you log in and approve access. After that, it just works.

```
┌──────────────────────────────────────────────────────────────┐
│        Claude Desktop / Cursor / Windsurf / Claude Code      │
│                                                              │
│   1. Add the remote MCP URL                                  │
│   2. OAuth redirect → Vectorless Dashboard (login + consent) │
│   3. Token issued → MCP session active                       │
│   4. AI calls tools via Streamable HTTP + SSE                │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │  Streamable HTTP + SSE
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                  api.vectorless.store/mcp                     │
│                                                              │
│   OAuth 2.1 (PKCE)          7 Tools                          │
│   ┌──────────────────┐      ┌──────────────────────────┐    │
│   │ /.well-known/    │      │ vectorless_list_documents │    │
│   │   oauth-*        │      │ vectorless_ingest_document│    │
│   │ /oauth/authorize │      │ vectorless_get_document   │    │
│   │ /oauth/token     │      │ vectorless_get_tree       │    │
│   │ /oauth/register  │      │ vectorless_get_section    │    │
│   └──────────────────┘      │ vectorless_query          │    │
│                              │ vectorless_delete_document│    │
│   Scopes:                    └──────────────────────────┘    │
│   • documents:read                                           │
│   • documents:write          Vectorless Engine               │
│   • query                    (retrieval + ingestion)         │
└──────────────────────────────────────────────────────────────┘
```

## Setup (Remote — Recommended)

Add the remote URL to your AI client config. **No installation needed.**

### Claude Desktop

`Settings → Developer → Edit Config`:

```json
{
  "mcpServers": {
    "vectorless": {
      "url": "https://api.vectorless.store/mcp"
    }
  }
}
```

### Cursor

`.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "vectorless": {
      "url": "https://api.vectorless.store/mcp"
    }
  }
}
```

### Windsurf

`~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "vectorless": {
      "url": "https://api.vectorless.store/mcp"
    }
  }
}
```

### Claude Code

`.claude/settings.json`:

```json
{
  "mcpServers": {
    "vectorless": {
      "url": "https://api.vectorless.store/mcp"
    }
  }
}
```

That's it. On first use, your AI client opens the Vectorless dashboard in your browser. Log in (Google, GitHub, or email), approve the permissions, and you're connected.

## OAuth Scopes

When you authorize, the consent screen shows these permissions:

| Scope | Grants access to |
|-------|-----------------|
| **`documents:read`** | List documents, get metadata, browse tree, fetch sections |
| **`documents:write`** | Upload new documents, delete existing ones |
| **`query`** | Run natural language queries against documents |

You choose which scopes to grant. The AI agent can only use tools matching your approved scopes.

## Available Tools

### `vectorless_list_documents`
List all your documents with status, metadata, and pagination.

### `vectorless_ingest_document`
Upload a document from a URL or base64 content. Supports PDF, DOCX, Markdown, HTML, plain text. Documents are parsed into hierarchical section trees with AI-generated summaries.

### `vectorless_get_document`
Get metadata and processing status for a document (pending → parsing → summarizing → ready).

### `vectorless_get_tree`
View the hierarchical outline — sections with titles, summaries, depth, and token counts. Use this to understand what's in a document before querying.

### `vectorless_get_section`
Fetch the full content of a specific section by ID.

### `vectorless_query`
Ask a natural language question. An LLM navigates the document tree to find and return the most relevant sections with full content, strategy, timing, and cost.

### `vectorless_delete_document`
Permanently delete a document and all its sections.

## Example Conversation

```
You:    Upload this paper: https://arxiv.org/pdf/2301.00001
Claude: [calls vectorless_ingest_document]
        Done — doc_abc123 is ready (14 sections, 48,200 tokens).

You:    What's the structure?
Claude: [calls vectorless_get_tree]
        Introduction (1,200 tokens)
          Background (800 tokens)
          Related Work (2,400 tokens)
        Methodology (3,600 tokens)
          Data Collection (1,100 tokens)
          Model Architecture (2,500 tokens)
        Results (4,200 tokens)
        Conclusion (900 tokens)

You:    What model architecture did they use?
Claude: [calls vectorless_query]
        Found 2 relevant sections (chunked-tree, 340ms):

        ## Model Architecture
        We employ a transformer-based encoder with 12 attention heads...

        ## Results
        The model achieved 94.2% accuracy on the benchmark...
```

## Fallback: Local Stdio Server

If your MCP client doesn't support remote servers, run the stdio bridge locally:

```bash
npx vectorless-mcp
```

```json
{
  "mcpServers": {
    "vectorless": {
      "command": "npx",
      "args": ["-y", "vectorless-mcp"],
      "env": {
        "VECTORLESS_API_KEY": "vl_..."
      }
    }
  }
}
```

| Variable | Default | Description |
|----------|---------|-------------|
| `VECTORLESS_API_KEY` | — | API key (required for remote, optional for self-hosted) |
| `VECTORLESS_BASE_URL` | `https://api.vectorless.store` | Server URL |
| `VECTORLESS_TRANSPORT` | `http` | Wire protocol (`http` or `connect`) |

## Self-Hosted

Point the MCP to your own Vectorless instance:

```json
{
  "mcpServers": {
    "vectorless": {
      "url": "https://your-server.com/mcp"
    }
  }
}
```

Or via stdio:

```json
{
  "mcpServers": {
    "vectorless": {
      "command": "npx",
      "args": ["-y", "vectorless-mcp"],
      "env": {
        "VECTORLESS_BASE_URL": "https://your-server.com",
        "VECTORLESS_API_KEY": "your-key"
      }
    }
  }
}
```

## License

MIT
