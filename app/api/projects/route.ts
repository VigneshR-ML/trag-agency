import { ensureSeedData } from "../../../db/seed";
import { requireAdmin } from "../../../lib/admin-auth";
import { handle, readJson } from "../../../lib/api";
import { createProject, listProjectsWithReviews } from "../../../lib/content";

export const dynamic = "force-dynamic";

/** Public read used by the portfolio landing page and the gallery. */
export async function GET() {
  return handle(async () => {
    await ensureSeedData();
    return Response.json({ projects: await listProjectsWithReviews() });
  });
}

/** Admin-only write. Prefer /api/admin/projects, which shares this handler. */
export async function POST(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    const project = await createProject(await readJson(request));
    return Response.json({ project }, { status: 201 });
  });
}
