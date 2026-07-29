import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { warmBindings } from "./runtime";

/** Prefer repository SQL helpers; this factory is kept for optional Drizzle usage. */
export async function getDb() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "Defina DATABASE_URL (Postgres no Render) para usar o cliente Drizzle.",
    );
  }

  await warmBindings();
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
      ? undefined
      : { rejectUnauthorized: false },
  });
  return drizzle(pool, { schema });
}
