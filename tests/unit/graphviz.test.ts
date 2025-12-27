/**
 * Unit tests for Graphviz diagram rendering.
 * Graphviz is loaded from CDN in index.html.
 * This module tests the renderGraphvizDiagrams function.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock SVG element creation
function createMockSVGElement(): SVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svg.appendChild(g);
  return svg;
}

// Mock window.Viz (loaded from CDN)
const mockRenderSVGElement = vi.fn().mockResolvedValue(createMockSVGElement());
const mockRenderString = vi.fn();

// Create a constructor function that can be spied on
function VizConstructor() {
  return {
    renderSVGElement: mockRenderSVGElement,
    renderString: mockRenderString,
  };
}

const mockVizConstructor = vi.fn(VizConstructor);

describe("renderGraphvizDiagrams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Reset mock to return resolved value by default
    mockRenderSVGElement.mockResolvedValue(createMockSVGElement());

    // Set up window.Viz mock
    (global as any).window = {
      ...global.window,
      Viz: mockVizConstructor,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (global as any).window.Viz;
  });

  it("should render diagrams using Viz when Viz is available", async () => {
    const { renderGraphvizDiagrams } = await import("../../src/graphviz");

    const container = document.createElement("div");
    const graphvizElement = document.createElement("pre");

    graphvizElement.className = "graphviz";
    graphvizElement.textContent = "digraph { a -> b }";
    container.appendChild(graphvizElement);

    await renderGraphvizDiagrams(container);

    expect(mockVizConstructor).toHaveBeenCalled();
    expect(mockRenderSVGElement).toHaveBeenCalledWith("digraph { a -> b }");
  });

  it("should find and render multiple graphviz diagrams", async () => {
    const { renderGraphvizDiagrams } = await import("../../src/graphviz");

    const container = document.createElement("div");
    const graphviz1 = document.createElement("pre");
    graphviz1.className = "graphviz";
    graphviz1.textContent = "digraph { a -> b }";

    const graphviz2 = document.createElement("pre");
    graphviz2.className = "dot";
    graphviz2.textContent = "graph { x -- y }";

    container.appendChild(graphviz1);
    container.appendChild(graphviz2);

    await renderGraphvizDiagrams(container);

    expect(mockVizConstructor).toHaveBeenCalledTimes(2);
    expect(mockRenderSVGElement).toHaveBeenCalledWith("digraph { a -> b }");
    expect(mockRenderSVGElement).toHaveBeenCalledWith("graph { x -- y }");
  });

  it("should handle both graphviz and dot class names", async () => {
    const { renderGraphvizDiagrams } = await import("../../src/graphviz");

    const container = document.createElement("div");
    const graphvizElement = document.createElement("pre");
    graphvizElement.className = "graphviz";
    graphvizElement.textContent = "digraph { a -> b }";

    const dotElement = document.createElement("pre");
    dotElement.className = "dot";
    dotElement.textContent = "graph { x -- y }";

    container.appendChild(graphvizElement);
    container.appendChild(dotElement);

    await renderGraphvizDiagrams(container);

    expect(mockVizConstructor).toHaveBeenCalledTimes(2);
    expect(mockRenderSVGElement).toHaveBeenCalledTimes(2);
  });

  it("should handle empty element arrays", async () => {
    const { renderGraphvizDiagrams } = await import("../../src/graphviz");

    const container = document.createElement("div");
    // No graphviz elements

    await renderGraphvizDiagrams(container);

    expect(mockVizConstructor).not.toHaveBeenCalled();
    expect(mockRenderSVGElement).not.toHaveBeenCalled();
  });

  it("should handle elements without graphviz diagrams", async () => {
    const { renderGraphvizDiagrams } = await import("../../src/graphviz");

    const container = document.createElement("div");
    const regularDiv = document.createElement("div");
    regularDiv.textContent = "Regular content";
    container.appendChild(regularDiv);

    await renderGraphvizDiagrams(container);

    expect(mockVizConstructor).not.toHaveBeenCalled();
    expect(mockRenderSVGElement).not.toHaveBeenCalled();
  });

  it("should handle missing Viz gracefully", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    delete (global as any).window.Viz;

    const { renderGraphvizDiagrams } = await import("../../src/graphviz");

    const container = document.createElement("div");
    const graphvizElement = document.createElement("pre");

    graphvizElement.className = "graphviz";
    graphvizElement.textContent = "digraph { a -> b }";
    container.appendChild(graphvizElement);

    await renderGraphvizDiagrams(container);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Viz.js is not available. Make sure it's loaded from CDN in index.html",
    );
    expect(mockVizConstructor).not.toHaveBeenCalled();
    expect(mockRenderSVGElement).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("should handle empty diagram code gracefully", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { renderGraphvizDiagrams } = await import("../../src/graphviz");

    const container = document.createElement("div");
    const graphvizElement = document.createElement("pre");

    graphvizElement.className = "graphviz";
    graphvizElement.textContent = "";
    container.appendChild(graphvizElement);

    await renderGraphvizDiagrams(container);

    expect(consoleWarnSpy).toHaveBeenCalledWith("Empty Graphviz diagram code");
    expect(mockRenderSVGElement).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("should handle rendering errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRenderSVGElement.mockRejectedValue(new Error("Invalid DOT syntax"));

    const { renderGraphvizDiagrams } = await import("../../src/graphviz");

    const container = document.createElement("div");
    const graphvizElement = document.createElement("pre");

    graphvizElement.className = "graphviz";
    graphvizElement.textContent = "invalid dot code";
    container.appendChild(graphvizElement);

    await renderGraphvizDiagrams(container);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Graphviz rendering error:", expect.any(Error));

    // Check that error message was added to DOM
    const errorDiv = container.querySelector(".graphviz-error");
    expect(errorDiv).not.toBeNull();
    expect(errorDiv?.textContent).toBe("Failed to render Graphviz diagram");

    consoleErrorSpy.mockRestore();
  });

  it("should replace pre element with SVG when rendering succeeds", async () => {
    const { renderGraphvizDiagrams } = await import("../../src/graphviz");

    const container = document.createElement("div");
    const graphvizElement = document.createElement("pre");
    graphvizElement.className = "graphviz";
    graphvizElement.textContent = "digraph { a -> b }";
    container.appendChild(graphvizElement);

    await renderGraphvizDiagrams(container);

    // The pre element should be replaced with a graphviz-container div containing the SVG
    const graphvizContainer = container.querySelector(".graphviz-container");
    expect(graphvizContainer).not.toBeNull();
    expect(graphvizContainer?.querySelector("svg")).not.toBeNull();
  });

  it("should handle multiple container elements", async () => {
    const { renderGraphvizDiagrams } = await import("../../src/graphviz");

    const container1 = document.createElement("div");
    const graphviz1 = document.createElement("pre");
    graphviz1.className = "graphviz";
    graphviz1.textContent = "digraph { a -> b }";
    container1.appendChild(graphviz1);

    const container2 = document.createElement("div");
    const graphviz2 = document.createElement("pre");
    graphviz2.className = "dot";
    graphviz2.textContent = "graph { x -- y }";
    container2.appendChild(graphviz2);

    await renderGraphvizDiagrams([container1, container2]);

    expect(mockVizConstructor).toHaveBeenCalledTimes(2);
    expect(mockRenderSVGElement).toHaveBeenCalledTimes(2);
  });

  it("should trim whitespace from diagram code", async () => {
    const { renderGraphvizDiagrams } = await import("../../src/graphviz");

    const container = document.createElement("div");
    const graphvizElement = document.createElement("pre");
    graphvizElement.className = "graphviz";
    graphvizElement.textContent = "  \n  digraph { a -> b }  \n  ";
    container.appendChild(graphvizElement);

    await renderGraphvizDiagrams(container);

    expect(mockRenderSVGElement).toHaveBeenCalledWith("digraph { a -> b }");
  });
});
