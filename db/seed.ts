import { asc, eq } from "drizzle-orm";
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

export async function ensureSeedData() {
  const db = getDb();
  const existing = await db.select({ id: projects.id }).from(projects).limit(1);
  if (existing.length) return;

  for (const item of defaults) {
    await db.insert(projects).values({
      slug: item.slug,
      title: item.title,
      category: item.category,
      year: item.year,
      summary: item.summary,
      imageUrl: item.imageUrl,
      starred: true,
      sortOrder: item.sortOrder,
    }).onConflictDoNothing();

    const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, item.slug));
    if (project) await db.insert(reviews).values({ projectId: project.id, ...item.review, rating: 5 }).onConflictDoNothing();
  }
}

export async function listProjects() {
  const db = getDb();
  const projectRows = await db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.id));
  const reviewRows = await db.select().from(reviews).orderBy(asc(reviews.id));
  return projectRows.map((project) => ({
    ...project,
    reviews: reviewRows.filter((review) => review.projectId === project.id),
  }));
}
