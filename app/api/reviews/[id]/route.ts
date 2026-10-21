import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { reviews } from "../../../../db/schema";
import { apiMessage } from "../../../../lib/api-message";
import { requireStudio } from "../../../../lib/studio-auth";

const message = (error: unknown) => apiMessage(error);

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireStudio();
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const body = await request.json() as Record<string, string | number | undefined>;
    const str = (value: string | number | undefined) => {
      const trimmed = value == null ? "" : String(value).trim();
      return trimmed ? trimmed : undefined;
    };
    const values = Object.fromEntries(Object.entries({
      quote: str(body.quote),
      author: str(body.author),
      role: str(body.role),
      rating: body.rating == null || body.rating === "" ? undefined : Math.min(5, Math.max(1, Number(body.rating))),
    }).filter(([, value]) => value !== undefined));
    const [review] = await getDb().update(reviews).set(values).where(eq(reviews.id, Number(id))).returning();
    if (!review) return Response.json({ error: "Review not found" }, { status: 404 });
    return Response.json({ review });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireStudio();
  if (denied) return denied;
  try {
    const { id } = await context.params;
    const [review] = await getDb().delete(reviews).where(eq(reviews.id, Number(id))).returning();
    if (!review) return Response.json({ error: "Review not found" }, { status: 404 });
    return Response.json({ review });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}
