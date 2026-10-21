import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: url ?? "postgres://postgres:postgres@127.0.0.1:5432/postgres",
  },
  strict: true,
  verbose: true,
});
