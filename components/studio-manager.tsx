"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Edit3, KeyRound, Loader2, LogOut, Plus, Save, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { Project } from "./agency-landing";

const emptyProject = { title: "", slug: "", category: "", year: "2026", summary: "", imageUrl: "", sortOrder: 0 };
const emptyReview = { quote: "", author: "", role: "Client", rating: 5 };

type Gate = { status: "checking" } | { status: "locked" } | { status: "open" } | { status: "unconfigured" };

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Could not sign in");
        return;
      }
      setPassword("");
      onUnlock();
    } catch {
      toast.error("Could not reach the server");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="studio-page">
      <Toaster position="top-right" />
      <header className="studio-header">
        <Link href="/"><ArrowLeft /> Back to portfolio</Link>
        <img src="/trag-logo.png" alt="TRAG Agency" />
        <span>Project Studio</span>
      </header>
      <form className="project-form" onSubmit={submit}>
        <div className="form-title"><h2>Admin access</h2></div>
        <p>This studio creates, updates and deletes live portfolio content. Enter the admin password to continue.</p>
        <div>
          <Label htmlFor="admin-password">Password</Label>
          <Input
            id="admin-password"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={busy || !password}>
          {busy ? <Loader2 className="animate-spin" /> : <KeyRound />} {busy ? "Checking" : "Unlock studio"}
        </Button>
      </form>
    </main>
  );
}

export default function StudioManager() {
  const [gate, setGate] = useState<Gate>({ status: "checking" });
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState(emptyProject);
  const [reviewProject, setReviewProject] = useState<number | null>(null);
  const [review, setReview] = useState(emptyReview);

  /** Single place where a 401 sends the user back to the password gate. */
  const lock = useCallback(() => setGate({ status: "locked" }), []);

  const request = useCallback(
    async (path: string, init?: RequestInit) => {
      const response = await fetch(path, { ...init, cache: "no-store" });
      if (response.status === 401) {
        lock();
        throw new Error("Session expired");
      }
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Request failed");
      return data;
    },
    [lock],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request("/api/admin/projects");
      setProjects((data as { projects?: Project[] }).projects ?? []);
    } catch (error) {
      if (error instanceof Error && error.message !== "Session expired") {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        const data = (await response.json()) as { authenticated?: boolean; configured?: boolean };
        if (cancelled) return;
        if (!data.configured) setGate({ status: "unconfigured" });
        else if (!data.authenticated) setGate({ status: "locked" });
        else {
          setGate({ status: "open" });
          await load();
        }
      } catch {
        if (!cancelled) setGate({ status: "locked" });
      }
    })();
    return () => { cancelled = true; };
  }, [load]);

  const enterStudio = useCallback(async () => {
    setGate({ status: "open" });
    await load();
  }, [load]);

  const signOut = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    setProjects([]);
    setGate({ status: "locked" });
  };

  const submitProject = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request(editing ? `/api/admin/projects/${editing}` : "/api/admin/projects", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      toast.success(editing ? "Project updated" : "Project created");
      setEditing(null);
      setForm(emptyProject);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save project");
    }
  };

  const startEdit = (project: Project) => {
    setEditing(project.id);
    setForm({ title: project.title, slug: project.slug, category: project.category, year: project.year, summary: project.summary, imageUrl: project.imageUrl, sortOrder: project.sortOrder });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeProject = async (id: number) => {
    if (!confirm("Delete this project and its reviews?")) return;
    try {
      await request(`/api/admin/projects/${id}`, { method: "DELETE" });
      toast.success("Project deleted");
      if (editing === id) { setEditing(null); setForm(emptyProject); }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete project");
    }
  };

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...review, projectId: reviewProject }),
      });
      toast.success("Review added");
      setReviewProject(null);
      setReview(emptyReview);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save review");
    }
  };

  const removeReview = async (id: number) => {
    if (!confirm("Delete this review?")) return;
    try {
      await request(`/api/admin/reviews/${id}`, { method: "DELETE" });
      toast.success("Review deleted");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete review");
    }
  };

  if (gate.status === "checking") {
    return <main className="studio-page"><div className="studio-loading"><Loader2 className="animate-spin" /> Checking admin session</div></main>;
  }

  if (gate.status === "unconfigured") {
    return (
      <main className="studio-page">
        <header className="studio-header"><Link href="/"><ArrowLeft /> Back to portfolio</Link><img src="/trag-logo.png" alt="TRAG Agency" /><span>Project Studio</span></header>
        <section className="studio-intro"><p>Admin access is off</p><h1>Password not configured</h1><span>Set the ADMIN_PASSWORD environment variable (a Worker secret in production) and reload this page.</span></section>
      </main>
    );
  }

  if (gate.status === "locked") return <PasswordGate onUnlock={enterStudio} />;

  return (
    <main className="studio-page">
      <Toaster position="top-right" />
      <header className="studio-header">
        <Link href="/"><ArrowLeft /> Back to portfolio</Link>
        <img src="/trag-logo.png" alt="TRAG Agency" />
        <span>Project Studio</span>
        <Button variant="outline" size="sm" onClick={signOut}><LogOut /> Sign out</Button>
      </header>
      <section className="studio-intro"><p>Content endpoint</p><h1>Projects & reviews</h1><span>Create, update and remove the work displayed in the portfolio gallery.</span></section>
      <div className="studio-layout">
        <form className="project-form" onSubmit={submitProject}>
          <div className="form-title"><h2>{editing ? "Edit project" : "New project"}</h2>{editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyProject); }}><X /></button>}</div>
          <div className="field-pair"><div><Label htmlFor="title">Project title</Label><Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div><div><Label htmlFor="slug">Slug</Label><Input id="slug" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div></div>
          <div className="field-pair"><div><Label htmlFor="category">Category</Label><Input id="category" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div><div><Label htmlFor="year">Year</Label><Input id="year" required value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} /></div></div>
          <div><Label htmlFor="summary">Summary</Label><Textarea id="summary" required value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
          <div><Label htmlFor="imageUrl">Full-size image URL</Label><Input id="imageUrl" required placeholder="/projects/example.png or https://…" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></div>
          <div><Label htmlFor="sortOrder">Display order</Label><Input id="sortOrder" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></div>
          <Button type="submit"><Save /> {editing ? "Save changes" : "Create project"}</Button>
        </form>

        <section className="project-manager">
          <div className="manager-title"><h2>Live projects</h2><span>{projects.length} total</span></div>
          {loading ? <div className="studio-loading"><Loader2 className="animate-spin" /> Loading portfolio</div> : projects.map((project) => (
            <article className="manager-card" key={project.id}>
              <img src={project.imageUrl} alt="" />
              <div className="manager-card-copy"><p>{project.category} · {project.year}</p><h3>{project.title}</h3><span>{project.summary}</span></div>
              <div className="manager-actions"><Button variant="outline" size="icon" onClick={() => startEdit(project)} aria-label={`Edit ${project.title}`}><Edit3 /></Button><Button variant="outline" size="icon" onClick={() => setReviewProject(project.id)} aria-label={`Add review to ${project.title}`}><Plus /></Button><Button variant="destructive" size="icon" onClick={() => removeProject(project.id)} aria-label={`Delete ${project.title}`}><Trash2 /></Button></div>
              <div className="review-list">{project.reviews.map((item) => <div key={item.id}><Star /><blockquote>“{item.quote}”</blockquote><span>{item.author} · {item.role}</span><button onClick={() => removeReview(item.id)} aria-label="Delete review"><Trash2 /></button></div>)}</div>
              {reviewProject === project.id && <form className="review-form" onSubmit={submitReview}><div className="form-title"><h4>Add review</h4><button type="button" onClick={() => setReviewProject(null)}><X /></button></div><Textarea required placeholder="Client quote" value={review.quote} onChange={(e) => setReview({ ...review, quote: e.target.value })} /><div className="field-pair"><Input required placeholder="Author" value={review.author} onChange={(e) => setReview({ ...review, author: e.target.value })} /><Input required placeholder="Role / company" value={review.role} onChange={(e) => setReview({ ...review, role: e.target.value })} /></div><Button type="submit"><Plus /> Add review</Button></form>}
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
