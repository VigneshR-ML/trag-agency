"use client";

import { useRef } from "react";
import { Plus, Star } from "lucide-react";
import { useReveal } from "@/hooks/use-reveal";
import type { Project } from "./agency-landing";

export default function AllProjects({ projects, onOpen }: { projects: Project[]; onOpen: (slug: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, projects.length);

  return (
    <section className="sx-section sx-all-work" id="all-work">
      <div className="sx-inner">
        <div className="sx-eyebrow" data-reveal><span>All projects</span><span>Every build, starred or not</span></div>
        <div className="all-work-heading">
          <div data-parallax="-.05"><h2 data-reveal>THE FULL<br /><span className="green-word">ARCHIVE.</span></h2></div>
          <div data-parallax=".1"><p data-reveal>Everything the studio has shipped. Starred builds lead the page above, the rest live here.</p></div>
        </div>
        <div className="all-work-grid" ref={root}>
          {projects.map((project, index) => (
            <div key={project.id} className="all-work-cell" data-reveal style={{ "--reveal-delay": `${Math.min(index, 8) * 60}ms` } as React.CSSProperties}>
              <button type="button" className="all-work-card" onClick={() => onOpen(project.slug)}>
                <span className="all-work-media">
                  <img src={project.imageUrl} alt={project.title + " preview"} loading="lazy" draggable={false} />
                  {project.starred !== false && <span className="all-work-badge"><Star size={12} /> Starred</span>}
                </span>
                <span className="all-work-copy">
                  <span className="all-work-meta">{project.category} / {project.year}</span>
                  <span className="all-work-title">{project.title}</span>
                  <span className="all-work-summary">{project.summary}</span>
                </span>
                <span className="all-work-open">Open case <Plus size={15} /></span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
