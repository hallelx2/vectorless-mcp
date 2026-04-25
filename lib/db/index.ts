import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = neon(process.env.DATABASE_URL);

/**
 * Drizzle ORM client connected to Neon Postgres.
 *
 * Edge-runtime compatible: uses HTTP fetch under the hood, no persistent
 * connection pool, perfect for Vercel serverless / edge functions.
 */
export const db = drizzle(sql, { schema });

export { schema };
