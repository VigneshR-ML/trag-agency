import { clearSessionCookieHeader } from "../../../../lib/admin-auth";
import { handle } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () =>
    Response.json(
      { authenticated: false },
      { status: 200, headers: { "Set-Cookie": clearSessionCookieHeader(request) } },
    ),
  );
}
