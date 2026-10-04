import { requireAdmin } from "../../../../lib/admin-auth";
import { handle, readJson } from "../../../../lib/api";
import { deleteProject, parseId, updateProject } from "../../../../lib/content";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return handle(async () => {
    await requireAdmin(request);
    const { id } = await context.params;
    const project = await updateProject(parseId(id, "project id"), await readJson(request));
    return Response.json({ project });
  });
}

export async function DELETE(request: Request, context: Context) {
  return handle(async () => {
    await requireAdmin(request);
    const { id } = await context.params;
    return Response.json({ project: await deleteProject(parseId(id, "project id")) });
  });
}
