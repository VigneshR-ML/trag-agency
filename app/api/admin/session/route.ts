import { isAdminRequest } from "../../../../lib/admin-auth";
import { handle } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    const configured = Boolean(process.env.ADMIN_PASSWORD?.trim());
    return Response.json(
      {
        authenticated: configured && (await isAdminRequest(request)),
        configured,
      },
      { status: 200 },
    );
  });
}
