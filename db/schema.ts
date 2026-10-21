import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, text, uniqueIndex } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  year: text("year").notNull(),
  summary: text("summary").notNull(),
  imageUrl: text("image_url").notNull(),
  starred: boolean("starred").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`now()::text`),
  updatedAt: text("updated_at").notNull().default(sql`now()::text`),
}, (table) => [uniqueIndex("projects_slug_unique").on(table.slug)]);

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  quote: text("quote").notNull(),
  author: text("author").notNull(),
  role: text("role").notNull(),
  rating: integer("rating").notNull().default(5),
  createdAt: text("created_at").notNull().default(sql`now()::text`),
});

export type ProjectRow = typeof projects.$inferSelect;
export type ReviewRow = typeof reviews.$inferSelect;
