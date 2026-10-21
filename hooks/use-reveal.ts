import { useEffect, type RefObject } from "react";

/**
 * Observes [data-reveal] nodes inside a subtree.
 * The landing page runs its own observer once on mount, so content that mounts
 * later (projects fetched from the API) never gets its `.seen` class and would
 * stay paused mid-reveal. This hook re-observes anything not yet revealed.
 */
export function useReveal(root: RefObject<HTMLElement | null>, version: unknown) {
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const targets = Array.from(node.querySelectorAll<HTMLElement>("[data-reveal],[data-unfold]")).filter(
      (element) => !element.classList.contains("seen"),
    );
    if (!targets.length) return;
    if (typeof IntersectionObserver === "undefined") {
      targets.forEach((element) => element.classList.add("seen"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("seen");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.1 },
    );
    targets.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [root, version]);
}
