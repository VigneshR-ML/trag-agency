export function apiMessage(error: unknown, fallback = "Unexpected database error"): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
  if (code === "23505") return "That slug is already used by another project.";
  if (code === "23503") return "The referenced record no longer exists.";
  return error instanceof Error && error.message ? error.message : fallback;
}
