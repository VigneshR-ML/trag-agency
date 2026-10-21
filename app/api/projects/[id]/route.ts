import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { projects } from "../../../../db/schema";
import { apiMessage } from "../../../../lib/api-message";
import { requireStudio } from "../../../../lib/studio-auth";

const message = (error: unknown) => apiMessage(error);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireStudio();
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, string | number | boolean | undefined>;
    const str = (value: string | number | boolean | undefined) => {
      const trimmed = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
      return trimmed ? trimmed : undefined;
    };
    const values = Object.fromEntries(Object.entries({
      title: str(body.title),
      slug: typeof body.slug === "string" && body.slug.trim()
        ? body.slug.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")
        : undefined,
      category: str(body.category),
      year: str(body.year),
      summary: str(body.summary),
      imageUrl: str(body.imageUrl),
      starred: typeof body.starred === "boolean" ? body.starred : undefined,
      sortOrder: body.sortOrder == null || body.sortOrder === "" ? undefined : Number(body.sortOrder),
      updatedAt: new Date().toISOString(),
    }).filter(([, value]) => value !== undefined));
    const [project] = await getDb().update(projects).set(values).where(eq(projects.id, Number(id))).returning();
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
    return Response.json({ project });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireStudio();
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const [project] = await getDb().delete(projects).where(eq(projects.id, Number(id))).returning();
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
    return Response.json({ project });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}
