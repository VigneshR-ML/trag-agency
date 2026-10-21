import { getDb } from "../../../db";
import { projects } from "../../../db/schema";
import { ensureSeedData, listProjects } from "../../../db/seed";
import { apiMessage } from "../../../lib/api-message";
import { requireStudio } from "../../../lib/studio-auth";

export const dynamic = "force-dynamic";
const message = (error: unknown) => apiMessage(error);

export async function GET() {
  try {
    await ensureSeedData();
    return Response.json({ projects: await listProjects() });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireStudio();
  if (denied) return denied;
  try {
    const body = await request.json() as Record<string, string | number | boolean | undefined>;
    for (const field of ["title", "slug", "category", "year", "summary", "imageUrl"]) {
      if (!String(body[field] ?? "").trim()) return Response.json({ error: `${field} is required` }, { status: 400 });
    }
    const [project] = await getDb().insert(projects).values({
      title: String(body.title).trim(),
      slug: String(body.slug).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      category: String(body.category).trim(),
      year: String(body.year).trim(),
      summary: String(body.summary).trim(),
      imageUrl: String(body.imageUrl).trim(),
      starred: Boolean(body.starred),
      sortOrder: Number(body.sortOrder) || 0,
    }).returning();
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}
