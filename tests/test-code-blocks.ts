import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import { Manifest, reportResults, exitIfErrors } from "./common";
import { createHighlightConfig } from "../src/blog";

/**
 * Test that code blocks within blog posts are rendered correctly with syntax highlighting.
 */
function testCodeBlocks(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  const distBlogsDir = join(process.cwd(), "dist", "src", "blogs");
  const manifestPath = join(distBlogsDir, "manifest.json");

  if (!existsSync(distBlogsDir)) {
    errors.push(`Dist directory not found: ${distBlogsDir}. Please run 'npm run build' first.`);
    reportResults({ errors, warnings }, { title: "Code Blocks Test Results" });
    exitIfErrors(errors);
    return;
  }

  if (!existsSync(manifestPath)) {
    errors.push(`Manifest file not found: ${manifestPath}. The build may have failed.`);
    reportResults({ errors, warnings }, { title: "Code Blocks Test Results" });
    exitIfErrors(errors);
    return;
  }

  let manifest: Manifest;
  try {
    const manifestContent = readFileSync(manifestPath, "utf-8");
    manifest = JSON.parse(manifestContent) as Manifest;
  } catch (error) {
    errors.push(`Failed to read or parse manifest.json: ${error instanceof Error ? error.message : String(error)}`);
    reportResults({ errors, warnings }, { title: "Code Blocks Test Results" });
    exitIfErrors(errors);
    return;
  }

  // Configure marked with syntax highlighting (same as blog.ts)
  const marked = new Marked(markedHighlight(createHighlightConfig(hljs)));

  // Regex to find fenced code blocks in markdown
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

  for (const filename of manifest.files) {
    const filePath = join(distBlogsDir, filename);

    if (!existsSync(filePath)) {
      // Skip, other tests handle missing files
      continue;
    }

    try {
      const markdown = readFileSync(filePath, "utf-8");

      // Remove frontmatter
      const markdownWithoutFrontmatter = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");

      // Find all code blocks in the markdown
      const codeBlocks: { lang: string | null; code: string }[] = [];
      let match: RegExpExecArray | null = null;

      while ((match = codeBlockRegex.exec(markdownWithoutFrontmatter)) !== null) {
        codeBlocks.push({
          lang: match[1] || null,
          code: match[2],
        });
      }

      if (codeBlocks.length === 0) {
        // No code blocks in this file
        continue;
      }

      // Render the markdown to HTML
      const html = marked.parse(markdownWithoutFrontmatter) as string;

      // Verify code blocks are rendered with proper highlighting
      for (let i = 0; i < codeBlocks.length; i++) {
        const block = codeBlocks[i];

        if (block.lang) {
          // Check that the language class is present in the rendered HTML
          const expectedClass = `hljs language-${block.lang}`;

          if (!html.includes(expectedClass)) {
            // Check if it fell back to plaintext (unknown language)
            if (hljs.getLanguage(block.lang)) {
              errors.push(
                `${filename}: Code block ${i + 1} with language '${block.lang}' missing expected class '${expectedClass}'`,
              );
            } else {
              // Language not recognized by hljs, should fall back to plaintext
              if (!html.includes("hljs language-plaintext")) {
                warnings.push(
                  `${filename}: Code block ${i + 1} has unrecognized language '${block.lang}', expected plaintext fallback`,
                );
              }
            }
          }
        }

        // Verify the code content is present in rendered HTML (escaped)
        // Check for a snippet of the code (first non-empty line)
        const firstLine = block.code.split("\n").find((line) => line.trim().length > 0);
        if (firstLine) {
          // The snippet might be split across highlight spans, so just check raw text exists
          // Decode HTML entities for comparison since marked escapes characters like apostrophes
          const decodeHtmlEntities = (text: string) =>
            text
              .replace(/&#x27;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">");
          const plainHtml = decodeHtmlEntities(html.replace(/<[^>]*>/g, ""));
          const plainFirstLine = firstLine.trim();

          if (!plainHtml.includes(plainFirstLine)) {
            errors.push(`${filename}: Code block ${i + 1} content not found in rendered HTML`);
          }
        }
      }

      // Verify <pre><code> structure exists
      const preCodeCount = (html.match(/<pre><code/g) || []).length;
      if (preCodeCount < codeBlocks.length) {
        warnings.push(`${filename}: Expected ${codeBlocks.length} <pre><code> blocks, found ${preCodeCount}`);
      }
    } catch (error) {
      errors.push(`Failed to process ${filename}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  reportResults(
    { errors, warnings },
    {
      title: "Code Blocks Test Results",
      successMessage: "✅ All code blocks rendered correctly!",
    },
  );

  exitIfErrors(errors);
}

testCodeBlocks();
