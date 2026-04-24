<h1 align="center">
  <code>@vectorless/mcp</code>
</h1>

<p align="center">
  <strong>MCP server for Vectorless — give AI agents access to structure-preserving document retrieval.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@vectorless/mcp"><img src="https://img.shields.io/npm/v/@vectorless/mcp?style=flat-square&logo=npm&logoColor=white&color=CB3837" alt="npm" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-compatible-4A90D9?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PHBhdGggZD0iTTggMTJoOCIvPjxwYXRoIGQ9Ik0xMiA4djgiLz48L3N2Zz4=" alt="MCP" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node 18+" />
</p>

---

## What is this?

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that lets AI assistants — Claude, Cursor, Windsurf, and any MCP-compatible client — interact with your Vectorless document retrieval system.

Upload documents, explore their structure, and query them with natural language — all through your AI assistant.

```
┌─────────────────────────────────────────────────┐
│              AI Assistant                        │
│  (Claude Desktop / Cursor / Windsurf / etc.)     │
├─────────────────────────────────────────────────┤
│              MCP Protocol (stdio)                │
├─────────────────────────────────────────────────┤
│              @vectorless/mcp                     │
│                                                  │
│  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  7 Tools         │  │  vectorless SDK     │  │
│  │  list, ingest,   │  │  (npm: vectorless)  │  │
│  │  tree, section,  │  │  HTTP or Connect    │  │
│  │  query, delete   │  │  transport          │  │
│  └─────────────────┘  └──────────┬──────────┘  │
│                                   │              │
├───────────────────────────────────┼──────────────┤
│                    Vectorless Server              │
│         (self-hosted or api.vectorless.dev)       │
└─────────────────────────────────────────────────┘
```

## Quick Start

### npx (no install)

```bash
VECTORLESS_API_KEY=vl_... npx @vectorless/mcp
```

### Global install

```bash
npm install -g @vectorless/mcp
VECTORLESS_API_KEY=vl_... vectorless-mcp
```

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "vectorless": {
      "command": "npx",
      "args": ["-y", "@vectorless/mcp"],
      "env": {
        "VECTORLESS_API_KEY": "vl_...",
        "VECTORLESS_BASE_URL": "http://localhost:8080"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "vectorless": {
      "command": "npx",
      "args": ["-y", "@vectorless/mcp"],
      "env": {
        "VECTORLESS_API_KEY": "vl_...",
        "VECTORLESS_BASE_URL": "http://localhost:8080"
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "vectorless": {
      "command": "npx",
      "args": ["-y", "@vectorless/mcp"],
      "env": {
        "VECTORLESS_API_KEY": "vl_...",
        "VECTORLESS_BASE_URL": "http://localhost:8080"
      }
    }
  }
}
```

### Claude Code

Add to `.claude/settings.json`:

```json
{
  "mcpServers": {
    "vectorless": {
      "command": "npx",
      "args": ["-y", "@vectorless/mcp"],
      "env": {
        "VECTORLESS_API_KEY": "vl_...",
        "VECTORLESS_BASE_URL": "http://localhost:8080"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VECTORLESS_API_KEY` | For deployed | — | Bearer token for authentication |
| `VECTORLESS_BASE_URL` | No | `http://localhost:8080` | Server URL |
| `VECTORLESS_TRANSPORT` | No | `http` | Wire protocol (`http` or `connect`) |

## Available Tools

### `vectorless_list_documents`

List all documents with pagination and status filtering.

```
> List my documents

Found 3 documents:
- "ML Research Paper" (ready, 245KB)
- "API Documentation" (ready, 89KB)
- "Quarterly Report" (processing)
```

### `vectorless_ingest_document`

Upload a document from a URL or base64 content.

```
> Upload this paper: https://example.com/paper.pdf

Ingesting paper.pdf...
Status: pending → parsing → summarizing → ready
Document doc_abc123 is ready (12 sections, 45,230 tokens)
```

### `vectorless_get_tree`

Explore the document's hierarchical structure.

```
> Show me the structure of doc_abc123

Introduction (1,245 tokens)
  Background (890 tokens)
  Related Work (2,100 tokens)
Methodology (3,450 tokens)
  Data Collection (1,200 tokens)
  Model Architecture (2,250 tokens)
Results (4,100 tokens)
  Quantitative (2,300 tokens)
  Qualitative (1,800 tokens)
Conclusion (980 tokens)
```

### `vectorless_get_section`

Fetch the full content of a specific section.

```
> Show me the Methodology section

## Methodology
We employed a mixed-methods approach combining quantitative analysis
with qualitative interviews. Our dataset consists of...
[full section content]
```

### `vectorless_query`

Ask a question — the LLM finds the most relevant sections.

```
> What model architecture was used?

Found 2 relevant sections (chunked-tree strategy, 340ms):

[Model Architecture]
We use a transformer-based encoder with 12 attention heads...

[Results - Quantitative]
The model achieved 94.2% accuracy on the test set...
```

### `vectorless_delete_document`

Permanently delete a document.

```
> Delete doc_abc123

Document doc_abc123 has been permanently deleted.
```

## How It Works

1. **Ingest** — upload documents (PDF, DOCX, MD, HTML, TXT). Vectorless parses them into hierarchical trees and summarizes each section.

2. **Explore** — use `get_tree` to see the document outline. Use `get_section` to read specific sections.

3. **Query** — ask natural language questions. An LLM navigates the tree structure to find the most relevant sections — no embeddings, no vector databases.

4. **Retrieve** — get full section content with complete context preserved. Every section is citation-ready.

## License

MIT
