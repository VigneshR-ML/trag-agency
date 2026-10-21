import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const STUDIO_SESSION_COOKIE = "trag_studio_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const COOKIE_VERSION = "trag-studio-session-v1";

export function isStudioConfigured(): boolean {
  return Boolean(process.env.STUDIO_PASSWORD?.trim());
}

function sessionToken(): string | null {
  const secret = process.env.STUDIO_PASSWORD?.trim();
  if (!secret) return null;
  return createHmac("sha256", secret).update(COOKIE_VERSION).digest("hex");
}

function safeEqual(candidate: string, expected: string): boolean {
  const left = Buffer.from(candidate);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyPassword(candidate: string): boolean {
  const secret = process.env.STUDIO_PASSWORD?.trim();
  if (!secret) return false;
  return safeEqual(candidate, secret);
}

export function verifySessionToken(token: string | null | undefined): boolean {
  const expected = sessionToken();
  if (!expected || !token) return false;
  return safeEqual(token, expected);
}

export async function hasStudioAccess(): Promise<boolean> {
  if (!isStudioConfigured()) return false;
  const store = await cookies();
  return verifySessionToken(store.get(STUDIO_SESSION_COOKIE)?.value);
}

export async function createSessionCookie(): Promise<void> {
  const token = sessionToken();
  if (!token) return;
  const store = await cookies();
  store.set(STUDIO_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(STUDIO_SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 0, path: "/" });
}

/** Returns a 401 response when the caller is not signed in to the studio, else null. */
export async function requireStudio(): Promise<Response | null> {
  if (await hasStudioAccess()) return null;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
