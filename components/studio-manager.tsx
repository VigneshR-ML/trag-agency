"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit3, Loader2, LogOut, Plus, Save, Star, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { Project, Review } from "./agency-landing";

const emptyProject = { title: "", slug: "", category: "", year: "2026", summary: "", imageUrl: "", sortOrder: 0 };
const emptyReview = { quote: "", author: "", role: "Client", rating: 5 };
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

async function prepareUpload(file: File): Promise<Blob> {
  if (!UPLOAD_TYPES.includes(file.type)) throw new Error("Only JPEG, PNG, WebP or AVIF images are allowed");
  if (file.size <= MAX_UPLOAD_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  let blob: Blob | null = null;
  for (let quality = 0.85; quality >= 0.4; quality -= 0.15) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) break;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= MAX_UPLOAD_BYTES) break;
    scale *= 0.75;
  }
  if (!blob || blob.size > MAX_UPLOAD_BYTES) throw new Error("Could not shrink this image below 4MB");
  return blob;
}

export default function StudioManager() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState(emptyProject);
  const [reviewProject, setReviewProject] = useState<number | null>(null);
  const [review, setReview] = useState(emptyReview);
  const [editingReview, setEditingReview] = useState<number | null>(null);
  const [reviewForm, setReviewForm] = useState(emptyReview);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      const data = await response.json() as { projects?: Project[]; error?: string };
      setProjects(data.projects ?? []);
      if (!response.ok) toast.error(data.error ?? "Could not load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect

  const submitProject = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch(editing ? `/api/projects/${editing}` : "/api/projects", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) return toast.error(data.error ?? "Could not save project");
    toast.success(editing ? "Project updated" : "Project created");
    setEditing(null); setForm(emptyProject); await load();
  };

  const startEdit = (project: Project) => {
    setEditing(project.id);
    setForm({ title: project.title, slug: project.slug, category: project.category, year: project.year, summary: project.summary, imageUrl: project.imageUrl, sortOrder: project.sortOrder });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeProject = async (id: number) => {
    if (!confirm("Delete this project and its reviews?")) return;
    const response = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!response.ok) return toast.error("Could not delete project");
    toast.success("Project deleted"); await load();
  };

  const toggleStar = async (project: Project) => {
    const starred = !project.starred;
    const response = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) return toast.error(data.error ?? "Could not update the featured flag");
    toast.success(starred ? `${project.title} is featured on the landing page` : `${project.title} removed from featured`);
    await load();
  };

  const signOut = async () => {
    await fetch("/api/studio/logout", { method: "POST" });
    router.refresh();
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const blob = await prepareUpload(file);
      const body = new FormData();
      const name = file.name.replace(/\.\w+$/, "") || "project-image";
      body.append("file", new File([blob], blob.type === "image/webp" ? `${name}.webp` : file.name, { type: blob.type || file.type }));
      const response = await fetch("/api/projects/upload", { method: "POST", body });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      setForm((current) => ({ ...current, imageUrl: data.url! }));
      toast.success("Image uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const startReviewEdit = (item: Review) => {
    setEditingReview(item.id);
    setReviewForm({ quote: item.quote, author: item.author, role: item.role, rating: item.rating });
  };

  const saveReview = async (event: FormEvent) => {
    event.preventDefault();
    if (editingReview == null) return;
    const response = await fetch(`/api/reviews/${editingReview}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewForm),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) return toast.error(data.error ?? "Could not save review");
    toast.success("Review updated"); setEditingReview(null); await load();
  };

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...review, projectId: reviewProject }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) return toast.error(data.error ?? "Could not save review");
    toast.success("Review added"); setReviewProject(null); setReview(emptyReview); await load();
  };

  const removeReview = async (id: number) => {
    const response = await fetch(`/api/reviews/${id}`, { method: "DELETE" });
    if (!response.ok) return toast.error("Could not delete review");
    toast.success("Review deleted"); await load();
  };

  return (
    <main className="studio-page">
      <Toaster position="top-right" />
      <header className="studio-header"><Link href="/"><ArrowLeft /> Back to portfolio</Link><img src="/trag-logo.png" alt="TRAG Agency" /><span>Project Studio</span></header>
      <section className="studio-intro"><p>Content endpoint</p><h1>Projects & reviews</h1><span>Create, update and remove the work displayed in the portfolio gallery.</span><button type="button" className="studio-signout" onClick={signOut}><LogOut /> Sign out</button></section>
      <div className="studio-layout">
        <form className="project-form" onSubmit={submitProject}>
          <div className="form-title"><h2>{editing ? "Edit project" : "New project"}</h2>{editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyProject); }}><X /></button>}</div>
          <div className="field-pair"><div><Label htmlFor="title">Project title</Label><Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div><div><Label htmlFor="slug">Slug</Label><Input id="slug" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div></div>
          <div className="field-pair"><div><Label htmlFor="category">Category</Label><Input id="category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div><div><Label htmlFor="year">Year</Label><Input id="year" required value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div></div>
          <div><Label htmlFor="summary">Summary</Label><Textarea id="summary" required value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
          <div>
            <Label htmlFor="imageUrl">Full-size image URL</Label>
            <Input id="imageUrl" required placeholder="/projects/example.png or https://…" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            <div className="upload-row">
              <input ref={fileRef} id="imageFile" type="file" accept={UPLOAD_TYPES.join(",")} hidden onChange={(e) => uploadImage(e.target.files?.[0])} />
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 className="animate-spin" /> : <Upload />} {uploading ? "Uploading" : "Upload image"}
              </Button>
              {form.imageUrl && <span className="upload-preview"><img src={form.imageUrl} alt="" /></span>}
              <span className="upload-note">{uploading ? "Compressing and storing…" : "JPG, PNG, WebP or AVIF · max 4MB"}</span>
            </div>
          </div>
          <div><Label htmlFor="sortOrder">Display order</Label><Input id="sortOrder" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></div>
          <Button type="submit"><Save /> {editing ? "Save changes" : "Create project"}</Button>
        </form>

        <section className="project-manager">
          <div className="manager-title"><h2>Live projects</h2><span>{projects.length} total</span></div>
          {loading ? <div className="studio-loading"><Loader2 className="animate-spin" /> Loading portfolio</div> : projects.map((project) => (
            <article className="manager-card" key={project.id}>
              <img src={project.imageUrl} alt="" />
              {project.starred && <span className="manager-badge"><Star /> Featured</span>}
              <div className="manager-card-copy"><p>{project.category} · {project.year}</p><h3>{project.title}</h3><span>{project.summary}</span></div>
              <div className="manager-actions">
                <Button variant="outline" size="icon" className={project.starred ? "star-on" : "star-off"} aria-pressed={Boolean(project.starred)} onClick={() => toggleStar(project)} aria-label={project.starred ? `Remove ${project.title} from the landing page` : `Feature ${project.title} on the landing page`}><Star /></Button>
                <Button variant="outline" size="icon" onClick={() => startEdit(project)} aria-label={`Edit ${project.title}`}><Edit3 /></Button>
                <Button variant="outline" size="icon" onClick={() => setReviewProject(project.id)} aria-label={`Add review to ${project.title}`}><Plus /></Button>
                <Button variant="destructive" size="icon" onClick={() => removeProject(project.id)} aria-label={`Delete ${project.title}`}><Trash2 /></Button>
              </div>
              <div className="review-list">{project.reviews.map((item) => <div key={item.id}><Star /><blockquote>“{item.quote}”</blockquote><span>{item.author} · {item.role}</span><button className="review-edit-button" onClick={() => startReviewEdit(item)} aria-label={`Edit review by ${item.author}`}><Edit3 /></button><button onClick={() => removeReview(item.id)} aria-label="Delete review"><Trash2 /></button></div>)}{editingReview !== null && project.reviews.some((item) => item.id === editingReview) && <form className="review-edit" onSubmit={saveReview}><div className="form-title"><h4>Edit review</h4><button type="button" onClick={() => setEditingReview(null)}><X /></button></div><Textarea required aria-label="Review quote" value={reviewForm.quote} onChange={(e) => setReviewForm({ ...reviewForm, quote: e.target.value })} /><div className="field-pair"><Input required aria-label="Review author" value={reviewForm.author} onChange={(e) => setReviewForm({ ...reviewForm, author: e.target.value })} /><Input required aria-label="Review role" value={reviewForm.role} onChange={(e) => setReviewForm({ ...reviewForm, role: e.target.value })} /></div><div className="field-pair"><Input type="number" min={1} max={5} aria-label="Rating out of 5" value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: Math.min(5, Math.max(1, Number(e.target.value) || 5)) })} /><div className="review-edit-actions"><Button type="submit"><Save /> Save review</Button></div></div></form>}</div>
              {reviewProject === project.id && <form className="review-form" onSubmit={submitReview}><div className="form-title"><h4>Add review</h4><button type="button" onClick={() => setReviewProject(null)}><X /></button></div><Textarea required placeholder="Client quote" value={review.quote} onChange={(e) => setReview({ ...review, quote: e.target.value })} /><div className="field-pair"><Input required placeholder="Author" value={review.author} onChange={(e) => setReview({ ...review, author: e.target.value })} /><Input required placeholder="Role / company" value={review.role} onChange={(e) => setReview({ ...review, role: e.target.value })} /></div><Button type="submit"><Plus /> Add review</Button></form>}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
