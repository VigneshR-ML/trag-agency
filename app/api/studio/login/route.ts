import { createSessionCookie, isStudioConfigured, verifyPassword } from "../../../../lib/studio-auth";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  if (!isStudioConfigured()) {
    await wait(300);
    return Response.json({ error: "STUDIO_PASSWORD is not configured on this deployment." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const password = typeof body.password === "string" ? body.password : "";

  if (!password || !verifyPassword(password)) {
    await wait(350);
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }

  await createSessionCookie();
  return Response.json({ ok: true });
}
