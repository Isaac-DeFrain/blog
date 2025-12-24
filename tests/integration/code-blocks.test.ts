/**
 * Integration test that verifies code blocks are rendered correctly with syntax highlighting
 * and proper HTML structure.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { createHighlightConfig } from "../../src/blog";
describe("Code Blocks Rendering Integration Test", () => {
  const distBlogsDir = join(process.cwd(), "dist", "posts");
  const manifestPath = join(distBlogsDir, "manifest.json");
  let manifest: { files: string[] };
  let marked: Marked;

  beforeAll(() => {
    if (!existsSync(distBlogsDir)) {
      throw new Error(`Dist directory not found: ${distBlogsDir}. Please run 'npm run build' first.`);
    }

    if (!existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}. The build may have failed.`);
    }

    const manifestContent = readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(manifestContent) as { files: string[] };

    // Configure marked with syntax highlighting (same as blog.ts)
    marked = new Marked(markedHighlight(createHighlightConfig(hljs)));
  });

  describe("Code block rendering", () => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

    it("should render code blocks with syntax highlighting", () => {
      for (const filename of manifest.files) {
        const filePath = join(distBlogsDir, filename);

        if (!existsSync(filePath)) {
          continue;
        }

        const markdown = readFileSync(filePath, "utf-8");
        const markdownWithoutFrontmatter = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");

        // Find all code blocks
        const codeBlocks: { lang: string | null; code: string }[] = [];
        let match: RegExpExecArray | null = null;
        codeBlockRegex.lastIndex = 0; // Reset regex

        while ((match = codeBlockRegex.exec(markdownWithoutFrontmatter)) !== null) {
          codeBlocks.push({
            lang: match[1] || null,
            code: match[2],
          });
        }

        if (codeBlocks.length === 0) {
          continue; // No code blocks in this file
        }

        // Render the markdown to HTML
        const html = marked.parse(markdownWithoutFrontmatter) as string;

        // Verify each code block
        for (let i = 0; i < codeBlocks.length; i++) {
          const block = codeBlocks[i];

          if (block.lang) {
            const expectedClass = `hljs language-${block.lang}`;

            if (!html.includes(expectedClass)) {
              // Check if it fell back to plaintext (unknown language)
              if (hljs.getLanguage(block.lang)) {
                expect(html).toContain(expectedClass);
              } else {
                // Language not recognized, should fall back to plaintext
                expect(html).toContain("hljs language-plaintext");
              }
            }
          }

          // Verify code content is present
          const firstLine = block.code.split("\n").find((line) => line.trim().length > 0);
          if (firstLine) {
            const decodeHtmlEntities = (text: string) =>
              text
                .replace(/&#x27;/g, "'")
                .replace(/&quot;/g, '"')
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">");
            const plainHtml = decodeHtmlEntities(html.replace(/<[^>]*>/g, ""));
            const plainFirstLine = firstLine.trim();

            expect(plainHtml).toContain(plainFirstLine);
          }
        }
      }
    });

    it("should have proper <pre><code> structure", () => {
      for (const filename of manifest.files) {
        const filePath = join(distBlogsDir, filename);

        if (!existsSync(filePath)) {
          continue;
        }

        const markdown = readFileSync(filePath, "utf-8");
        const markdownWithoutFrontmatter = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");

        // Find all code blocks
        const codeBlocks: { lang: string | null; code: string }[] = [];
        let match: RegExpExecArray | null = null;
        codeBlockRegex.lastIndex = 0;

        while ((match = codeBlockRegex.exec(markdownWithoutFrontmatter)) !== null) {
          codeBlocks.push({
            lang: match[1] || null,
            code: match[2],
          });
        }

        if (codeBlocks.length === 0) {
          continue;
        }

        const html = marked.parse(markdownWithoutFrontmatter) as string;
        const preCodeCount = (html.match(/<pre><code/g) || []).length;

        expect(preCodeCount).toBeGreaterThanOrEqual(codeBlocks.length);
      }
    });
  });
});
