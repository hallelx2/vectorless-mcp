import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // .well-known files at app root work via app/.well-known/* routes.
  // No special headers needed for MCP — clients send JSON-RPC over POST.
};

export default config;
