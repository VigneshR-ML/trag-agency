import { requireAdmin } from "../../../../lib/admin-auth";
import { handle, readJson } from "../../../../lib/api";
import { deleteReview, parseId, updateReview } from "../../../../lib/content";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return handle(async () => {
    await requireAdmin(request);
    const { id } = await context.params;
    const review = await updateReview(parseId(id, "review id"), await readJson(request));
    return Response.json({ review });
  });
}

export async function DELETE(request: Request, context: Context) {
  return handle(async () => {
    await requireAdmin(request);
    const { id } = await context.params;
    return Response.json({ review: await deleteReview(parseId(id, "review id")) });
  });
}
