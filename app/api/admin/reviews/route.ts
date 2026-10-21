import { requireAdmin } from "../../../../lib/admin-auth";
import { handle, readJson } from "../../../../lib/api";
import { createReview, listAllReviews } from "../../../../lib/content";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    return Response.json({ reviews: await listAllReviews() });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    const review = await createReview(await readJson(request));
    return Response.json({ review }, { status: 201 });
  });
}
