/**
 * @module blog/post-renderer
 *
 * Handles rendering blog post content, including markdown processing,
 * HTML generation, and feature-specific rendering (MathJax, Mermaid, etc.).
 */

import type { HighlightConfig } from "./types";
import { ContentFeatureDetector } from "../render/content-features";
import { RenderingError } from "../utils/errors";
import { createDivElement, escapeHtml, unescapeHtml } from "../utils/html";
import { formatPostDate } from "../utils/dates";
import { resolveWithTimeout } from "../utils/async";
import { getBasePath } from "../utils/paths";
import { CSS_CLASSES, TIMEOUTS, REGEX_PATTERNS, BUTTON_LABELS } from "./constants";
import { initializeTypeScriptRunner } from "../code-executor/block-executor";
import { TypeScriptTransformer } from "../code-executor/typescript-transformer";
import type { marked } from "marked";

/**
 * Renders blog post content to the DOM.
 */
export class PostRenderer {
  /**
   * Renders blog post content to the DOM.
   *
   * @param blogContent - The container element for blog content
   * @param html - The parsed HTML content
   * @param markdown - The original markdown content (for feature detection)
   * @param hash - Optional hash fragment to scroll to after rendering
   * @param date - Optional post date string; when omitted, no metadata header is shown
   * @returns Promise that resolves when rendering is complete
   */
  async renderBlogPostContent(
    blogContent: HTMLElement,
    html: string,
    markdown: string,
    hash?: string,
    date?: string,
  ): Promise<void> {
    if (!blogContent) {
      throw new RenderingError("Blog post content element is null");
    }

    const metaHtml = date ? createDivElement(CSS_CLASSES.BLOG_META, escapeHtml(formatPostDate(date))) : "";

    blogContent.innerHTML = `
      ${metaHtml}
      ${createDivElement(CSS_CLASSES.BLOG_CONTENT, html)}
    `;

    // Check which modules are needed and conditionally import them
    const contentElement = blogContent.querySelector(`.${CSS_CLASSES.BLOG_CONTENT}`);
    if (!contentElement) {
      throw new RenderingError("Blog content element not found after rendering");
    }
    await this.renderContentFeatures(contentElement as HTMLElement, markdown);

    // Check if there's a hash fragment to scroll to
    // Scroll to top of content if no hash
    const hashToScroll = hash || window.location.hash;
    if (hashToScroll) {
      // Wait a bit to finish rendering content features
      await new Promise(resolveWithTimeout(TIMEOUTS.SCROLL_DELAY));
      this.scrollToHash(hashToScroll);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  /**
   * Renders content features (MathJax, Mermaid, Graphviz, TypeScript) based on markdown content.
   *
   * @param contentElement - The content element to render features in
   * @param markdown - The markdown content to analyze
   * @returns Promise that resolves when all features are rendered
   */
  private async renderContentFeatures(contentElement: HTMLElement, markdown: string): Promise<void> {
    const features = ContentFeatureDetector.detectFeatures(markdown);
    const renderPromises: Promise<void>[] = [];

    if (features.needsMath) {
      renderPromises.push(import("../render/mathjax").then((module) => module.typesetMath(contentElement)));
    }
    if (features.needsMermaid) {
      renderPromises.push(import("../render/mermaid").then((module) => module.renderMermaidDiagrams(contentElement)));
    }
    if (features.needsGraphviz) {
      renderPromises.push(import("../render/graphviz").then((module) => module.renderGraphvizDiagrams(contentElement)));
    }
    if (features.needsTypeScript) {
      renderPromises.push(Promise.resolve(initializeTypeScriptRunner(contentElement)));
    }

    await Promise.all(renderPromises);
  }

  /**
   * Scrolls to an element with the given hash fragment.
   *
   * @param hash - The hash fragment (e.g. `#this-blogs-tech-choices`)
   */
  private scrollToHash(hash: string): void {
    if (!hash) return;

    // Remove the leading # from the hash
    const id = hash.slice(1);
    if (!id) return;

    // Find the element by ID
    // If element not found, try to find it by name attribute (for anchors)
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      const anchor = document.querySelector(`a[name="${id}"]`);
      if (anchor) {
        anchor.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  /**
   * Processes markdown content and converts it to HTML.
   *
   * @param markdown - The markdown content to process
   * @param highlightConfig - Highlight.js configuration
   * @returns Promise that resolves with the HTML string
   */
  async processMarkdown(markdown: string, highlightConfig: HighlightConfig): Promise<string> {
    let renderer = this;
    try {
      // Configure marked for syntax highlighting and heading IDs
      // Add heading IDs for section links and handle special code blocks
      const [{ marked }, { markedHighlight }] = await Promise.all([import("marked"), import("marked-highlight")]);
      marked.use(markedHighlight(highlightConfig));
      marked.use({
        renderer: {
          heading({ text, depth }) {
            return processHeading(marked, text, depth);
          },
          code({ lang, text }) {
            return processCodeBlock(lang, text, highlightConfig, renderer);
          },
          link({ href, title, text }) {
            const resolvedHref = rewritePostsLinkToRoot(href, getBasePath());
            const finalHref = resolvedHref ?? href;
            const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
            return `<a href="${escapeHtml(finalHref)}"${titleAttr}>${text}</a>`;
          },
        },
      });

      // Remove frontmatter before parsing markdown
      const markdownWithoutFrontmatter = markdown.replace(REGEX_PATTERNS.FRONTMATTER, "");
      const html = await marked.parse(markdownWithoutFrontmatter);
      return html;
    } catch (error) {
      throw new RenderingError("Failed to process markdown", { originalError: error });
    }
  }

  /**
   * Creates HTML for a TypeScript executable code block with run button and output area.
   *
   * @param typescriptCode - The TypeScript code text (may contain HTML entities from markdown parsing)
   * @param blockId - Unique identifier for the code block
   * @param highlightConfig - Highlight.js configuration for syntax highlighting
   * @returns HTML string for the executable TypeScript block
   */
  createTypeScriptExecutableBlock(typescriptCode: string, blockId: string, highlightConfig: HighlightConfig): string {
    const processedCode = TypeScriptTransformer.wrapTypeScriptCode(unescapeHtml(typescriptCode));
    return `
    <div class="${CSS_CLASSES.TS_EXECUTABLE_BLOCK}" data-block-id="${blockId}">
      <div class="${CSS_CLASSES.TS_CODE_DISPLAY}">
        <pre><code class="${CSS_CLASSES.TYPESCRIPT}">${highlightConfig.highlight(typescriptCode, "typescript")}</code></pre>
      </div>
      <div class="${CSS_CLASSES.TS_CONTROLS}">
        <button class="${CSS_CLASSES.TS_RUN_BUTTON}" data-block-id="${blockId}">${BUTTON_LABELS.RUN}</button>
      </div>
      <div class="${CSS_CLASSES.TS_OUTPUT_CONTAINER}" data-block-id="${blockId}" style="display: none;">
        <div class="${CSS_CLASSES.TS_OUTPUT_CONTENT}"></div>
      </div>
      <script type="application/json" data-ts-code="${blockId}">${JSON.stringify(processedCode)}</script>
    </div>
  `;
  }
}

/**
 * Rewrites internal blog post links that reference the posts directory to root-relative URLs.
 * Handles @posts/, posts/, and /posts/ prefixes so links work with SPA routing.
 *
 * @param href - Raw link href from markdown
 * @param basePath - Application base path (e.g. "/blog/" or "/")
 * @returns Rewritten href, or null if not a posts link
 */
function rewritePostsLinkToRoot(href: string, basePath: string): string | null {
  if (!href || href.startsWith("http://") || href.startsWith("https://") || href.startsWith("#")) {
    return null;
  }

  const [pathPart, hashPart] = href.split("#", 2);
  if (!/^(?:@?posts\/|\/posts\/)/.test(pathPart)) return null;

  const afterPrefix = pathPart
    .replace(/^(?:@?posts\/|\/posts\/)/, "")
    .replace(REGEX_PATTERNS.MARKDOWN_EXTENSION, "")
    .replace(REGEX_PATTERNS.LEADING_TRAILING_SLASHES, "");
  const postId = afterPrefix.trim();
  if (!postId) return null;

  const base = basePath.replace(/\/$/, "") || "";
  const newHref = base ? `${base}/${postId}` : `/${postId}`;
  return hashPart !== undefined ? `${newHref}#${hashPart}` : newHref;
}

function processHeading(md: typeof marked, text: string, depth: number): string {
  // Process inline code in heading text (marked.js doesn't process inline code
  // in headings when using a custom renderer, so we need to do it manually)
  // parseInline is synchronous in marked.js, despite TypeScript types
  const processedText = md.parseInline(text) as string;

  // Strip HTML tags from processed text to get plain text for ID generation
  const plainText = processedText.replace(/<[^>]*>/g, "");

  // Generate ID from heading text (similar to GitHub)
  const id = plainText
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with a single hyphen
    .trim();

  const tag = `h${depth}`;
  return `<${tag} id="${id}">${processedText}</${tag}>\n`;
}

function processCodeBlock(
  lang: string | undefined,
  text: string,
  highlightConfig: HighlightConfig,
  renderer: PostRenderer,
): string | false {
  if (lang === "mermaid") {
    return `<pre class="${CSS_CLASSES.MERMAID}">${text}</pre>`;
  }

  if (lang === "dot" || lang === "graphviz") {
    return `<pre class="${CSS_CLASSES.GRAPHVIZ}">${text}</pre>`;
  }

  if (lang === "typescript:run") {
    const blockId = `ts-run-${Math.random().toString(36).substring(2, 11)}`;
    return renderer.createTypeScriptExecutableBlock(text, blockId, highlightConfig);
  }

  return false;
}
