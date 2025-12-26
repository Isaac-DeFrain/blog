/**
 * Mermaid utilities for rendering diagram code blocks.
 *
 * Provides helper functions to render Mermaid diagrams in dynamically loaded content.
 * Mermaid is loaded from CDN and initialized with startOnLoad: true in index.html.
 * This module uses mermaid.run() to automatically render all elements with class "mermaid".
 */

// Declare global mermaid type
declare global {
  interface Window {
    mermaid?: {
      run: (config?: { querySelector?: string; nodes?: NodeList | HTMLElement[] }) => Promise<void>;
      initialize: (config: { startOnLoad?: boolean; theme?: string; securityLevel?: string }) => void;
    };
  }
}

/**
 * Gets the global Mermaid instance from window.
 * Mermaid is loaded from CDN in index.html and exposed as window.mermaid.
 *
 * @returns The Mermaid instance, or null if not available
 */
function getMermaid(): Window["mermaid"] {
  if (typeof window !== "undefined" && window.mermaid) {
    return window.mermaid;
  }

  return undefined;
}

/**
 * Renders all Mermaid diagrams in the given element(s).
 *
 * Uses Mermaid's `run()` method which automatically processes all elements
 * with the `mermaid` class. The diagram code should be directly in the element's
 * textContent (Mermaid reads from textContent, which returns unescaped text).
 *
 * @param elements - The HTML element(s) containing Mermaid code blocks to render
 * @returns Promise that resolves when rendering is complete
 */
export async function renderMermaidDiagrams(elements: HTMLElement | HTMLElement[]): Promise<void> {
  const mermaid = getMermaid();
  if (!mermaid) {
    console.warn("Mermaid is not available. Make sure it's loaded from CDN in index.html");
    return;
  }

  const elementsArray = Array.isArray(elements) ? elements : [elements];

  // Find all elements with class 'mermaid' within the provided elements
  const mermaidElements: HTMLElement[] = [];
  for (const element of elementsArray) {
    const diagrams = element.querySelectorAll<HTMLElement>(".mermaid");
    mermaidElements.push(...Array.from(diagrams));
  }

  if (mermaidElements.length === 0) {
    return;
  }

  try {
    // Use mermaid.run() to automatically render all .mermaid elements
    // This works with the CDN approach and startOnLoad: true configuration
    if (typeof mermaid.run === "function") {
      // Pass the specific nodes to render to avoid re-rendering already rendered diagrams
      await mermaid.run({ nodes: mermaidElements });
    } else {
      console.warn("Mermaid.run() is not available");
    }
  } catch (error) {
    console.error("Mermaid rendering error:", error);
  }
}
