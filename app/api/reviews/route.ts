import { requireAdmin } from "../../../lib/admin-auth";
import { handle, readJson } from "../../../lib/api";
import { createReview } from "../../../lib/content";

export const dynamic = "force-dynamic";

/** Admin-only write. Prefer /api/admin/reviews, which shares this handler. */
export async function POST(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    const review = await createReview(await readJson(request));
    return Response.json({ review }, { status: 201 });
  });
}
