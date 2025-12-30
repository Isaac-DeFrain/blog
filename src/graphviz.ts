/**
 * Graphviz utilities for rendering diagram code blocks.
 *
 * Provides helper functions to render Graphviz diagrams in dynamically loaded content.
 * This module uses @viz-js/viz to render DOT code to SVG.
 */

import { instance, type Viz } from "@viz-js/viz";

// Cache the Viz instance to avoid re-initializing it multiple times
let vizInstance: Viz | null = null;

/**
 * Gets the Viz instance, initializing it if necessary.
 *
 * @returns Promise that resolves with the Viz instance
 */
async function getViz(): Promise<Viz> {
  if (!vizInstance) {
    vizInstance = await instance();
  }
  return vizInstance;
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
  // Get the DOT code from the element's textContent
  const dotCode = element.textContent?.trim();
  if (!dotCode) {
    console.warn("Empty Graphviz diagram code");
    return;
  }

  try {
    const viz = await getViz();

    // Use renderSVGElement to get the SVG element directly
    const svgElement = viz.renderSVGElement(dotCode);

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
