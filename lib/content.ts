import { and, asc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db";
import { projects, reviews } from "../db/schema";
import { badRequest, conflict, notFound } from "./api";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Normalises a slug the same way for creates and updates. The previous code
 * only normalised on create, so an edited slug could keep upper case, spaces or
 * leading/trailing dashes and diverge from what the create route produced.
 *
 * Accents are folded first ("Café Project" -> "cafe-project") because stripping
 * the combining mark outright would silently produce "caf-project".
 */
export function normalizeSlug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const text = (field: string, max: number) =>
  z
    .string({ required_error: `${field} is required`, invalid_type_error: `${field} must be a string` })
    .trim()
    .min(1, `${field} is required`)
    .max(max, `${field} must be ${max} characters or fewer`);

const imageUrlField = z
  .string()
  .trim()
  .min(1, "imageUrl is required")
  .max(2048, "imageUrl must be 2048 characters or fewer")
  .refine((value) => value.startsWith("/") || /^https?:\/\//i.test(value), {
    message: "imageUrl must be a path starting with / or an http(s) URL",
  });


const sortOrder = z.coerce
  .number({ invalid_type_error: "sortOrder must be a number" })
  .int("sortOrder must be a whole number")
  .min(-100000, "sortOrder is out of range")
  .max(100000, "sortOrder is out of range");

const rating = z.coerce
  .number({ invalid_type_error: "rating must be a number" })
  .int("rating must be a whole number")
  .min(1, "rating must be between 1 and 5")
  .max(5, "rating must be between 1 and 5");

export const projectCreateSchema = z.object({
  title: text("title", 160),
  slug: text("slug", 160),
  category: text("category", 120),
  year: text("year", 20),
  summary: text("summary", 2000),
  imageUrl: imageUrlField,
  sortOrder: sortOrder.optional().default(0),
});

export const projectUpdateSchema = z
  .object({
    title: text("title", 160).optional(),
    slug: text("slug", 160).optional(),
    category: text("category", 120).optional(),
    year: text("year", 20).optional(),
    summary: text("summary", 2000).optional(),
    imageUrl: imageUrlField.optional(),
    sortOrder: sortOrder.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

export const reviewCreateSchema = z.object({
  projectId: z.coerce
    .number({ invalid_type_error: "projectId must be a number" })
    .int("projectId must be a whole number")
    .positive("projectId must be a positive number"),
  quote: text("quote", 2000),
  author: text("author", 160),
  role: text("role", 160).optional().default("Client"),
  rating: rating.optional().default(5),
});

export const reviewUpdateSchema = z
  .object({
    quote: text("quote", 2000).optional(),
    author: text("author", 160).optional(),
    role: text("role", 160).optional(),
    rating: rating.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one field to update",
  });

/** Projects with their reviews attached, ordered for display. */
export async function listProjectsWithReviews() {
  const db = getDb();
  const projectRows = await db
    .select()
    .from(projects)
    .orderBy(asc(projects.sortOrder), asc(projects.id));
  const reviewRows = await db.select().from(reviews).orderBy(asc(reviews.id));
  return projectRows.map((project) => ({
    ...project,
    reviews: reviewRows.filter((review) => review.projectId === project.id),
  }));
}

/** Rejects ids like `/api/projects/abc` with a 400 instead of a driver error. */
export function parseId(raw: string, label = "id"): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw badRequest(`Invalid ${label}`);
  }
  return id;
}

async function assertSlugAvailable(slug: string, excludeId?: number): Promise<void> {
  const [existing] = await getDb()
    .select({ id: projects.id })
    .from(projects)
    .where(excludeId ? and(eq(projects.slug, slug), ne(projects.id, excludeId)) : eq(projects.slug, slug))
    .limit(1);
  if (existing) throw conflict(`A project with the slug "${slug}" already exists`);
}

export async function createProject(input: unknown) {
  const data = projectCreateSchema.parse(input);
  const slug = normalizeSlug(data.slug);
  if (!SLUG_PATTERN.test(slug)) {
    throw badRequest("slug must contain letters or numbers, separated by single dashes");
  }
  await assertSlugAvailable(slug);

  const [project] = await getDb()
    .insert(projects)
    .values({ ...data, slug, updatedAt: new Date().toISOString() })
    .returning();
  return project;
}

export async function updateProject(id: number, input: unknown) {
  const data = projectUpdateSchema.parse(input);
  const values: Partial<typeof projects.$inferInsert> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (data.slug !== undefined) {
    const slug = normalizeSlug(data.slug);
    if (!SLUG_PATTERN.test(slug)) {
      throw badRequest("slug must contain letters or numbers, separated by single dashes");
    }
    await assertSlugAvailable(slug, id);
    values.slug = slug;
  }

  const [project] = await getDb()
    .update(projects)
    .set(values)
    .where(eq(projects.id, id))
    .returning();
  if (!project) throw notFound("Project not found");
  return project;
}

export async function deleteProject(id: number) {
  const [project] = await getDb().delete(projects).where(eq(projects.id, id)).returning();
  if (!project) throw notFound("Project not found");
  return project;
}

export async function getProject(id: number) {
  const [project] = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
  if (!project) throw notFound("Project not found");
  const projectReviews = await getDb()
    .select()
    .from(reviews)
    .where(eq(reviews.projectId, id))
    .orderBy(asc(reviews.id));
  return { ...project, reviews: projectReviews };
}

async function assertProjectExists(projectId: number): Promise<void> {
  const [project] = await getDb()
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  if (!project) throw notFound(`Project ${projectId} not found`);
}

export async function listAllReviews() {
  return getDb().select().from(reviews).orderBy(asc(reviews.id));
}

export async function createReview(input: unknown) {
  const data = reviewCreateSchema.parse(input);
  await assertProjectExists(data.projectId);

  const [review] = await getDb().insert(reviews).values(data).returning();
  return review;
}

export async function updateReview(id: number, input: unknown) {
  const data = reviewUpdateSchema.parse(input);
  const [review] = await getDb()
    .update(reviews)
    .set(data)
    .where(eq(reviews.id, id))
    .returning();
  if (!review) throw notFound("Review not found");
  return review;
}

export async function deleteReview(id: number) {
  const [review] = await getDb().delete(reviews).where(eq(reviews.id, id)).returning();
  if (!review) throw notFound("Review not found");
  return review;
}
