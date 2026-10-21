"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, ChevronLeft, ChevronRight, X, Plus, Asterisk } from "lucide-react";
import AllProjects from "./all-projects";
import ShowcaseList from "./showcase-list";

export type Review = { id: number; projectId: number; quote: string; author: string; role: string; rating: number };
export type Project = {
  id: number;
  slug: string;
  title: string;
  category: string;
  year: string;
  summary: string;
  imageUrl: string;
  sortOrder: number;
  starred?: boolean;
  reviews: Review[];
  websiteUrl?: string;
  domain?: string;
  services?: string[];
  challenge?: string;
  approach?: string;
  delivery?: string;
};

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

const featuredProjects: Project[] = [
  {
    id: -101,
    slug: "getoverdue",
    title: "GetOverdue",
    category: "SaaS / Invoice follow-up",
    year: "2026",
    summary: "An invoice follow-up product that turns awkward chasing into a clear, editable automation ladder.",
    imageUrl: "/projects/getoverdue-live.jpg",
    sortOrder: 1,
    websiteUrl: "https://getoverdue.online/",
    domain: "getoverdue.online",
    services: ["SaaS experience", "Website development", "Product storytelling"],
    challenge: "Make overdue invoice follow-up easier to understand for independent businesses and small teams, without making the experience feel cold or confrontational.",
    approach: "A ledger-inspired interface pairs editorial typography with a visible four-step recovery ladder. The product story explains imports, editable reminders, reply pauses and payment tracking before sign-up.",
    delivery: "A focused SaaS launch experience with interactive workflow education, pricing, security detail and a direct route from an unpaid invoice to a running reminder sequence.",
    reviews: [
      { id: -1011, projectId: -101, quote: "TRAG took a tricky workflow and made every step feel calm, clear and easy to trust.", author: "Product team", role: "Mock review", rating: 5 },
      { id: -1012, projectId: -101, quote: "The ladder tells the whole product story before a visitor ever reaches sign-up.", author: "SaaS founder", role: "Mock review", rating: 5 },
    ],
  },
  {
    id: -102,
    slug: "hangover-shakes",
    title: "Hangover Shakes",
    category: "Hospitality / Café website",
    year: "2026",
    summary: "A playful digital hangout for a Tiruppur café, built around food, friends and spontaneous plans.",
    imageUrl: "/projects/hangover-shakes-live.jpg",
    sortOrder: 2,
    websiteUrl: "https://www.hangovershakes.cafe/",
    domain: "hangovershakes.cafe",
    services: ["Website design", "Development", "Mobile experience"],
    challenge: "Bring the café’s lively personality online while making the menu, location and next step effortless to find on a phone.",
    approach: "Bold condensed type, character artwork and warm yellow accents give the experience its voice. Menu highlights guide discovery while directions and contact actions turn browsing into a visit.",
    delivery: "A mobile-friendly hospitality site with menu discovery, café storytelling, directions, delivery links, FAQs and a WhatsApp enquiry flow.",
    reviews: [
      { id: -1021, projectId: -102, quote: "The site feels just like the café: playful, welcoming and never hard to navigate.", author: "Café team", role: "Mock review", rating: 5 },
      { id: -1022, projectId: -102, quote: "Customers can understand the vibe, find the menu and plan a visit in one quick scroll.", author: "Operations team", role: "Mock review", rating: 5 },
    ],
  },
  {
    id: -103,
    slug: "rotshift",
    title: "RotShift",
    category: "AI knowledge / Micro SaaS",
    year: "2026",
    summary: "An AI product that turns saved reels into structured, searchable knowledge cards.",
    imageUrl: "/projects/rotshift-live.jpg",
    sortOrder: 3,
    websiteUrl: "https://www.rotshift.cloud/",
    domain: "rotshift.cloud",
    services: ["Product strategy", "AI integration", "Micro SaaS"],
    challenge: "Turn an endless folder of saved short-form videos into information people can actually search, revisit and use.",
    approach: "One familiar action—paste a reel link—opens into category-aware extraction. Recipes, workouts, travel plans and explainers each become a card shaped around the details that matter.",
    delivery: "A responsive, app-like product story with live category examples, a three-step workflow, home-screen installation guidance and a simple free-to-Pro path.",
    reviews: [
      { id: -1031, projectId: -103, quote: "The value is obvious in seconds: paste a reel and keep the useful part forever.", author: "Product lead", role: "Mock review", rating: 5 },
      { id: -1032, projectId: -103, quote: "A complex AI workflow now feels as simple as saving a link.", author: "Early user", role: "Mock review", rating: 5 },
    ],
  },
];

function Gallery({ projects, index, setIndex }: { projects: Project[]; index: number | null; setIndex: (value: number | null) => void }) {
  const rail = useRef<HTMLDivElement>(null);
  const initial = useRef(index ?? 0);
  const currentIndex = useRef(index ?? 0);
  const wheelLocked = useRef(false);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const applyGalleryDepth = useCallback((node: HTMLDivElement) => {
    const width = node.clientWidth || 1;
    Array.from(node.children).forEach((child) => {
      const panel = child as HTMLElement;
      const delta = (panel.offsetLeft - node.scrollLeft) / width;
      const clamped = Math.max(-1.2, Math.min(1.2, delta));
      panel.style.setProperty("--image-shift", `${clamped * -38}px`);
      panel.style.setProperty("--review-shift", `${clamped * 66}px`);
    });
  }, []);

  const attachRail = useCallback((node: HTMLDivElement | null) => {
    rail.current = node;
    if (node) {
      node.scrollLeft = initial.current * node.clientWidth;
      applyGalleryDepth(node);
    }
  }, [applyGalleryDepth]);

  const move = useCallback((next: number) => {
    const node = rail.current;
    if (!node) return;
    const bounded = Math.max(0, Math.min(projects.length - 1, next));
    node.scrollTo({ left: bounded * node.clientWidth, behavior: "smooth" });
  }, [projects.length]);

  const activePanel = useCallback(() => rail.current?.querySelector<HTMLElement>(`[data-project-index="${currentIndex.current}"]`) ?? null, []);
  const openCase = useCallback(() => {
    const panel = activePanel();
    if (panel) {
      panel.scrollTop = 0;
      panel.style.setProperty("--case-image-shift", "0px");
      panel.style.setProperty("--case-label-shift", "0px");
    }
    setDetailOpen(true);
  }, [activePanel]);
  const closeCase = useCallback(() => {
    const panel = activePanel();
    if (wheelTimer.current) {
      clearTimeout(wheelTimer.current);
      wheelTimer.current = null;
    }
    wheelLocked.current = false;
    if (panel) {
      panel.scrollTop = 0;
      panel.style.setProperty("--case-image-shift", "0px");
      panel.style.setProperty("--case-label-shift", "0px");
    }
    setDetailOpen(false);
  }, [activePanel]);

  useEffect(() => {
    currentIndex.current = index ?? 0;
  }, [index]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (detailOpen) closeCase();
        else setIndex(null);
      }
      if (!detailOpen && event.key === "ArrowRight") move(currentIndex.current + 1);
      if (!detailOpen && event.key === "ArrowLeft") move(currentIndex.current - 1);
      if (!detailOpen && (event.key === "ArrowDown" || event.key === "Enter")) openCase();
    };
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", keydown);
      if (wheelTimer.current) {
        clearTimeout(wheelTimer.current);
        wheelTimer.current = null;
      }
      wheelLocked.current = false;
    };
  }, [closeCase, detailOpen, move, openCase, setIndex]);

  if (typeof document === "undefined") return null;
  const active = index ?? 0;

  return createPortal(
    <section className={`portfolio-gallery${detailOpen ? " gallery-detail-mode" : ""}`} role="dialog" aria-modal="true" aria-label="TRAG project gallery">
      {!detailOpen && <header className="gallery-header">
        <span>TRAG / Selected projects</span>
        <span>{String(active + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}</span>
        <button onClick={() => setIndex(null)} aria-label="Close project gallery"><X /> Close</button>
      </header>}

      <div
        className="gallery-rail"
        ref={attachRail}
        onScroll={(event) => {
          if (detailOpen) return;
          const node = event.currentTarget;
          applyGalleryDepth(node);
          if (node.clientWidth) setIndex(Math.round(node.scrollLeft / node.clientWidth));
        }}
        onWheel={(event) => {
          if (detailOpen) return;
          const vertical = Math.abs(event.deltaY) >= Math.abs(event.deltaX);
          const intent = vertical ? event.deltaY : event.deltaX;
          if (Math.abs(intent) < 14) return;
          event.preventDefault();
          if (wheelLocked.current) return;
          wheelLocked.current = true;
          if (vertical) {
            openCase();
          } else {
            const node = rail.current;
            const item = node?.clientWidth ? Math.round(node.scrollLeft / node.clientWidth) : currentIndex.current;
            move(item + (intent > 0 ? 1 : -1));
          }
          wheelTimer.current = setTimeout(() => { wheelLocked.current = false; }, vertical ? 560 : 840);
        }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchEnd={(event) => {
          if (detailOpen || !touchStart.current) return;
          const touch = event.changedTouches[0];
          if (!touch) return;
          const dx = touch.clientX - touchStart.current.x;
          const dy = touch.clientY - touchStart.current.y;
          if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 44) openCase();
          touchStart.current = null;
        }}
      >
        {projects.map((project, projectIndex) => {
          const projectReviews = project.reviews ?? [];
          const notes = projectReviews.length >= 2 ? projectReviews.slice(0, 2) : [...projectReviews, ...galleryNotes[projectIndex % galleryNotes.length]].slice(0, 2);
          const isDetail = detailOpen && projectIndex === active;
          const services = project.services?.length ? project.services : [project.category, "Digital design", "Development"];
          const leadReview = notes[0];
          return (
            <article
              className={`gallery-panel review-layout-${projectIndex % 3}${isDetail ? " is-detail" : ""}`}
              key={project.id}
              data-project-index={projectIndex}
              onScroll={(event) => {
                if (!isDetail) return;
                const y = event.currentTarget.scrollTop;
                event.currentTarget.style.setProperty("--case-image-shift", `${Math.min(126, y * .14)}px`);
                event.currentTarget.style.setProperty("--case-label-shift", `${Math.min(72, y * .08)}px`);
              }}
              onWheel={(event) => {
                if (!isDetail || Math.abs(event.deltaY) < 30) return;
                const panel = event.currentTarget;
                const atTop = panel.scrollTop <= 2 && event.deltaY < 0;
                const atBottom = panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 3 && event.deltaY > 0;
                if (atTop || atBottom) {
                  event.preventDefault();
                  event.stopPropagation();
                  closeCase();
                }
              }}
            >
              <div className="gallery-project-frame">
                <div className="gallery-browser-bar"><span><i /><i /><i /></span><b>{project.domain ?? project.category}</b></div>
                <div className="gallery-image">
                  <img src={project.imageUrl} alt={project.title + " live website preview"} draggable={false} />
                  <span className="gallery-case-number">CASE / {String(projectIndex + 1).padStart(2, "0")}</span>
                </div>
                <div className="gallery-card-footer"><div className="gallery-label"><span>{project.category} / {project.year}</span><h2>{project.title}</h2></div><button className="gallery-expand" type="button" onClick={openCase} aria-label={`Open ${project.title} case study`}><span>View case study</span><Plus size={18} /></button></div>
              </div>

              <div className="gallery-reviews" aria-hidden={isDetail}>
                {notes.map((review, i) => (
                  <aside className={"gallery-review review-" + i} key={"id" in review ? String(review.id) : `${project.id}-${i}`} style={{ "--tilt": i % 2 ? "-3deg" : "3deg" } as React.CSSProperties}>
                    <span className="review-stars" aria-label={review.rating + " out of 5 stars"}>{"★".repeat(Math.max(1, Math.min(5, review.rating)))}</span>
                    <blockquote>“{review.quote}”</blockquote><strong>{review.author}</strong><small>{review.role}</small>
                  </aside>
                ))}
              </div>

              <section className="gallery-case" aria-hidden={!isDetail}>
                <div className="case-intro">
                  <div><span className="case-kicker">Featured project / {project.year}</span><h2>{project.title}</h2></div>
                  <div className="case-intro-copy"><p>{project.summary}</p><div className="case-tags">{services.map((service) => <span key={service}>{service}</span>)}</div></div>
                </div>
                <div className="case-details">
                  <article><span>01</span><h3>The challenge</h3><p>{project.challenge ?? `Give ${project.title} a clear digital story and make the core product easy to understand.`}</p></article>
                  <article><span>02</span><h3>The approach</h3><p>{project.approach ?? "Shape the information around real user intent, then pair the interface with a focused visual system."}</p></article>
                  <article><span>03</span><h3>The experience</h3><p>{project.delivery ?? "A responsive, accessible experience designed to move naturally from discovery to action."}</p></article>
                </div>
                {leadReview && <blockquote className="case-quote"><span>Project note</span><p>“{leadReview.quote}”</p><footer>{leadReview.author} · {leadReview.role}</footer></blockquote>}
                <div className="case-closeout">
                  <button type="button" onClick={closeCase}><ChevronLeft /> Back to project card</button>
                  {project.websiteUrl && <a href={project.websiteUrl} target="_blank" rel="noreferrer"><span>Visit {project.domain ?? "live project"}</span><ArrowUpRight /></a>}
                </div>
              </section>
            </article>
          );
        })}
      </div>

      <footer className={`gallery-nav${detailOpen ? " gallery-case-nav" : ""}`}>
        {detailOpen ? (
          <><button className="gallery-return" onClick={closeCase} aria-label="Return to project card"><ChevronLeft /></button><span>Scroll the case study · scroll past an edge to return</span></>
        ) : (
          <><button disabled={!active} onClick={() => move(active - 1)} aria-label="Previous project"><ChevronLeft /></button><span>Left / right for projects · vertical scroll opens the case study</span><button disabled={active === projects.length - 1} onClick={() => move(active + 1)} aria-label="Next project"><ChevronRight /></button></>
        )}
      </footer>
    </section>,
    document.body,
  );
}

const capabilities = [
  { title: "Websites & experiences", copy: "Fast, accessible sites with a point of view, shaped around how your visitors actually browse, tap and decide.", tags: ["Website design", "Development", "SEO foundations"] },
  { title: "Apps & digital products", copy: "MVPs, micro-SaaS and full SaaS platforms, scoped around the one job your users came to get done.", tags: ["App development", "Micro-SaaS", "SaaS"] },
  { title: "Intelligent experiences", copy: "AI that earns its place: assistants and automations that take over the repetitive work and leave your people the interesting parts.", tags: ["AI integrations", "AI chatbots"] },
  { title: "Visibility & growth", copy: "Technical SEO, honest content and focused campaigns, so the right audience finds you and keeps coming back.", tags: ["SEO strategy", "Digital marketing"] },
];

const steps = [
  { tag: "01 / DISCOVER", title: "Ask the better question.", copy: "We start with your audience, your goals and the friction in between, before a single screen is drawn." },
  { tag: "02 / CREATE", title: "Give it a personality.", copy: "Concepts, prototypes and plenty of feedback loops, until the design sounds like you and nobody else." },
  { tag: "03 / BUILD", title: "Sweat the small stuff.", copy: "Clean code, real-device testing and performance tuning, because details are what people actually feel." },
  { tag: "04 / EVOLVE", title: "Launch is lap one.", copy: "We watch the numbers, listen to real users and line up what to improve next." },
];

function Spark({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="7" aria-hidden="true"><path d="M50 0V100M0 50H100M14.6 14.6L85.4 85.4M85.4 14.6L14.6 85.4" /></svg>;
}

const stageOrderSlugs = ["hangover-shakes", "getoverdue", "rotshift"];
const featuredSlugs = new Set(stageOrderSlugs);
const stageLabels: Record<string, string> = { getoverdue: "SAAS SYSTEM", "hangover-shakes": "BRAND SITE", rotshift: "AI PRODUCT" };

export default function AgencyLanding() {
  const [projects, setProjects] = useState<Project[]>(featuredProjects);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<number | null>(null);
  const [motion, setMotion] = useState(false);
  const [stageActive, setStageActive] = useState(1);
  const starredProjects = projects.filter((project) => project.starred !== false);
  const stagePool = starredProjects.length ? starredProjects : projects;
  const stageProjects = [
    ...stageOrderSlugs.map((slug) => stagePool.find((project) => project.slug === slug)),
    ...stagePool.filter((project) => !stageOrderSlugs.includes(project.slug)),
  ].filter((project): project is Project => Boolean(project)).slice(0, 3);
  const stageWheelLocked = useRef(false);
  const stageWheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stagePointerStart = useRef<{ x: number; y: number } | null>(null);
  const stageDragged = useRef(false);
  const moveStage = useCallback((direction: number) => {
    const count = stageProjects.length;
    if (!count) return;
    setStageActive((current) => (current + direction + count) % count);
  }, [stageProjects.length]);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    setMotion(!reduce.matches); // eslint-disable-line react-hooks/set-state-in-effect
    let frame = 0;
    const update = () => {
      frame = 0;
      document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((node) => {
        const rect = node.parentElement!.getBoundingClientRect();
        const delta = Math.max(-500, Math.min(500, window.innerHeight / 2 - rect.top - rect.height / 2));
        node.style.setProperty("--depth", reduce.matches ? "0px" : delta * Number(node.dataset.parallax) * .68 + "px");
        if (node.dataset.turn) node.style.setProperty("--turn", reduce.matches ? "0deg" : delta * Number(node.dataset.turn) + "deg");
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
      if (!cancelled) {
        const rows = data.projects ?? [];
        if (rows.length) {
          const storedBySlug = new Map(rows.map((project) => [project.slug, project] as const));
          const featured = featuredProjects.map((project) => ({
            ...project,
            starred: storedBySlug.get(project.slug)?.starred ?? true,
          }));
          const extras = rows.filter((project) => !featuredSlugs.has(project.slug));
          setProjects([...featured, ...extras]);
        }
        setStatus("ready");
      }
    }).catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    return () => {
      if (stageWheelTimer.current) clearTimeout(stageWheelTimer.current);
    };
  }, []);
  const open = (index = 0) => { if (projects.length) setSelected(index); };
  const openSlug = (slug: string) => {
    const index = projects.findIndex((project) => project.slug === slug);
    if (index >= 0) setSelected(index);
  };
  return <main className={"new-portfolio" + (motion ? " motion-ready" : "")}>
    <section className="new-hero" id="home">
      <div className="hero-prelude"><span>Designers and engineers, one table.</span><span>TRAG Agency / India</span></div>
      <div className="hero-editorial">
        <div className="hero-copy-block" data-parallax="-.07"><a href="#home" className="hero-brand" aria-label="TRAG Agency home"><img src="/trag-logo-hero.png" alt="TRAG" /><span>Digital design + technology studio</span></a><h1><span>Rough idea in.</span><span className="green-word">Product out.</span></h1><div className="hero-summary"><p>TRAG designs and codes websites, apps, SaaS tools and AI features under one roof, so nothing gets lost between the mock-up and the live product.</p><button type="button" className="solid-button" onClick={() => open()} aria-busy={status === "loading"}>Browse the work <Plus size={18} /></button></div></div>
        <div className="hero-studio-visual" data-parallax=".16" data-turn=".004" onPointerMove={(event) => { const box = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--visual-x", String((event.clientX - box.left) / box.width - .5)); event.currentTarget.style.setProperty("--visual-y", String((event.clientY - box.top) / box.height - .5)); }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--visual-x", "0"); event.currentTarget.style.setProperty("--visual-y", "0"); }}>
          <img src="/hero-trag-studio.png" alt="A TRAG browser mock-up reading Less ordinary, More impact, beside a green phone screen reading Make your move" />
        </div>
      </div>
      <div className="hero-scroll-cue"><span>Keep scrolling</span><i /></div>
    </section>
    <section className="sx-section sx-studio" id="studio">
      <div className="sx-inner">
        <div className="sx-eyebrow" data-reveal><span>01 / THE STUDIO</span><span>FEW PEOPLE. NO HANDOFF GAPS.</span></div>
        <div data-parallax="-.05"><p className="sx-manifesto" data-reveal>We pair <mark>bold ideas</mark><br />with careful design<br />and <mark>dependable engineering.</mark></p></div>
        <div className="sx-studio-bottom"><div data-parallax=".26" data-turn=".1"><Spark className="sx-spark" /></div><div data-parallax=".08"><p data-reveal>TRAG is an independent digital agency. We build websites, apps, SaaS products and AI-powered features, and we stay close from the first conversation to the last commit, so what you imagined is what people end up using.</p></div></div>
      </div>
    </section>
    <section className="sx-section sx-work" id="work">
      <div className="sx-inner">
        <div className="sx-eyebrow" data-reveal><span>02 / SELECTED PROJECTS</span><span>A CLOSER LOOK AT THE WORK</span></div>
        <div className="sx-work-heading"><div data-parallax="-.06"><h2 data-reveal>SELECTED<br /><span className="green-word">WORK</span><sup>(03)</sup></h2></div><div data-parallax=".12"><p data-reveal>Considered before it’s pretty.<br />Tested before it ships.<br />Never a template.</p></div></div>
        <div className="hero-project-stage" data-reveal onPointerMove={(event) => { const box = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty("--stage-x", String((event.clientX - box.left) / box.width - .5)); event.currentTarget.style.setProperty("--stage-y", String((event.clientY - box.top) / box.height - .5)); }} onPointerLeave={(event) => { event.currentTarget.style.setProperty("--stage-x", "0"); event.currentTarget.style.setProperty("--stage-y", "0"); }}>
          <div className="stage-grid" aria-hidden="true" /><div className="stage-tag">Live interface studies / 2026</div>
          <div
            className="stage-carousel"
            tabIndex={0}
            aria-label="Highlighted projects. Scroll, swipe, or use the arrow keys to cycle projects."
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") { event.preventDefault(); moveStage(-1); }
              if (event.key === "ArrowRight") { event.preventDefault(); moveStage(1); }
            }}
            onWheel={(event) => {
              const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
              const intent = horizontal ? event.deltaX : event.deltaY;
              if (Math.abs(intent) < 12) return;
              if (horizontal || event.shiftKey) event.preventDefault();
              if (stageWheelLocked.current) {
                if (stageWheelTimer.current) clearTimeout(stageWheelTimer.current);
                stageWheelTimer.current = setTimeout(() => { stageWheelLocked.current = false; }, 520);
                return;
              }
              stageWheelLocked.current = true;
              moveStage(intent > 0 ? 1 : -1);
              stageWheelTimer.current = setTimeout(() => { stageWheelLocked.current = false; }, 520);
            }}
            onPointerDown={(event) => {
              stagePointerStart.current = { x: event.clientX, y: event.clientY };
              stageDragged.current = false;
            }}
            onPointerUp={(event) => {
              const start = stagePointerStart.current;
              stagePointerStart.current = null;
              if (!start) return;
              const dx = event.clientX - start.x;
              const dy = event.clientY - start.y;
              if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 42) {
                stageDragged.current = true;
                moveStage(dx < 0 ? 1 : -1);
                setTimeout(() => { stageDragged.current = false; }, 0);
              }
            }}
            onPointerCancel={() => { stagePointerStart.current = null; stageDragged.current = false; }}
          >
            {stageProjects.map((project, projectPosition) => {
              const projectIndex = projects.findIndex((item) => item.slug === project.slug);
              const relative = (projectPosition - stageActive + stageProjects.length) % stageProjects.length;
              const slot = relative === 0 ? "center" : relative === 1 ? "right" : "left";
              const label = stageLabels[project.slug] ?? project.category.split("/")[0].trim().toUpperCase();
              return <button key={project.id} data-stage-slug={project.slug} data-parallax={slot === "center" ? "-.15" : ".11"} className={`hero-preview stage-slot-${slot}`} aria-current={slot === "center" ? "true" : undefined} onClick={() => { if (stageDragged.current) { stageDragged.current = false; return; } if (slot !== "center") setStageActive(projectPosition); else open(projectIndex); }} aria-label={slot === "center" ? `View ${project.title}` : `Bring ${project.title} to the front`}><span className="device-bar"><i /><i /><i /><b>{label}</b></span><img src={project.imageUrl} alt={project.title + " website preview"} draggable={false} /><span>{project.title} <Plus size={16} /></span></button>;
            })}
          </div>
          <div className="stage-orbit" data-parallax="-.16" aria-hidden="true"><span>BUILD / TEST / SHIP</span></div><span className="stage-caption">Web · Apps · SaaS · AI</span>
          <div className="stage-controls"><button type="button" onClick={() => moveStage(-1)} aria-label="Previous highlighted project"><ChevronLeft /></button><span>SCROLL / SWIPE</span><button type="button" onClick={() => moveStage(1)} aria-label="Next highlighted project"><ChevronRight /></button></div>
        </div>
        <ShowcaseList projects={projects} onOpen={openSlug} />
      </div>
    </section>
    <AllProjects projects={projects} onOpen={openSlug} />
    <section className="sx-section sx-caps" id="capabilities">
      <div className="sx-inner">
        <div className="sx-eyebrow" data-reveal><span>03 / OUR CAPABILITIES</span><span>FROM BLANK PAGE TO LIVE PRODUCT</span></div>
        <div className="sx-caps-layout">
          <div data-parallax="-.04"><div data-reveal><h2>FROM SKETCH<br /><span className="green-word">TO SHIPPED.</span></h2><p>One partner for the interface, the engine behind it and the people who need to find it.</p></div><div className="sx-caps-spark-wrap" data-parallax=".22" data-turn=".12"><Spark className="sx-caps-spark" /></div></div>
          <div className="sx-caps-list">{capabilities.map((item, i) => <details key={item.title} open={i === 0} data-unfold style={{ "--reveal-delay": `${i * 90}ms` } as React.CSSProperties}><summary><span>0{i + 1}</span> {item.title} <b>+</b></summary><p>{item.copy}</p><div className="sx-tags">{item.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></details>)}</div>
        </div>
      </div>
    </section>
    <section className="sx-section sx-process" id="process">
      <div className="sx-inner">
        <div className="sx-eyebrow" data-reveal><span>04 / HOW WE GET THERE</span><span>YOU’RE ON THE TEAM TOO.</span></div>
        <h2 data-reveal>A clear path,<br />with room to wander.</h2>
        <div className="sx-steps">{steps.map((step, i) => <div key={step.tag} data-parallax={i % 2 ? ".05" : "-.04"}><article data-unfold style={{ "--reveal-delay": `${i * 110}ms` } as React.CSSProperties}><span>{step.tag}</span><h3>{step.title}</h3><p>{step.copy}</p></article></div>)}</div>
      </div>
    </section>
    <section className="new-about"><span className="new-kicker" data-reveal>Built with intention</span><h2 data-reveal>Pretty earns a glance.<br /><em>Thoughtful earns trust.</em></h2><p data-reveal>Design and engineering sit at the same table here. That’s how the small things, like a loading state or a form error, end up feeling as considered as the homepage.</p><Asterisk className="about-star" data-parallax=".18" aria-hidden="true" /></section>
    <footer className="new-footer" id="contact"><span className="new-kicker" data-reveal>Got a half-formed idea?</span><h2 data-reveal>Bring the idea.<br /><em>We’ll bring the rest.</em></h2><a className="solid-button" href="mailto:getintotrag@gmail.com">getintotrag@gmail.com</a><div className="new-footer-base"><span>© {new Date().getFullYear()} TRAG Agency</span><a href="https://instagram.com/trag.agency" target="_blank" rel="noreferrer">@trag.agency</a><a href="/studio">Project studio</a><a href="#home">Back to top</a></div></footer>
    {selected !== null && <Gallery projects={projects} index={selected} setIndex={setSelected} />}
  </main>;
}
