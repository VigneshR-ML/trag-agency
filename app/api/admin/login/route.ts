import { handle, readJson, ApiError } from "../../../../lib/api";
import {
  clearLoginAttempts,
  createSessionToken,
  isRateLimited,
  loginRetryAfterSeconds,
  recordFailedLogin,
  sessionCookieHeader,
  timingSafeEqual,
} from "../../../../lib/admin-auth";
import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    const password = env.ADMIN_PASSWORD?.trim();
    if (!password) {
      throw new ApiError(
        503,
        "Admin access is not configured. Set the ADMIN_PASSWORD environment variable.",
      );
    }

    const body = (await readJson(request)) as { password?: unknown };
    const supplied = typeof body.password === "string" ? body.password : "";

    // The password is always checked first so a correct password is never
    // blocked by failed attempts from the same address; the limiter only
    // short-circuits further *wrong* guesses.
    if (supplied && timingSafeEqual(supplied, password)) {
      clearLoginAttempts(request);
      const token = await createSessionToken();
      return Response.json(
        { authenticated: true, expiresIn: 60 * 60 * 8 },
        { status: 200, headers: { "Set-Cookie": sessionCookieHeader(token, request) } },
      );
    }

    if (isRateLimited(request)) {
      const retryAfter = loginRetryAfterSeconds(request);
      return Response.json(
        { error: "Too many failed attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    recordFailedLogin(request);
    return Response.json({ error: "Incorrect password" }, { status: 401 });
  });
}
