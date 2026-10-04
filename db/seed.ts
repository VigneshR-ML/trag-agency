import { eq } from "drizzle-orm";
import { getDb } from ".";
import { projects, reviews } from "./schema";

const defaults = [
  {
    slug: "hangover-shakes",
    title: "Hangover Shakes",
    category: "Hospitality website",
    year: "2026",
    summary: "A flavour-first café experience built to turn menu browsing into real footfall.",
    imageUrl: "/projects/hangover-shakes.png",
    sortOrder: 1,
    review: { quote: "TRAG made the brand feel as bold online as it does in the café.", author: "Hangover Shakes", role: "Founder team" },
  },
  {
    slug: "pulseboard",
    title: "Pulseboard",
    category: "Micro SaaS",
    year: "2026",
    summary: "A calm revenue and audience command centre for independent creators.",
    imageUrl: "/projects/pulseboard.png",
    sortOrder: 2,
    review: { quote: "The product finally feels simple, focused and ready to scale.", author: "Mira S.", role: "Product lead" },
  },
  {
    slug: "convo-ai",
    title: "Convo AI",
    category: "AI integration",
    year: "2026",
    summary: "A support workspace that connects human teams, knowledge and automated answers.",
    imageUrl: "/projects/convo-ai.png",
    sortOrder: 3,
    review: { quote: "Our support workflow became faster without losing the human touch.", author: "Arun K.", role: "Operations director" },
  },
];

/**
 * Inserts the starter portfolio the first time it runs.
 *
 * Safe to call on every public read: each project and review is checked before
 * insertion, so repeated calls never duplicate content and a partially seeded
 * database is topped up instead of skipped.
 */
export async function ensureSeedData() {
  const db = getDb();

  for (const item of defaults) {
    await db
      .insert(projects)
      .values({
        slug: item.slug,
        title: item.title,
        category: item.category,
        year: item.year,
        summary: item.summary,
        imageUrl: item.imageUrl,
        sortOrder: item.sortOrder,
      })
      .onConflictDoNothing();

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, item.slug))
      .limit(1);
    if (!project) continue;

    const [existingReview] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.projectId, project.id))
      .limit(1);
    if (existingReview) continue;

    await db
      .insert(reviews)
      .values({ projectId: project.id, ...item.review, rating: 5 });
  }
}
