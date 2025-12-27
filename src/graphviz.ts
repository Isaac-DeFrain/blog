/**
 * Graphviz utilities for rendering diagram code blocks.
 *
 * Provides helper functions to render Graphviz diagrams in dynamically loaded content.
 * Graphviz is loaded from CDN and exposed as window.Viz in index.html.
 * This module uses Viz.js to render DOT code to SVG.
 */

// Declare global Viz type
declare global {
  interface Window {
    Viz?: new () => {
      renderSVGElement: (dot: string) => Promise<SVGElement>;
      renderString: (dot: string, options?: { format?: string; engine?: string }) => Promise<string>;
    };
  }
}

/**
 * Gets the global Viz constructor from window.
 * Viz.js is loaded from CDN in index.html and exposed as window.Viz.
 *
 * @returns The Viz constructor, or undefined if not available
 */
function getViz(): Window["Viz"] | undefined {
  if (typeof window !== "undefined" && window.Viz) {
    return window.Viz;
  }

  return undefined;
}

/**
 * Renders a single Graphviz diagram element.
 *
 * Takes a pre element containing DOT code, renders it to SVG using Viz.js,
 * and replaces the pre element with the rendered SVG.
 *
 * @param element - The HTML element containing Graphviz DOT code to render
 * @returns Promise that resolves when rendering is complete
 */
async function renderGraphvizDiagram(element: HTMLElement): Promise<void> {
  const Viz = getViz();
  if (!Viz) {
    console.warn("Viz.js is not available. Make sure it's loaded from CDN in index.html");
    return;
  }

  // Get the DOT code from the element's textContent
  const dotCode = element.textContent?.trim();
  if (!dotCode) {
    console.warn("Empty Graphviz diagram code");
    return;
  }

  try {
    const viz = new Viz();
    const svgElement = await viz.renderSVGElement(dotCode);

    // Replace the pre element with the SVG
    // Create a wrapper div to maintain styling consistency
    const wrapper = document.createElement("div");
    wrapper.className = "graphviz-container";
    wrapper.appendChild(svgElement);
    element.replaceWith(wrapper);
  } catch (error) {
    console.error("Graphviz rendering error:", error);
    // Optionally, show an error message to the user
    const errorDiv = document.createElement("div");
    errorDiv.className = "graphviz-error";
    errorDiv.textContent = "Failed to render Graphviz diagram";
    element.replaceWith(errorDiv);
  }
}

/**
 * Renders all Graphviz diagrams in the given element(s).
 *
 * Finds all elements with class 'graphviz' or 'dot' and renders them
 * using Viz.js. The diagram code should be directly in the element's
 * textContent.
 *
 * @param elements - The HTML element(s) containing Graphviz code blocks to render
 * @returns Promise that resolves when rendering is complete
 */
export async function renderGraphvizDiagrams(elements: HTMLElement | HTMLElement[]): Promise<void> {
  const Viz = getViz();
  if (!Viz) {
    console.warn("Viz.js is not available. Make sure it's loaded from CDN in index.html");
    return;
  }

  const elementsArray = Array.isArray(elements) ? elements : [elements];

  // Find all elements with class 'graphviz' or 'dot' within the provided elements
  const graphvizElements: HTMLElement[] = [];
  for (const element of elementsArray) {
    const diagrams = element.querySelectorAll<HTMLElement>(".graphviz, .dot");
    graphvizElements.push(...Array.from(diagrams));
  }

  if (graphvizElements.length === 0) {
    return;
  }

  // Render all diagrams in parallel
  await Promise.all(graphvizElements.map((el) => renderGraphvizDiagram(el)));
}
