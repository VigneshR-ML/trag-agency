import { ZodError } from "zod";

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, message, details);
export const unauthorized = (message = "Authentication required") =>
  new ApiError(401, message);
export const notFound = (message = "Not found") => new ApiError(404, message);
export const conflict = (message: string) => new ApiError(409, message);
export const unprocessable = (message: string) => new ApiError(422, message);

/**
 * Turns a thrown value into a safe JSON response.
 *
 * Zod and ApiError messages are authored by us and safe to return. Everything
 * else (D1 / SQLite driver errors) is logged server-side and replaced with a
 * generic message so raw SQL, table names and binding details never reach the
 * client.
 */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: error.message, ...(error.details ? { details: error.details } : {}) },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      { error: "Validation failed", details: error.flatten() },
      { status: 422 },
    );
  }

  console.error("[api] unhandled error", error);
  return Response.json({ error: "Unexpected server error" }, { status: 500 });
}

/** Runs a route handler and normalises every thrown value into a Response. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Parses a JSON request body, rejecting oversized or malformed payloads with a
 * 400 instead of letting them surface as an opaque 500.
 */
export async function readJson(request: Request, limitBytes = 64 * 1024): Promise<unknown> {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > limitBytes) {
    throw badRequest("Request body is too large");
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    throw badRequest("Could not read request body");
  }

  if (text.length > limitBytes) throw badRequest("Request body is too large");
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
}
