/**
 * Mermaid utilities for rendering diagram code blocks.
 *
 * Provides helper functions to render Mermaid diagrams in dynamically loaded content.
 * This module uses mermaid.run() to automatically render all elements with class "mermaid".
 */

// Extend Window interface for Mermaid
declare global {
  interface Window {
    mermaid?: {
      run?: (options?: { nodes?: HTMLElement[] }) => Promise<void>;
      initialize?: (config?: { startOnLoad?: boolean }) => void;
    };
  }
}

// Cache the initialized mermaid instance
let mermaidInitialized = false;

/**
 * Initializes Mermaid if not already initialized.
 */
async function ensureMermaidInitialized(): Promise<typeof window.mermaid> {
  if (mermaidInitialized && window.mermaid) {
    return window.mermaid;
  }

  // Wait for Mermaid to be available from CDN
  if (typeof window !== "undefined" && !window.mermaid) {
    await new Promise<void>((resolve) => {
      const checkMermaid = () => {
        if (window.mermaid) {
          resolve();
        } else {
          setTimeout(checkMermaid, 50);
        }
      };
      checkMermaid();
    });
  }

  if (window.mermaid && !mermaidInitialized) {
    window.mermaid.initialize?.({ startOnLoad: false });
    mermaidInitialized = true;
  }

  return window.mermaid!;
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
  const mermaidInstance = await ensureMermaidInitialized();

  if (!mermaidInstance) {
    console.warn("Mermaid is not available");
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
    if (typeof mermaidInstance.run === "function") {
      // Pass the specific nodes to render to avoid re-rendering already rendered diagrams
      await mermaidInstance.run({ nodes: mermaidElements });
    } else {
      console.warn("Mermaid.run() is not available");
    }
  } catch (error) {
    console.error("Mermaid rendering error:", error);
  }
}
