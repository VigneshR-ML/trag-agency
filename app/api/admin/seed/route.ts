import { requireAdmin } from "../../../../lib/admin-auth";
import { handle } from "../../../../lib/api";
import { ensureSeedData } from "../../../../db/seed";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    await requireAdmin(request);
    await ensureSeedData();
    return Response.json({ seeded: true });
  });
}
