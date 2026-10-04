declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    /** Shared secret that guards every admin write. Required for /studio. */
    ADMIN_PASSWORD?: string;
    /** Optional separate HMAC key for admin session cookies. */
    ADMIN_SESSION_SECRET?: string;
  }
}
