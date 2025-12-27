/**
 * Integration test that verifies Graphviz diagrams are rendered correctly
 * in markdown content.
 */

import { describe, it, expect, beforeAll, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { createHighlightConfig } from "../../src/blog";
import { renderGraphvizDiagrams } from "../../src/graphviz";

describe("Graphviz Diagram Rendering Integration Test", () => {
  const distBlogsDir = join(process.cwd(), "dist", "posts");
  const manifestPath = join(distBlogsDir, "manifest.json");
  let manifest: { files: string[] };
  let marked: Marked;

  // Mock SVG element creation
  function createMockSVGElement(): SVGElement {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(g);
    return svg;
  }

  // Mock window.Viz for renderGraphvizDiagrams
  const mockRenderSVGElement = vi.fn().mockResolvedValue(createMockSVGElement());
  const mockRenderString = vi.fn();
  
  // Create a proper constructor class for Viz mock
  class MockViz {
    renderSVGElement = mockRenderSVGElement;
    renderString = mockRenderString;
  }
  
  // Create a spy-able constructor wrapper
  let mockVizConstructor: typeof MockViz;
  let vizCallTracker: ReturnType<typeof vi.fn>;

  beforeAll(() => {
    if (!existsSync(distBlogsDir)) {
      throw new Error(`Dist directory not found: ${distBlogsDir}. Please run 'npm run build' first.`);
    }

    if (!existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}. The build may have failed.`);
    }

    const manifestContent = readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(manifestContent) as { files: string[] };

    // Configure marked with syntax highlighting and graphviz support (same as blog.ts)
    marked = new Marked(markedHighlight(createHighlightConfig(hljs)));

    // Add graphviz code block handler (same as blog.ts)
    marked.use({
      renderer: {
        code({ lang, text }) {
          if (lang === "mermaid") {
            return `<pre class="mermaid">${text}</pre>\n`;
          }

          if (lang === "dot" || lang === "graphviz") {
            return `<pre class="graphviz">${text}</pre>\n`;
          }

          return false; // Use default renderer for other code blocks
        },
      },
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up window.Viz mock using Proxy to intercept constructor calls
    vizCallTracker = vi.fn() as any;
    mockVizConstructor = new Proxy(MockViz, {
      construct() {
        (vizCallTracker as any)();
        return new MockViz();
      },
      apply() {
        (vizCallTracker as any)();
        return new MockViz();
      }
    }) as any;
    (global as any).window = {
      ...global.window,
      Viz: mockVizConstructor,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Graphviz diagram rendering", () => {
    const graphvizBlockRegex = /```(?:dot|graphviz)\n([\s\S]*?)```/g;

    it("should render graphviz code blocks with graphviz class", () => {
      for (const filename of manifest.files) {
        const filePath = join(distBlogsDir, filename);

        if (!existsSync(filePath)) {
          continue;
        }

        const markdown = readFileSync(filePath, "utf-8");
        const markdownWithoutFrontmatter = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");

        // Find all graphviz blocks (both dot and graphviz)
        const graphvizBlocks: string[] = [];
        let match: RegExpExecArray | null = null;
        graphvizBlockRegex.lastIndex = 0; // Reset regex

        while ((match = graphvizBlockRegex.exec(markdownWithoutFrontmatter)) !== null) {
          graphvizBlocks.push(match[1]);
        }

        if (graphvizBlocks.length === 0) {
          continue; // No graphviz blocks in this file
        }

        // Render the markdown to HTML
        const html = marked.parse(markdownWithoutFrontmatter) as string;

        // Verify graphviz blocks are wrapped in pre tags with class "graphviz"
        // Count graphviz pre elements in HTML
        const graphvizPreMatches = html.match(/<pre[^>]*class=["']graphviz["'][^>]*>/g);
        expect(graphvizPreMatches?.length || 0).toBeGreaterThanOrEqual(graphvizBlocks.length);

        // Verify that graphviz elements exist and have content
        const container = document.createElement("div");
        container.innerHTML = html;
        const graphvizElements = container.querySelectorAll(".graphviz");
        expect(graphvizElements.length).toBeGreaterThanOrEqual(graphvizBlocks.length);

        // Verify each graphviz element has content
        graphvizElements.forEach((element) => {
          expect(element.textContent?.trim().length).toBeGreaterThan(0);
        });
      }
    });

    it("should render a simple graphviz diagram with dot language", async () => {
      const markdown = `# Test

\`\`\`dot
digraph {
    a -> b
}
\`\`\`
`;

      const html = marked.parse(markdown) as string;

      // Create a container and add the HTML
      const container = document.createElement("div");
      container.innerHTML = html;

      // Verify graphviz element exists
      const graphvizElement = container.querySelector(".graphviz");
      expect(graphvizElement).toBeTruthy();
      expect(graphvizElement?.textContent).toContain("digraph");

      // Render the diagram
      await renderGraphvizDiagrams(container);

      // Verify Viz was called with the correct DOT code
      expect(vizCallTracker).toHaveBeenCalled();
      expect(mockRenderSVGElement).toHaveBeenCalledWith(expect.stringContaining("digraph"));
    });

    it("should render a simple graphviz diagram with graphviz language", async () => {
      const markdown = `# Test

\`\`\`graphviz
graph {
    x -- y
}
\`\`\`
`;

      const html = marked.parse(markdown) as string;

      const container = document.createElement("div");
      container.innerHTML = html;

      const graphvizElement = container.querySelector(".graphviz");
      expect(graphvizElement).toBeTruthy();
      expect(graphvizElement?.textContent).toContain("graph");

      await renderGraphvizDiagrams(container);

      expect(vizCallTracker).toHaveBeenCalled();
      expect(mockRenderSVGElement).toHaveBeenCalledWith(expect.stringContaining("graph"));
    });

    it("should render multiple graphviz diagrams", async () => {
      const markdown = `# Test

\`\`\`dot
digraph {
    a -> b
}
\`\`\`

\`\`\`graphviz
graph {
    x -- y
}
\`\`\`
`;

      const html = marked.parse(markdown) as string;

      const container = document.createElement("div");
      container.innerHTML = html;

      const graphvizElements = container.querySelectorAll(".graphviz");
      expect(graphvizElements.length).toBe(2);

      // Verify both have the correct content
      expect(graphvizElements[0]?.textContent).toContain("digraph");
      expect(graphvizElements[1]?.textContent).toContain("graph");

      // Render the diagrams
      await renderGraphvizDiagrams(container);

      // Verify both diagrams were rendered
      expect(vizCallTracker).toHaveBeenCalledTimes(2);
      expect(mockRenderSVGElement).toHaveBeenCalledTimes(2);
    });

    it("should handle graphviz diagrams alongside mermaid diagrams", async () => {
      const markdown = `# Test

\`\`\`mermaid
graph TD
    A --> B
\`\`\`

\`\`\`dot
digraph {
    a -> b
}
\`\`\`
`;

      const html = marked.parse(markdown) as string;

      const container = document.createElement("div");
      container.innerHTML = html;

      // Verify both types of diagrams exist
      const mermaidElements = container.querySelectorAll(".mermaid");
      const graphvizElements = container.querySelectorAll(".graphviz");

      expect(mermaidElements.length).toBe(1);
      expect(graphvizElements.length).toBe(1);

      // Render graphviz diagrams (mermaid would be rendered separately)
      await renderGraphvizDiagrams(container);

      // Verify graphviz was rendered
      expect(vizCallTracker).toHaveBeenCalledTimes(1);
      expect(mockRenderSVGElement).toHaveBeenCalledTimes(1);

      // Verify mermaid element still exists
      expect(container.querySelectorAll(".mermaid").length).toBe(1);
    });

    it("should handle complex graphviz diagrams", async () => {
      const markdown = `# Test

\`\`\`dot
digraph G {
    rankdir=LR;
    node [shape=box];
    Start -> Process1;
    Process1 -> Decision;
    Decision ->|Yes| Process2;
    Decision ->|No| End;
    Process2 -> End;
}
\`\`\`
`;

      const html = marked.parse(markdown) as string;

      const container = document.createElement("div");
      container.innerHTML = html;

      const graphvizElement = container.querySelector(".graphviz");
      expect(graphvizElement).toBeTruthy();

      await renderGraphvizDiagrams(container);

      expect(vizCallTracker).toHaveBeenCalled();
      expect(mockRenderSVGElement).toHaveBeenCalledWith(expect.stringContaining("digraph G"));
    });

    it("should handle graphviz diagrams in actual blog posts", async () => {
      // Find a post with graphviz diagrams (if any exist)
      let postWithGraphviz: string | null = null;

      for (const filename of manifest.files) {
        const filePath = join(distBlogsDir, filename);
        if (!existsSync(filePath)) {
          continue;
        }

        const markdown = readFileSync(filePath, "utf-8");
        if (markdown.includes("```dot") || markdown.includes("```graphviz")) {
          postWithGraphviz = markdown;
          break;
        }
      }

      if (!postWithGraphviz) {
        // Skip if no posts have graphviz diagrams (this is expected for now)
        // This test will pass when we add graphviz diagrams to posts
        return;
      }

      const markdownWithoutFrontmatter = postWithGraphviz.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");
      const html = marked.parse(markdownWithoutFrontmatter) as string;

      const container = document.createElement("div");
      container.innerHTML = html;

      const graphvizElements = container.querySelectorAll(".graphviz");
      expect(graphvizElements.length).toBeGreaterThan(0);

      // Verify graphviz elements are properly structured
      graphvizElements.forEach((element) => {
        expect(element.textContent?.trim().length).toBeGreaterThan(0);
      });

      // Render the diagrams (should complete without error)
      await renderGraphvizDiagrams(container);

      // Verify rendering was attempted
      expect(vizCallTracker).toHaveBeenCalled();
    });
  });
});

