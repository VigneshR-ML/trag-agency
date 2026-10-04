"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Plus, Asterisk } from "lucide-react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getMotionAllowed() {
  return !window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export type Review = { id: number; projectId: number; quote: string; author: string; role: string; rating: number };
export type Project = { id: number; slug: string; title: string; category: string; year: string; summary: string; imageUrl: string; sortOrder: number; reviews: Review[] };

const galleryNotes = [
  [
    { quote: "The final experience feels unmistakably ours—and customers find what they need faster.", author: "Client team", role: "Website project", rating: 5 },
    { quote: "Clear thinking, thoughtful details and a launch that felt completely under control.", author: "Project lead", role: "Digital delivery", rating: 5 },
  ],
  [
    { quote: "TRAG turned a complicated workflow into a product people understand immediately.", author: "Product owner", role: "SaaS platform", rating: 5 },
    { quote: "The interface is quick, focused and far easier for our team to use every day.", author: "Operations team", role: "Product experience", rating: 5 },
  ],
  [
    { quote: "The AI experience feels useful and human instead of technical or overwhelming.", author: "Growth lead", role: "AI integration", rating: 5 },
    { quote: "We reduced repetitive support work without losing the character of our brand.", author: "Support team", role: "Conversational AI", rating: 5 },
  ],
];

function Gallery({ projects, index, setIndex }: { projects: Project[]; index: number | null; setIndex: (value: number | null) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const initial = useRef(index ?? 0);
  const currentIndex = useRef(index ?? 0);
  const lastIndex = useRef(projects.length - 1);
  const wheelLocked = useRef(false);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyGalleryDepth = useCallback((node: HTMLDivElement) => {
    const width = node.clientWidth || 1;
    Array.from(node.children).forEach((child) => {
      const panel = child as HTMLElement;
      const delta = (panel.offsetLeft - node.scrollLeft) / width;
      const clamped = Math.max(-1.2, Math.min(1.2, delta));
      panel.style.setProperty("--image-shift", `${clamped * -46}px`);
      panel.style.setProperty("--review-shift", `${clamped * 82}px`);
    });
  }, []);
  // Keeps keyboard and wheel handlers reading the live project count instead of
  // the value captured when the effect first ran.
  useEffect(() => { lastIndex.current = projects.length - 1; }, [projects.length]);
  const move = useCallback((next: number) => {
    const node = rail.current;
    if (!node) return;
    const bounded = Math.max(0, Math.min(lastIndex.current, next));
    node.scrollTo({ left: bounded * node.clientWidth, behavior: "smooth" });
  }, []);
  const attachRail = useCallback((node: HTMLDivElement | null) => {
    rail.current = node;
    if (node) {
      node.scrollLeft = initial.current * node.clientWidth;
      applyGalleryDepth(node);
    }
  }, [applyGalleryDepth]);
  useEffect(() => { currentIndex.current = index ?? 0; }, [index]);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIndex(null);
      if (event.key === "ArrowRight") move(currentIndex.current + 1);
      if (event.key === "ArrowLeft") move(currentIndex.current - 1);
    };
    window.addEventListener("keydown", keydown);

    // React registers root wheel listeners as passive, so preventDefault() in an
    // onWheel prop is ignored and the page scrolls instead of the gallery. A
    // native non-passive listener on the rail is required for the hijack.
    const node = rail.current;
    const onWheel = (event: WheelEvent) => {
      const intent = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (Math.abs(intent) < 8) return;
      event.preventDefault();
      if (wheelLocked.current) return;
      wheelLocked.current = true;
      const active = node?.clientWidth ? Math.round(node.scrollLeft / node.clientWidth) : currentIndex.current;
      move(active + (intent > 0 ? 1 : -1));
      wheelTimer.current = setTimeout(() => { wheelLocked.current = false; }, 720);
    };
    node?.addEventListener("wheel", onWheel, { passive: false });

    // Panel offsets are measured in pixels, so they go stale after a resize.
    const onResize = () => { if (node) applyGalleryDepth(node); };
    window.addEventListener("resize", onResize);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("resize", onResize);
      node?.removeEventListener("wheel", onWheel);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
    };
  }, [setIndex, move, applyGalleryDepth]);
  if (typeof document === "undefined") return null;
  return createPortal(<section className="portfolio-gallery" role="dialog" aria-modal="true" aria-label="TRAG project gallery">
      <header className="gallery-header"><span>TRAG / Selected projects</span><span>{String((index ?? 0) + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</span><button onClick={() => setIndex(null)} aria-label="Close project gallery"><X /> Close</button></header>
      <div className="gallery-rail" ref={attachRail} onScroll={(event) => {
        const node = event.currentTarget;
        applyGalleryDepth(node);
        if (node.clientWidth) setIndex(Math.round(node.scrollLeft / node.clientWidth));
      }}>
        {projects.map((project, projectIndex) => {
          const notes = project.reviews.length >= 2 ? project.reviews.slice(0, 2) : [...project.reviews, ...galleryNotes[projectIndex % galleryNotes.length]].slice(0, 2);
          return <article className={`gallery-panel review-layout-${projectIndex % 3}`} key={project.id}>
            <div className="gallery-project-frame"><div className="gallery-image"><img src={project.imageUrl} alt={project.title + " full project preview"} draggable={false} /></div><div className="gallery-label"><span>{project.category} / {project.year}</span><h2>{project.title}</h2></div></div>
            <div className="gallery-reviews">{notes.map((review, i) => <aside className={"gallery-review review-" + i} key={"id" in review ? String(review.id) : `${project.id}-${i}`} style={{ "--tilt": i % 2 ? "-3deg" : "3deg" } as React.CSSProperties}><span className="review-stars" aria-label={review.rating + " out of 5 stars"}>{"★".repeat(Math.max(1, Math.min(5, review.rating)))}</span><blockquote>“{review.quote}”</blockquote><strong>{review.author}</strong><small>{review.role}</small></aside>)}</div>
          </article>;
        })}
      </div>
      <footer className="gallery-nav"><button disabled={!index} onClick={() => move((index ?? 0) - 1)} aria-label="Previous project"><ChevronLeft /></button><span>Swipe or scroll to explore</span><button disabled={index === projects.length - 1} onClick={() => move((index ?? 0) + 1)} aria-label="Next project"><ChevronRight /></button></footer>
    </section>, document.body);
}

const services = [
  ["Web design", "Distinctive websites with intuitive journeys and thoughtful motion."],
  ["App development", "Useful, reliable applications for mobile and the web."],
  ["SaaS & Micro SaaS", "From focused MVPs to products ready for their next stage."],
  ["AI integrations", "Practical intelligence connected to the way your business works."],
  ["Chatbots", "Conversational experiences for support, discovery and lead generation."],
  ["SEO", "Search-friendly structure, performance and content foundations."],
];

export default function AgencyLanding() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<number | null>(null);
  // Read straight from the media query so there is no setState inside an effect.
  const motion = useSyncExternalStore(subscribeReducedMotion, getMotionAllowed, () => false);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((node) => {
        const host = node.parentElement;
        if (!host) return;
        const rect = host.getBoundingClientRect();
        const delta = Math.max(-500, Math.min(500, window.innerHeight / 2 - rect.top - rect.height / 2));
        node.style.setProperty("--depth", reduce.matches ? "0px" : delta * Number(node.dataset.parallax) * .68 + "px");
      });
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("seen"); observer.unobserve(entry.target); }
    }), { threshold: .1 });
    document.querySelectorAll("[data-unfold],[data-reveal]").forEach((node) => observer.observe(node));
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    update();
    return () => { observer.disconnect(); window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll); cancelAnimationFrame(frame); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Projects unavailable");
      const data = await response.json() as { projects?: Project[] };
      if (!cancelled) { setProjects(data.projects ?? []); setStatus("ready"); }
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, []);
  const open = (index = 0) => { if (projects.length) setSelected(index); };
  return <main className={"new-portfolio" + (motion ? " motion-ready" : "")}>
    <section className="new-hero" id="home">
      <div className="hero-prelude"><span>Independent minds. Connected ideas.</span><span>TRAG Agency / India</span></div>
      <div className="hero-editorial">
        <div className="hero-copy-block"><a href="#home" className="hero-brand" aria-label="TRAG Agency home"><img src="/trag-logo-hero.png" alt="TRAG" /><span>Digital design + technology studio</span></a><h1><span>Ideas into</span><span className="green-word">digital impact.</span></h1><div className="hero-summary"><p>We turn ambitious ideas into websites, apps and intelligent products. Designed to stand out. Built to work.</p><button className="solid-button" onClick={() => open()} disabled={!projects.length}>Show all projects <Plus size={18} /></button>{status === "loading" && <p className="project-status">Loading selected projects…</p>}{status === "error" && <p role="status">Projects couldn’t load. Please refresh to try again.</p>}</div></div>
        <div className="hero-studio-visual" onPointerMove={(event) => { const box = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--visual-x", String((event.clientX - box.left) / box.width - .5)); event.currentTarget.style.setProperty("--visual-y", String((event.clientY - box.top) / box.height - .5)); }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--visual-x", "0"); event.currentTarget.style.setProperty("--visual-y", "0"); }}>
          <div className="visual-disc" aria-hidden="true" /><img src="/hero-digital-studio.png" alt="Connected website, mobile app, SaaS dashboard and AI interfaces" data-parallax=".1" /><span className="visual-chip chip-web">Web systems</span><span className="visual-chip chip-ai">AI integrations</span><span className="visual-chip chip-saas">SaaS products</span>
        </div>
      </div>
      <div className="hero-project-stage" data-reveal onPointerMove={(event) => { const box = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--stage-x", String((event.clientX - box.left) / box.width - .5)); event.currentTarget.style.setProperty("--stage-y", String((event.clientY - box.top) / box.height - .5)); }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--stage-x", "0"); event.currentTarget.style.setProperty("--stage-y", "0"); }}>
        <div className="stage-grid" aria-hidden="true" /><div className="stage-tag">Live interface studies / 2026</div>
        {projects.slice(0, 3).map((project, i) => <button key={project.id} className={"hero-preview preview-" + i} onClick={() => open(i)} data-parallax={i === 1 ? "-.15" : ".11"} aria-label={"View " + project.title}><span className="device-bar"><i /><i /><i /><b>{i === 0 ? "BRAND SITE" : i === 1 ? "PRODUCT UI" : "AI SYSTEM"}</b></span><img src={project.imageUrl} alt={project.title + " website preview"} /><span>{project.title} <Plus size={16} /></span></button>)}
        <div className="stage-orbit" data-parallax="-.16" aria-hidden="true"><span>BUILD / TEST / SHIP</span></div><span className="stage-caption">Web · Apps · SaaS · AI</span>
      </div>
      <div className="hero-scroll-cue"><span>Scroll to explore</span><i /></div>
    </section>
    <section className="new-about"><span className="new-kicker" data-reveal>Built with intention</span><h2 data-reveal>Not just a better-looking website.<br /><em>A better digital experience.</em></h2><p data-reveal>Design and development belong together. We connect the details—from the first interaction to the systems behind it—to make your next project feel considered from end to end.</p><Asterisk className="about-star" data-parallax=".18" aria-hidden="true" /></section>
    <section className="new-services" id="capabilities"><div className="new-section-heading" data-reveal><span className="new-kicker">02 / What we do</span><h2>Your next chapter,<br />built together.</h2></div><div className="new-service-grid">{services.map(([title, copy], i) => <article key={title} data-unfold style={{ "--reveal-delay": `${i * 70}ms` } as React.CSSProperties}><span>0{i + 1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <footer className="new-footer" id="contact"><span className="new-kicker" data-reveal>Have something in mind?</span><h2 data-reveal>Let’s build<br /><em>what’s next.</em></h2><a className="solid-button" href="mailto:getintotrag@gmail.com">getintotrag@gmail.com</a><div className="new-footer-base"><span>© {new Date().getFullYear()} TRAG Agency</span><a href="https://instagram.com/trag.agency" target="_blank" rel="noreferrer">@trag.agency</a><a href="#home">Back to top</a></div></footer>
    {selected !== null && <Gallery projects={projects} index={selected} setIndex={setSelected} />}
  </main>;
}
