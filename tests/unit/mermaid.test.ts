/**
 * Unit tests for Mermaid diagram rendering.
 * Mermaid is loaded from CDN and initialized in index.html.
 * This module tests the renderMermaidDiagrams function.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock window.mermaid (loaded from CDN)
const mockMermaid = {
  run: vi.fn().mockResolvedValue(undefined),
  initialize: vi.fn(),
};

describe("renderMermaidDiagrams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Set up window.mermaid mock
    (global as any).window = {
      ...global.window,
      mermaid: mockMermaid,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (global as any).window.mermaid;
  });

  it("should render diagrams using run() when mermaid is available", async () => {
    const { renderMermaidDiagrams } = await import("../../src/mermaid");

    const container = document.createElement("div");
    const mermaidElement = document.createElement("pre");
    mermaidElement.className = "mermaid";
    mermaidElement.textContent = "graph TD\n    A-->B";
    container.appendChild(mermaidElement);

    await renderMermaidDiagrams(container);

    expect(mockMermaid.run).toHaveBeenCalledWith({ nodes: [mermaidElement] });
  });

  it("should find and render multiple mermaid diagrams", async () => {
    const { renderMermaidDiagrams } = await import("../../src/mermaid");

    const container = document.createElement("div");
    const mermaid1 = document.createElement("pre");
    mermaid1.className = "mermaid";
    mermaid1.textContent = "graph TD\n    A-->B";

    const mermaid2 = document.createElement("pre");
    mermaid2.className = "mermaid";
    mermaid2.textContent = "sequenceDiagram\n    A->>B: Hello";

    container.appendChild(mermaid1);
    container.appendChild(mermaid2);

    await renderMermaidDiagrams(container);

    expect(mockMermaid.run).toHaveBeenCalledWith({ nodes: [mermaid1, mermaid2] });
  });

  it("should handle empty element arrays", async () => {
    const { renderMermaidDiagrams } = await import("../../src/mermaid");

    const container = document.createElement("div");
    // No mermaid elements

    await renderMermaidDiagrams(container);

    expect(mockMermaid.run).not.toHaveBeenCalled();
  });

  it("should handle elements without mermaid diagrams", async () => {
    const { renderMermaidDiagrams } = await import("../../src/mermaid");

    const container = document.createElement("div");
    const regularDiv = document.createElement("div");
    regularDiv.textContent = "Regular content";
    container.appendChild(regularDiv);

    await renderMermaidDiagrams(container);

    expect(mockMermaid.run).not.toHaveBeenCalled();
  });

  it("should handle missing mermaid gracefully", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    delete (global as any).window.mermaid;

    const { renderMermaidDiagrams } = await import("../../src/mermaid");

    const container = document.createElement("div");
    const mermaidElement = document.createElement("pre");
    mermaidElement.className = "mermaid";
    mermaidElement.textContent = "graph TD\n    A-->B";
    container.appendChild(mermaidElement);

    await renderMermaidDiagrams(container);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Mermaid is not available. Make sure it's loaded from CDN in index.html",
    );
    expect(mockMermaid.run).not.toHaveBeenCalled();

    consoleWarnSpy.mockRestore();
  });

  it("should handle run() errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockMermaid.run.mockRejectedValue(new Error("Run failed"));

    const { renderMermaidDiagrams } = await import("../../src/mermaid");

    const container = document.createElement("div");
    const mermaidElement = document.createElement("pre");
    mermaidElement.className = "mermaid";
    mermaidElement.textContent = "graph TD\n    A-->B";
    container.appendChild(mermaidElement);

    await renderMermaidDiagrams(container);

    expect(consoleErrorSpy).toHaveBeenCalledWith("Mermaid rendering error:", expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it("should handle missing run() function", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const originalRun = mockMermaid.run;
    delete (mockMermaid as any).run;

    const { renderMermaidDiagrams } = await import("../../src/mermaid");

    const container = document.createElement("div");
    const mermaidElement = document.createElement("pre");
    mermaidElement.className = "mermaid";
    mermaidElement.textContent = "graph TD\n    A-->B";
    container.appendChild(mermaidElement);

    await renderMermaidDiagrams(container);

    expect(consoleWarnSpy).toHaveBeenCalledWith("Mermaid.run() is not available");

    consoleWarnSpy.mockRestore();
    mockMermaid.run = originalRun;
  });

  it("should handle multiple container elements", async () => {
    const { renderMermaidDiagrams } = await import("../../src/mermaid");

    const container1 = document.createElement("div");
    const mermaid1 = document.createElement("pre");
    mermaid1.className = "mermaid";
    mermaid1.textContent = "graph TD\n    A-->B";
    container1.appendChild(mermaid1);

    const container2 = document.createElement("div");
    const mermaid2 = document.createElement("pre");
    mermaid2.className = "mermaid";
    mermaid2.textContent = "sequenceDiagram\n    A->>B: Hello";
    container2.appendChild(mermaid2);

    await renderMermaidDiagrams([container1, container2]);

    expect(mockMermaid.run).toHaveBeenCalledWith({ nodes: [mermaid1, mermaid2] });
  });
});
