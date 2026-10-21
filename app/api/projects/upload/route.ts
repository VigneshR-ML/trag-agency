import { createClient } from "@supabase/supabase-js";
import { requireStudio } from "../../../../lib/studio-auth";

export const dynamic = "force-dynamic";

const BUCKET = "project-images";
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export async function POST(request: Request) {
  const denied = await requireStudio();
  if (denied) return denied;

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return Response.json({ error: "Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "A file field is required" }, { status: 400 });
  if (!ALLOWED_TYPES[file.type]) return Response.json({ error: "Only JPEG, PNG, WebP or AVIF images are allowed" }, { status: 415 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Image is larger than 4MB. Export it as WebP and try again." }, { status: 413 });

  try {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((bucket) => bucket.name === BUCKET)) {
      await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: "5MB" });
    }

    const extension = ALLOWED_TYPES[file.type];
    const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage.from(BUCKET).upload(name, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
    return Response.json({ url: data.publicUrl, path: `${BUCKET}/${name}` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 500 });
  }
}
