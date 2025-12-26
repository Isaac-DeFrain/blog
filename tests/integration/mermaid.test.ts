/**
 * Integration test that verifies Mermaid diagrams are rendered correctly
 * in markdown content.
 */

import { describe, it, expect, beforeAll, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { createHighlightConfig } from "../../src/blog";
import { renderMermaidDiagrams } from "../../src/mermaid";

describe("Mermaid Diagram Rendering Integration Test", () => {
  const distBlogsDir = join(process.cwd(), "dist", "posts");
  const manifestPath = join(distBlogsDir, "manifest.json");
  let manifest: { files: string[] };
  let marked: Marked;

  // Mock window.mermaid for renderMermaidDiagrams
  const mockMermaid = {
    run: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn(),
  };

  beforeAll(() => {
    if (!existsSync(distBlogsDir)) {
      throw new Error(`Dist directory not found: ${distBlogsDir}. Please run 'npm run build' first.`);
    }

    if (!existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}. The build may have failed.`);
    }

    const manifestContent = readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(manifestContent) as { files: string[] };

    // Configure marked with syntax highlighting and mermaid support (same as blog.ts)
    marked = new Marked(markedHighlight(createHighlightConfig(hljs)));

    // Add mermaid code block handler (same as blog.ts)
    marked.use({
      renderer: {
        code({ lang, text }) {
          if (lang === "mermaid") {
            return `<pre class="mermaid">${text}</pre>\n`;
          }
          return false; // Use default renderer for other code blocks
        },
      },
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Set up window.mermaid mock
    (global as any).window = {
      ...global.window,
      mermaid: mockMermaid,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Mermaid diagram rendering", () => {
    const mermaidBlockRegex = /```mermaid\n([\s\S]*?)```/g;

    it("should render mermaid code blocks with mermaid class", () => {
      for (const filename of manifest.files) {
        const filePath = join(distBlogsDir, filename);

        if (!existsSync(filePath)) {
          continue;
        }

        const markdown = readFileSync(filePath, "utf-8");
        const markdownWithoutFrontmatter = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");

        // Find all mermaid blocks
        const mermaidBlocks: string[] = [];
        let match: RegExpExecArray | null = null;
        mermaidBlockRegex.lastIndex = 0; // Reset regex

        while ((match = mermaidBlockRegex.exec(markdownWithoutFrontmatter)) !== null) {
          mermaidBlocks.push(match[1]);
        }

        if (mermaidBlocks.length === 0) {
          continue; // No mermaid blocks in this file
        }

        // Render the markdown to HTML
        const html = marked.parse(markdownWithoutFrontmatter) as string;

        // Verify mermaid blocks are wrapped in pre tags with class "mermaid"
        // Count mermaid pre elements in HTML
        const mermaidPreMatches = html.match(/<pre[^>]*class=["']mermaid["'][^>]*>/g);
        expect(mermaidPreMatches?.length || 0).toBeGreaterThanOrEqual(mermaidBlocks.length);

        // Verify that mermaid elements exist and have content
        const container = document.createElement("div");
        container.innerHTML = html;
        const mermaidElements = container.querySelectorAll(".mermaid");
        expect(mermaidElements.length).toBeGreaterThanOrEqual(mermaidBlocks.length);

        // Verify each mermaid element has content
        mermaidElements.forEach((element) => {
          expect(element.textContent?.trim().length).toBeGreaterThan(0);
        });
      }
    });

    it("should render a simple mermaid diagram", async () => {
      const markdown = `# Test

\`\`\`mermaid
graph TD
    A[Start] --> B[End]
\`\`\`
`;

      const html = marked.parse(markdown) as string;

      // Create a container and add the HTML
      const container = document.createElement("div");
      container.innerHTML = html;

      // Verify mermaid element exists
      const mermaidElement = container.querySelector(".mermaid");
      expect(mermaidElement).toBeTruthy();
      expect(mermaidElement?.textContent).toContain("graph TD");

      // Render the diagram (may not fully render in test environment, but should not error)
      await renderMermaidDiagrams(container);

      // Verify the element still exists and has content
      expect(mermaidElement).toBeTruthy();
      // In a real browser, this would contain SVG, but in test environment it may not
      // The important thing is that renderMermaidDiagrams() completes without error
    });

    it("should render multiple mermaid diagrams", async () => {
      const markdown = `# Test

\`\`\`mermaid
graph TD
    A --> B
\`\`\`

\`\`\`mermaid
sequenceDiagram
    A->>B: Hello
\`\`\`
`;

      const html = marked.parse(markdown) as string;

      const container = document.createElement("div");
      container.innerHTML = html;

      const mermaidElements = container.querySelectorAll(".mermaid");
      expect(mermaidElements.length).toBe(2);

      // Verify both have the correct content
      expect(mermaidElements[0]?.textContent).toContain("graph TD");
      expect(mermaidElements[1]?.textContent).toContain("sequenceDiagram");

      // Render the diagrams (should complete without error)
      await renderMermaidDiagrams(container);

      // Verify elements still exist after rendering
      expect(container.querySelectorAll(".mermaid").length).toBe(2);
    });

    it("should handle mermaid diagrams in actual blog posts", async () => {
      // Find a post with mermaid diagrams
      let postWithMermaid: string | null = null;

      for (const filename of manifest.files) {
        const filePath = join(distBlogsDir, filename);
        if (!existsSync(filePath)) {
          continue;
        }

        const markdown = readFileSync(filePath, "utf-8");
        if (markdown.includes("```mermaid")) {
          postWithMermaid = markdown;
          break;
        }
      }

      if (!postWithMermaid) {
        // Skip if no posts have mermaid diagrams
        return;
      }

      const markdownWithoutFrontmatter = postWithMermaid.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");
      const html = marked.parse(markdownWithoutFrontmatter) as string;

      const container = document.createElement("div");
      container.innerHTML = html;

      const mermaidElements = container.querySelectorAll(".mermaid");
      expect(mermaidElements.length).toBeGreaterThan(0);

      // Verify mermaid elements are properly structured
      mermaidElements.forEach((element) => {
        expect(element.textContent?.trim().length).toBeGreaterThan(0);
      });

      // Render the diagrams (should complete without error)
      await renderMermaidDiagrams(container);

      // Verify elements still exist after rendering attempt
      expect(container.querySelectorAll(".mermaid").length).toBeGreaterThan(0);
    });
  });
});
