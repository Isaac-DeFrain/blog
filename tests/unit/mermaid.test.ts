/**
 * Unit tests for Mermaid diagram rendering.
 * This module tests the renderMermaidDiagrams function.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock window.mermaid (loaded from CDN)
const mockRun = vi.fn().mockResolvedValue(undefined);
const mockInitialize = vi.fn();

const mockMermaid = {
  run: mockRun,
  initialize: mockInitialize,
};

describe("renderMermaidDiagrams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRun.mockResolvedValue(undefined);
    mockInitialize.mockImplementation(() => {});
    // Set up window.mermaid mock (simulating CDN load)
    (window as any).mermaid = mockMermaid;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete (window as any).mermaid;
  });

  it("should render diagrams using run() when mermaid is available", async () => {
    const { renderMermaidDiagrams } = await import("../../src/mermaid");

    const container = document.createElement("div");
    const mermaidElement = document.createElement("pre");
    mermaidElement.className = "mermaid";
    mermaidElement.textContent = "graph TD\n    A-->B";
    container.appendChild(mermaidElement);

    await renderMermaidDiagrams(container);

    expect(mockRun).toHaveBeenCalledWith({ nodes: [mermaidElement] });
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

    expect(mockRun).toHaveBeenCalledWith({ nodes: [mermaid1, mermaid2] });
  });

  it("should handle empty element arrays", async () => {
    const { renderMermaidDiagrams } = await import("../../src/mermaid");

    const container = document.createElement("div");
    // No mermaid elements

    await renderMermaidDiagrams(container);

    expect(mockRun).not.toHaveBeenCalled();
  });

  it("should handle elements without mermaid diagrams", async () => {
    const { renderMermaidDiagrams } = await import("../../src/mermaid");

    const container = document.createElement("div");
    const regularDiv = document.createElement("div");
    regularDiv.textContent = "Regular content";
    container.appendChild(regularDiv);

    await renderMermaidDiagrams(container);

    expect(mockRun).not.toHaveBeenCalled();
  });

  it("should initialize mermaid on first use", async () => {
    // Clear mermaid to test initialization
    delete (window as any).mermaid;
    
    const { renderMermaidDiagrams } = await import("../../src/mermaid");

    const container = document.createElement("div");
    const mermaidElement = document.createElement("pre");
    mermaidElement.className = "mermaid";
    mermaidElement.textContent = "graph TD\n    A-->B";
    container.appendChild(mermaidElement);

    // Simulate mermaid loading from CDN
    setTimeout(() => {
      (window as any).mermaid = mockMermaid;
    }, 10);

    await renderMermaidDiagrams(container);

    expect(mockInitialize).toHaveBeenCalledWith({ startOnLoad: false });
    expect(mockRun).toHaveBeenCalled();
  });

  it("should handle run() errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRun.mockRejectedValueOnce(new Error("Run failed"));

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
    const originalRun = mockRun;
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

    expect(mockRun).toHaveBeenCalledWith({ nodes: [mermaid1, mermaid2] });
  });
});
