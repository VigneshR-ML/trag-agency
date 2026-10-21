import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let client: postgres.Sql | undefined;
let database: Database | undefined;

function createClient(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is missing. Set it in .env.local (or your host's environment) to the Supabase Postgres connection string before using the database."
    );
  }

  return postgres(url, {
    // Supabase's transaction pooler does not support prepared statements.
    prepare: false,
    ssl: url.includes("sslmode=disable") ? false : "require",
    max: Number(process.env.PG_POOL_MAX ?? 5),
    connect_timeout: 10,
  });
}

export function getDb(): Database {
  if (!database) {
    const cached = globalThis as typeof globalThis & { __tragDb?: Database; __tragSql?: postgres.Sql };
    if (cached.__tragDb && cached.__tragSql) {
      database = cached.__tragDb;
      client = cached.__tragSql;
    } else {
      client = createClient();
      database = drizzle(client, { schema });
      cached.__tragDb = database;
      cached.__tragSql = client;
    }
  }
  return database;
}
