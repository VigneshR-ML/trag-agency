import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { reviews } from "../../../db/schema";
import { apiMessage } from "../../../lib/api-message";
import { requireStudio } from "../../../lib/studio-auth";

export const dynamic = "force-dynamic";
const message = (error: unknown) => apiMessage(error);

export async function GET(request: Request) {
  try {
    const projectId = new URL(request.url).searchParams.get("projectId");
    const rows = projectId
      ? await getDb().select().from(reviews).where(eq(reviews.projectId, Number(projectId))).orderBy(asc(reviews.id))
      : await getDb().select().from(reviews).orderBy(asc(reviews.id));
    return Response.json({ reviews: rows });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await requireStudio();
  if (denied) return denied;
  try {
    const body = await request.json() as Record<string, string | number | undefined>;
    if (!body.projectId || !String(body.quote ?? "").trim() || !String(body.author ?? "").trim()) {
      return Response.json({ error: "projectId, quote and author are required" }, { status: 400 });
    }
    const [review] = await getDb().insert(reviews).values({
      projectId: Number(body.projectId),
      quote: String(body.quote).trim(),
      author: String(body.author).trim(),
      role: String(body.role ?? "Client").trim() || "Client",
      rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
    }).returning();
    return Response.json({ review }, { status: 201 });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}
