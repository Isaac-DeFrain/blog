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
import { PostRenderer } from "../../src/blog/PostRenderer";
import { findUnnestedCodeBlocks } from "../helpers/markdown";
import { wrapJsCodeRun } from "../../src/typescript-runner/index";

// Setup marked with TypeScript executable block support
async function setupMarkedWithTypeScriptExecutableBlock() {
  const { marked } = await import("marked");
  const { markedHighlight } = await import("marked-highlight");
  const hljsModule = await import("highlight.js");

  const hljs = hljsModule.default || hljsModule;
  const highlightConfig = createHighlightConfig(hljs);

  marked.use(markedHighlight(highlightConfig));
  marked.use({
    renderer: {
      code({ lang, text }) {
        if (lang === "mermaid") {
          return `<pre class="mermaid">${text}</pre>`;
        }

        if (lang === "dot" || lang === "graphviz") {
          return `<pre class="graphviz">${text}</pre>`;
        }

        if (lang === "typescript:run") {
          const renderer = new PostRenderer();
          const blockId = `ts-run-test-${Math.random().toString(36).substring(2, 11)}`;
          return renderer.createTypeScriptExecutableBlock(text, blockId, highlightConfig);
        }

        return false;
      },
    },
  });

  return marked;
}

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
    it("should render code blocks with syntax highlighting", () => {
      for (const filename of manifest.files) {
        const filePath = join(distBlogsDir, filename);

        if (!existsSync(filePath)) {
          continue;
        }

        const markdown = readFileSync(filePath, "utf-8");
        const markdownWithoutFrontmatter = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");
        const codeBlocks = findUnnestedCodeBlocks(markdownWithoutFrontmatter).map((block) => ({
          lang: block.lang,
          code: block.code,
        }));

        if (codeBlocks.length === 0) {
          continue;
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

          // Verify code content is present in the HTML structure
          // Check if code appears in <pre><code> blocks (more reliably than plain text extraction)
          const container = document.createElement("div");
          container.innerHTML = html;
          const codeElements = container.querySelectorAll("pre code");
          const codeTexts = Array.from(codeElements).map((el) => {
            // Get text content and normalize whitespace for comparison
            return (el.textContent || "").replace(/\s+/g, " ").trim();
          });
          const allCodeText = codeTexts.join(" ");

          // Check if any significant portion of the code block appears in the rendered HTML
          // We look for a unique substring from the code (at least 20 chars) to avoid false matches
          const codeSnippet = block.code.trim().substring(0, Math.min(50, block.code.length)).replace(/\s+/g, " ");
          if (codeSnippet.length >= 20) {
            expect(allCodeText).toContain(codeSnippet);
          } else {
            // For very short code blocks, check if the entire code appears
            const normalizedCode = block.code.trim().replace(/\s+/g, " ");
            expect(allCodeText).toContain(normalizedCode);
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

        // Render the markdown to HTML first
        const html = marked.parse(markdownWithoutFrontmatter) as string;

        // Count actual rendered code blocks in HTML
        // This includes: <pre><code>, <pre class="mermaid">, <pre class="graphviz">, and typescript:run blocks
        const container = document.createElement("div");
        container.innerHTML = html;

        // Count regular code blocks (<pre><code>)
        // Count mermaid blocks (rendered as <pre class="mermaid">)
        // Count graphviz blocks (rendered as <pre class="graphviz">)
        // Count typescript:run blocks (rendered as <pre><code> inside .ts-code-display)
        const regularCodeBlocksNum = container.querySelectorAll("pre > code").length;
        const mermaidBlocksNum = container.querySelectorAll("pre.mermaid").length;
        const graphvizBlocksNum = container.querySelectorAll("pre.graphviz").length;
        const tsRunBlocksNum = container.querySelectorAll(".ts-code-display pre code").length;

        const totalRenderedBlocksNum = regularCodeBlocksNum + mermaidBlocksNum + graphvizBlocksNum + tsRunBlocksNum;
        const unnestedCodeBlocks = findUnnestedCodeBlocks(markdownWithoutFrontmatter);
        // Rendered blocks should be less than or equal to unnested blocks (some blocks might be skipped)
        // But we should have at least some blocks rendered if there are any
        if (unnestedCodeBlocks.length > 0) {
          expect(totalRenderedBlocksNum).toBeGreaterThan(0);
        }

        // Verify all unnested blocks are rendered
        expect(totalRenderedBlocksNum).toBeGreaterThanOrEqual(unnestedCodeBlocks.length);
      }
    });
  });

  describe("typescript:run code blocks", () => {
    it("should handle HTML-encoded text from markedHighlight", async () => {
      const markedWithTS = await setupMarkedWithTypeScriptExecutableBlock();

      // Test that HTML-encoded text is properly unescaped before storing.
      // Note: unescapeHtml strips HTML tags, so tags in the code will be removed
      const testCases = [
        {
          name: "HTML entities that should be unescaped",
          // Simulate marked encoding: <div> becomes &lt;div&gt;
          // unescapeHtml will unescape entities and strip tags, so <div>test</div> becomes test
          input: "const x = '<div>test</div>';",
          expectedAfterUnescape: "const x = 'test';",
        },
        {
          name: "Mixed HTML entities",
          // unescapeHtml only strips HTML tags, not standalone < > characters
          input: 'const str = "& < > \\"";',
          expectedAfterUnescape: 'const str = "& < > \\"";',
        },
        {
          name: "HTML entities with quotes",
          // unescapeHtml strips tags, so <div class="test">content</div> becomes content
          input: "const html = '<div class=\"test\">content</div>';",
          expectedAfterUnescape: "const html = 'content';",
        },
      ];

      for (const testCase of testCases) {
        // Manually encode the input to simulate what marked might do
        const encodedInput = testCase.input
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#x27;");

        const markdown = typescriptRunCodeBlock(encodedInput);
        const html = markedWithTS.parse(markdown) as string;

        const container = document.createElement("div");
        container.innerHTML = html;

        const scriptTag = container.querySelector('script[type="application/json"][data-ts-code]');
        expect(scriptTag).not.toBeNull();

        const extractedCode = JSON.parse(scriptTag!.textContent || "");
        expect(extractedCode).toBe(wrapJsCodeRun(testCase.expectedAfterUnescape));
      }
    });

    it("should handle multiple typescript:run blocks in the same markdown", async () => {
      const markedWithTS = await setupMarkedWithTypeScriptExecutableBlock();

      const code1 = "const x = 1;";
      const code2 = 'const y = "test";';
      const code3 = "const z = `<code>`;";

      // unescapeHtml strips HTML tags, so <code> becomes empty
      const expectedCode3 = "const z = ``;";

      const markdown = `
${typescriptRunCodeBlock(code1)}

Some text in between.

${typescriptRunCodeBlock(code2)}

More text.

${typescriptRunCodeBlock(code3)}
`;

      const html = markedWithTS.parse(markdown) as string;
      const container = document.createElement("div");
      container.innerHTML = html;

      const scriptTags = container.querySelectorAll('script[type="application/json"][data-ts-code]');
      expect(scriptTags.length).toBe(3);

      const extractedCodes = Array.from(scriptTags).map((tag) => JSON.parse(tag.textContent || ""));
      expect(extractedCodes[0]).toBe(wrapJsCodeRun(code1));
      expect(extractedCodes[1]).toBe(wrapJsCodeRun(code2));
      expect(extractedCodes[2]).toBe(wrapJsCodeRun(expectedCode3));
    });
  });
});

function typescriptRunCodeBlock(code: string): string {
  return `\`\`\`typescript:run\n${code}\n\`\`\``;
}
