import { clearSessionCookie } from "../../../../lib/studio-auth";

export async function POST() {
  await clearSessionCookie();
  return Response.json({ ok: true });
}
