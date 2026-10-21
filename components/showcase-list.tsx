"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { useReveal } from "@/hooks/use-reveal";
import type { Project } from "./agency-landing";

export default function ShowcaseList({ projects, onOpen }: { projects: Project[]; onOpen: (slug: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const starred = projects.filter((project) => project.starred !== false);
  useReveal(root, projects.length);
  if (!starred.length) return null;

  return (
    <div className="showcase-list" ref={root}>
      <div className="showcase-head" data-reveal><span>Starred builds</span><span>Featured on this page</span></div>
      {starred.map((project, index) => (
        <button
          key={project.id}
          type="button"
          className="showcase-row"
          data-reveal
          style={{ "--reveal-delay": `${index * 70}ms` } as React.CSSProperties}
          onClick={() => onOpen(project.slug)}
        >
          <span className="showcase-index">{String(index + 1).padStart(2, "0")}</span>
          <span className="showcase-thumb"><img src={project.imageUrl} alt="" loading="lazy" draggable={false} /></span>
          <span className="showcase-title">{project.title}</span>
          <span className="showcase-meta">{project.category}</span>
          <span className="showcase-year">{project.year}</span>
          <span className="showcase-go">View case <Plus size={15} /></span>
        </button>
      ))}
    </div>
  );
}
