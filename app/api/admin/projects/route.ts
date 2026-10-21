import { requireAdmin } from "../../../../lib/admin-auth";
import { handle, readJson } from "../../../../lib/api";
import { createProject, listProjectsWithReviews } from "../../../../lib/content";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    return Response.json({ projects: await listProjectsWithReviews() });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    const project = await createProject(await readJson(request));
    return Response.json({ project }, { status: 201 });
  });
}
