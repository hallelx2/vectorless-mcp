import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Vectorless MCP",
  description:
    "Remote Model Context Protocol server for Vectorless — give AI agents access to structure-preserving document retrieval.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
