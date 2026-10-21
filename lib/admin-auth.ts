import { unauthorized, ApiError } from "./api";

const COOKIE_NAME = "trag_admin_session";
const TOKEN_VERSION = "v1";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const SIGNING_CONTEXT = "trag-admin-session-v1";
const MAX_LOGIN_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

type RateEntry = { attempts: number; resetAt: number };

const rateLimitStore = new Map<string, RateEntry>();

function adminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value ? value : null;
}

function sessionSecret(): string | null {
  const configured = process.env.ADMIN_SESSION_SECRET?.trim();
  return configured ? configured : adminPassword();
}

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array | null {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedOut = padded + "=".repeat((4 - (padded.length % 4)) % 4);
  try {
    const binary = atob(paddedOut);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Length-independent, content constant-time string comparison. */
export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`${SIGNING_CONTEXT}:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return base64UrlEncode(signature);
}

/** Mints a signed, expiring session token for a successfully verified password. */
export async function createSessionToken(): Promise<string> {
  const secret = sessionSecret();
  if (!secret) {
    throw new ApiError(
      503,
      "Admin access is not configured. Set the ADMIN_PASSWORD environment variable.",
    );
  }
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ exp: expiresAt })),
  );
  return `${TOKEN_VERSION}.${payload}.${await sign(`${TOKEN_VERSION}.${payload}`, secret)}`;
}

export async function verifySessionToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  const secret = sessionSecret();
  if (!secret) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, payload, signature] = parts;
  if (version !== TOKEN_VERSION || !payload || !signature) return false;

  const expected = await sign(`${version}.${payload}`, secret);
  if (!timingSafeEqual(signature, expected)) return false;

  const decoded = base64UrlDecode(payload);
  if (!decoded) return false;

  try {
    const parsed = JSON.parse(new TextDecoder().decode(decoded)) as { exp?: unknown };
    return typeof parsed.exp === "number" && parsed.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("cf-connecting-ip");
  if (forwarded) return forwarded;
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function isRateLimited(request: Request): boolean {
  const now = Date.now();
  const key = clientKey(request);
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.delete(key);
    return false;
  }
  return entry.attempts >= MAX_LOGIN_ATTEMPTS;
}

export function recordFailedLogin(request: Request): void {
  const now = Date.now();
  const key = clientKey(request);
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, { attempts: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return;
  }
  entry.attempts += 1;
}

export function clearLoginAttempts(request: Request): void {
  rateLimitStore.delete(clientKey(request));
}

export function loginRetryAfterSeconds(request: Request): number {
  const entry = rateLimitStore.get(clientKey(request));
  if (!entry) return 0;
  return Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000));
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * Accepts a session cookie, a bearer session token, or the raw admin password
 * via `x-admin-password`. Returns false when admin access is unconfigured so
 * callers can fail closed instead of granting access.
 */
export async function isAdminRequest(request: Request): Promise<boolean> {
  const password = adminPassword();
  if (!password) return false;

  const headerPassword = request.headers.get("x-admin-password");
  if (headerPassword && timingSafeEqual(headerPassword, password)) return true;

  const authorization = request.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (token && timingSafeEqual(token, password)) return true;
    if (await verifySessionToken(token)) return true;
  }

  return verifySessionToken(readCookie(request, COOKIE_NAME));
}

/** Throws 401 when the request is not an authenticated admin request. */
export async function requireAdmin(request: Request): Promise<void> {
  if (!adminPassword()) {
    throw new ApiError(
      503,
      "Admin access is not configured. Set the ADMIN_PASSWORD environment variable.",
    );
  }
  if (!(await isAdminRequest(request))) throw unauthorized();
}

export function sessionCookieHeader(token: string, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    secure,
  ].join("; ");
}

export function clearSessionCookieHeader(request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
