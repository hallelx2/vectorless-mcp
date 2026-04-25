export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">Vectorless MCP</h1>
        <p className="text-xl text-foreground/70">
          Remote Model Context Protocol server for Vectorless.
        </p>
        <p className="text-foreground/60">
          Give your AI assistant access to structure-preserving document
          retrieval. Add this URL to your MCP client config:
        </p>
        <pre className="rounded-lg border bg-foreground/5 p-4 text-sm text-left overflow-x-auto">
          {`{
  "mcpServers": {
    "vectorless": {
      "url": "https://mcp.vectorless.store/api/mcp"
    }
  }
}`}
        </pre>
        <div className="flex gap-4 justify-center pt-4">
          <a
            href="/login"
            className="px-6 py-3 rounded-lg bg-foreground text-background font-medium hover:opacity-90 transition"
          >
            Sign in
          </a>
          <a
            href="https://docs.vectorless.store/mcp"
            className="px-6 py-3 rounded-lg border font-medium hover:bg-foreground/5 transition"
          >
            Documentation
          </a>
        </div>
      </div>
    </main>
  );
}
