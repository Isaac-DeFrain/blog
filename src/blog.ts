/**
 * @module blog
 *
 * The main blog reader module which handles blog post loading, rendering, and navigation.
 *
 * This module provides the core functionality for a single-page application (SPA) blog reader.
 * It manages the lifecycle of blog posts from discovery through rendering, including:
 *
 * - **Blog Discovery**: Loads and parses blog post metadata from markdown files via `manifest.json`
 * - **Content Rendering**: Converts markdown to HTML with syntax highlighting, MathJax, Mermaid, and Graphviz diagram support
 * - **SPA Routing**: Handles client-side navigation for internal blog links without page reloads
 * - **Topic Filtering**: Integrates with [[`TopicsBar`]] for filtering posts by topic
 * - **Sidebar Navigation**: Manages post list display and active post highlighting
 * - **Browser Navigation**: Supports browser back/forward button navigation via History API
 */

import { ThemeManager } from "./theme";
import { TopicsBar, type BlogPost } from "./topics-bar";
import { Sidebar } from "./sidebar";
import {
  div,
  escapeHtml,
  formatDateAsPacificTime,
  parseDateAsPacificTime,
  parseFrontmatter,
  getBasePath,
  unescapeHtml,
} from "./utils";
import type { HLJSApi } from "highlight.js";
import { FOUR_TICK_PLAINTEXT_REGEX } from "../tests/helpers/markdown";

/**
 * Creates highlight.js configuration for marked-highlight.
 * @param hljs - The highlight.js API instance
 * @returns Configuration object for markedHighlight
 */
export function createHighlightConfig(hljs: HLJSApi) {
  return {
    langPrefix: "hljs language-",
    highlight(code: string, lang: string) {
      // Skip highlighting for markdown nested code blocks
      // (e.g. ````markdown blocks containing ```typescript:run blocks)
      if (["markdown", "plaintext", "txt"].includes(lang) && /```\w+/.test(code)) {
        return code;
      }

      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(unescapeHtml(code), { language }).value;
    },
  };
}

/**
 * Creates HTML for a TypeScript executable code block with run button and output area.
 *
 * The text parameter may contain HTML entities (e.g., &lt;, &gt;, &quot;) from markdown parsing.
 * These are unescaped at execution time in the TypeScript runner module.
 *
 * @param text - The code text (may contain HTML entities from markdown parsing)
 * @param blockId - Unique identifier for the code block
 * @param highlightConfig - Highlight.js configuration for syntax highlighting
 * @returns HTML string for the executable TypeScript block
 */
export function createTypeScriptExecutableBlock(
  text: string,
  blockId: string,
  highlightConfig: ReturnType<typeof createHighlightConfig>,
): string {
  return `
    <div class="ts-executable-block" data-block-id="${blockId}">
      <div class="ts-code-display">
        <pre><code class="typescript">${highlightConfig.highlight(text, "typescript")}</code></pre>
      </div>
      <div class="ts-controls">
        <button class="ts-run-button" data-block-id="${blockId}">Run</button>
      </div>
      <div class="ts-output-container" data-block-id="${blockId}" style="display: none;">
        <div class="ts-output-content"></div>
      </div>
      <script type="application/json" data-ts-code="${blockId}">${JSON.stringify(unescapeHtml(text))}</script>
    </div>
  `;
}

/**
 * BlogReader handles blog loading, rendering, and sidebar navigation
 */
export class BlogReader {
  private blogContent: HTMLElement | null;
  private posts: BlogPost[] = [];
  private allPosts: BlogPost[] = [];
  private currentPostId: string | null = null;
  private topicsBar: TopicsBar;
  private sidebar: Sidebar;
  private basePath: string;

  constructor() {
    this.basePath = getBasePath();
    new ThemeManager("theme-toggle");

    // Initialize blog content
    this.blogContent = document.getElementById("blog-content");

    // Initialize topics bar and sidebar with callbacks
    this.topicsBar = new TopicsBar("topics-bar", this.handleTopicFilterChange.bind(this));
    this.sidebar = new Sidebar("blog-list", this.handlePostClick.bind(this));

    // Set up link interception for internal blog post links
    this.setupLinkInterception();
    this.init();

    // Handle browser back/forward navigation
    window.addEventListener("popstate", async (event) => {
      const postId = event.state?.postId || this.getPostIdFromPath();
      if (postId) {
        await this.loadBlogPost(postId);
      } else if (this.posts.length > 0) {
        // If no post ID in state or path, load first post
        await this.loadBlogPost(this.posts[0].id);
      }
    });
  }

  /**
   * Gets the post ID from the current URL pathname.
   *
   * Extracts the post ID from the pathname, accounting for the base path.
   * For example, "/blog/welcome" -> "welcome" (when base path is "/blog/").
   *
   * @returns The post ID if found, or null if on the index page
   */
  private getPostIdFromPath(): string | null {
    // Remove the base path from the beginning
    const pathname = window.location.pathname;
    let path = pathname;

    if (this.basePath !== "/") {
      // Normalize both paths for comparison (remove trailing slashes)
      const normalizedBasePath = this.basePath.replace(/\/$/, "");
      const normalizedPathname = pathname.replace(/\/$/, "");

      if (normalizedPathname.startsWith(normalizedBasePath)) {
        // Remove the base path, keeping one leading slash
        // If pathname is exactly the base path, path will be empty
        path = pathname.slice(normalizedBasePath.length);
        // Ensure path starts with / if it's not empty
        if (path && !path.startsWith("/")) {
          path = "/" + path;
        }
      } else {
        // Pathname doesn't start with base path, likely an error case
        // Return null to indicate we're on the index page
        return null;
      }
    } else {
      // For root base path, use pathname as-is
      path = pathname;
    }

    // Remove leading slash and any trailing slashes
    const postId = path.replace(/^\/|\/$/g, "");
    return postId || null;
  }

  /**
   * Initializes the blog reader by loading the blog list, rendering it to the sidebar,
   * and displaying the appropriate post based on URL pathname or first post by default.
   *
   * This is called automatically during construction and orchestrates the initial
   * loading sequence for the blog application.
   *
   * @returns Promise that resolves when initialization is complete
   */
  private async init(): Promise<void> {
    await this.loadBlogList();
    this.topicsBar.setPosts(this.allPosts);
    this.sidebar.setPosts(this.posts);

    // Check if URL has a post ID in the pathname
    const pathPostId = this.getPostIdFromPath();
    if (pathPostId && this.posts.some((p) => p.id === pathPostId)) {
      await this.loadBlogPost(pathPostId);
    } else {
      // Otherwise load the first post if it exists
      const mostRecentPost = this.posts[0];
      if (mostRecentPost) {
        await this.loadBlogPost(mostRecentPost.id);
      } else {
        this.showError("No posts available");
      }
    }
  }

  /**
   * Loads the blog post list by discovering all markdown files and parsing their frontmatter.
   *
   * Fetches the manifest.json to get a list of all markdown files, then loads each file
   * to extract metadata (name, date, topics) from frontmatter. Sorts posts by date in
   * reverse chronological order (newest first).
   *
   * If loading fails, display an error message to the user and log the error.
   *
   * @returns Promise resolved when the blog list is loaded and sorted
   */
  private async loadBlogList(): Promise<void> {
    try {
      // Fetch manifest to get list of markdown files
      const manifestResponse = await fetch(`${this.basePath}posts/manifest.json`);

      if (!manifestResponse.ok) {
        throw new Error("Failed to load blog manifest");
      }

      // Load and parse each markdown file
      const manifest = (await manifestResponse.json()) as { files: string[] };
      const posts = await Promise.all(
        manifest.files.map(async (filename) => {
          try {
            const markdownResponse = await fetch(`${this.basePath}posts/${filename}`);
            if (!markdownResponse.ok) {
              console.warn(`Failed to load ${filename}`);
              return null;
            }

            const markdown = await markdownResponse.text();
            const frontmatter = parseFrontmatter(markdown);

            // Generate id from filename (remove .md extension)
            const id = filename.replace(/\.md$/, "");

            return {
              id,
              name: frontmatter.name || "Untitled",
              date: frontmatter.date || "1970-01-01",
              file: filename,
              topics: frontmatter.topics || [],
            } as BlogPost;
          } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            return null;
          }
        }),
      );

      // Filter out null entries and sort by date in reverse chronological order
      this.allPosts = posts
        .filter((post): post is BlogPost => post !== null)
        .sort((a, b) => {
          return parseDateAsPacificTime(b.date).getTime() - parseDateAsPacificTime(a.date).getTime();
        });
      this.posts = [...this.allPosts];
    } catch (error) {
      this.showError("Failed to load blog posts. Please try again later.");
      console.error("Error loading blog list:", error);
    }
  }

  /**
   * Handles topic filter changes from the TopicsBar component.
   *
   * Updates the filtered posts list, re-renders the sidebar, and loads a new post
   * if the current post is not in the filtered list.
   *
   * @param filteredPosts - The filtered list of blog posts
   */
  private handleTopicFilterChange(filteredPosts: BlogPost[]): void {
    this.posts = filteredPosts;
    this.sidebar.setPosts(this.posts);

    // Only load a new post if the current post is not in the filtered list
    if (this.posts.length > 0) {
      const currentPostInList = this.currentPostId ? this.posts.some((post) => post.id === this.currentPostId) : false;
      if (!currentPostInList) {
        this.loadBlogPost(this.posts[0].id);
      }
    }
  }

  /**
   * Handles post clicks from the Sidebar component.
   *
   * Loads the selected blog post and updates the URL using pushState.
   * Preserves the current topic filter when loading the post.
   *
   * @param postId - The ID of the post to load
   * @param hash - Optional hash fragment (section) to scroll to after loading
   */
  private async handlePostClick(postId: string, hash?: string): Promise<void> {
    // Preserve the current topic filter
    const currentTopic = this.topicsBar.getSelectedTopic();

    try {
      await this.loadBlogPost(postId, hash);

      // Restore the topic filter if it was set
      // Use skipCallback to avoid triggering handleTopicFilterChange which might load a different post
      if (currentTopic !== null) {
        this.topicsBar.setSelectedTopic(currentTopic, true);
        // Manually filter posts and update sidebar to match the restored filter
        this.posts = this.allPosts
          .filter((post) => post.topics.some((t) => t.toLowerCase() === currentTopic.toLowerCase()))
          .sort((a, b) => {
            return parseDateAsPacificTime(b.date).getTime() - parseDateAsPacificTime(a.date).getTime();
          });

        this.sidebar.setPosts(this.posts);
      }
    } catch (error) {
      console.error("Error loading blog post:", error);
      this.showError("Failed to load blog post. Please try again.");
    }
  }

  /**
   * Checks if the markdown content contains Mermaid diagrams.
   *
   * @param markdown - The markdown content to check
   * @returns True if Mermaid diagrams are present
   */
  private needsMermaid(markdown: string): boolean {
    return /```mermaid/.test(markdown);
  }

  /**
   * Checks if the markdown content contains Graphviz diagrams.
   *
   * @param markdown - The markdown content to check
   * @returns True if Graphviz diagrams are present
   */
  private needsGraphviz(markdown: string): boolean {
    return /```(?:dot|graphviz)/.test(markdown);
  }

  /**
   * Checks if the markdown content contains MathJax expressions.
   *
   * @param markdown - The markdown content to check
   * @returns True if MathJax expressions are present
   */
  private needsMathJax(markdown: string): boolean {
    // Exclude code blocks to avoid false positives (e.g., $ in code)
    const codeBlockRegex = /```[\s\S]*?```/g;
    const markdownWithoutCodeBlocks = markdown.replace(codeBlockRegex, "");

    // Check for display math: $$...$$
    if (/\$\$[\s\S]*?\$\$/.test(markdownWithoutCodeBlocks)) {
      return true;
    }

    // Check for inline math: $...$ (single $, not $$)
    // This regex matches $ followed by content and ending with $, but not $$
    if (/(?<!\$)\$(?!\$)[^$\n]+\$(?!\$)/.test(markdownWithoutCodeBlocks)) {
      return true;
    }

    // Check for LaTeX delimiters: \(...\) or \[...\]
    if (/\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/.test(markdownWithoutCodeBlocks)) {
      return true;
    }

    return false;
  }

  /**
   * Checks if the markdown content contains TypeScript executable blocks.
   * Only counts blocks that are not nested inside 4-tick plaintext blocks.
   *
   * @param markdown - The markdown content to check
   * @returns True if TypeScript executable blocks are present
   */
  private needsTypeScriptRunner(markdown: string): boolean {
    // First, find all 4-tick plaintext blocks to exclude nested code blocks
    const fourTickBlocks: { start: number; end: number }[] = [];
    FOUR_TICK_PLAINTEXT_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null = null;
    while ((match = FOUR_TICK_PLAINTEXT_REGEX.exec(markdown)) !== null) {
      fourTickBlocks.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // Then, find all typescript:run code blocks using a regex that matches the full block
    const typescriptRunBlockRegex = /```typescript:run\s*\n([\s\S]*?)```/g;
    typescriptRunBlockRegex.lastIndex = 0;

    while ((match = typescriptRunBlockRegex.exec(markdown)) !== null) {
      const blockStart = match.index;
      const blockEnd = match.index + match[0].length;

      // Check if this block is nested inside a 4-tick plaintext block
      const isNestedInPlaintext = fourTickBlocks.some(
        (plaintextBlock) => blockStart > plaintextBlock.start && blockEnd < plaintextBlock.end,
      );

      if (!isNestedInPlaintext) {
        return true;
      }
    }

    return false;
  }

  /**
   * Renders blog post content to the DOM.
   *
   * @param html - The parsed HTML content
   * @param date - The post date string
   * @param markdown - The original markdown content (for feature detection)
   * @param hash - Optional hash fragment to scroll to after rendering
   */
  private async renderBlogPostContent(html: string, date: string, markdown: string, hash?: string): Promise<void> {
    if (!this.blogContent) {
      console.error("Blog post content is is null");
      return;
    }

    this.blogContent.innerHTML = `
      ${div("blog-meta", escapeHtml(formatDateAsPacificTime(date)))}
      ${div("blog-content", html)}
    `;

    // Check which modules are needed and conditionally import them
    const contentElement = this.blogContent.querySelector(".blog-content");
    if (!contentElement) {
      return;
    }

    const needsMath = this.needsMathJax(markdown);
    const needsMermaid = this.needsMermaid(markdown);
    const needsGraphviz = this.needsGraphviz(markdown);
    const needsTypeScript = this.needsTypeScriptRunner(markdown);

    // Conditionally import and render modules in parallel
    const renderPromises: Promise<void>[] = [];

    if (needsMath) {
      renderPromises.push(import("./mathjax").then((module) => module.typesetMath(contentElement as HTMLElement)));
    }
    if (needsMermaid) {
      renderPromises.push(
        import("./mermaid").then((module) => module.renderMermaidDiagrams(contentElement as HTMLElement)),
      );
    }
    if (needsGraphviz) {
      renderPromises.push(
        import("./graphviz").then((module) => module.renderGraphvizDiagrams(contentElement as HTMLElement)),
      );
    }
    if (needsTypeScript) {
      renderPromises.push(
        import("./typescript-runner").then((module) =>
          module.initializeTypeScriptRunner(contentElement as HTMLElement),
        ),
      );
    }

    // Wait for all rendering to complete
    await Promise.all(renderPromises);

    // Check if there's a hash fragment to scroll to
    const hashToScroll = hash || window.location.hash;
    if (hashToScroll) {
      // Wait a bit for MathJax to finish rendering
      await new Promise((resolve) => setTimeout(resolve, 100));
      this.scrollToHash(hashToScroll);
    } else {
      // Scroll to top of content if no hash
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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
    const element = document.getElementById(id);
    if (element) {
      // Scroll to the element with smooth behavior
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // If element not found, try to find it by name attribute (for anchors)
      const anchor = document.querySelector(`a[name="${id}"]`);
      if (anchor) {
        anchor.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  /**
   * Sets up click interception for internal links within blog content.
   * Intercepts clicks on internal blog post links and uses SPA routing instead of full page navigation.
   * Handles both links to other posts and section links (hash fragments) within the current post.
   * Uses event delegation on the blog content container for efficiency.
   */
  private setupLinkInterception(): void {
    if (!this.blogContent) return;

    // Use event delegation - attach listener once to the container
    this.blogContent.addEventListener("click", async (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (!link || !link.href) return;

      // Only intercept links within the blog content area
      const contentElement = this.blogContent?.querySelector(".blog-content");
      if (!contentElement || !contentElement.contains(link)) return;

      // Get the URL from the link
      const url = new URL(link.href, window.location.href);
      const linkPathname = url.pathname;
      const linkHash = url.hash;

      // Check if this is an internal link (same origin)
      if (url.origin !== window.location.origin) {
        // External link, allow normal navigation
        return;
      }

      // Handle hash-only links (section links within the current post)
      // Check if the link pathname matches the current pathname (same post)
      const currentPathname = window.location.pathname;
      if (!linkPathname || linkPathname === "/" || linkPathname === this.basePath || linkPathname === currentPathname) {
        if (linkHash) {
          // This is a section link within the current post
          e.preventDefault();
          e.stopPropagation();

          // Update URL with hash without reloading
          window.history.pushState({ postId: this.currentPostId }, "", `${currentPathname}${linkHash}`);
          this.scrollToHash(linkHash);
        }

        return;
      }

      // Extract potential post ID from the pathname
      let potentialPostId: string | null = null;
      if (this.basePath !== "/" && linkPathname.startsWith(this.basePath)) {
        // Remove the base path, keeping one leading slash
        const path = linkPathname.slice(this.basePath.length - 1);
        potentialPostId = path.replace(/^\/|\/$/g, "");
      } else if (this.basePath === "/") {
        // For root base path, use pathname as-is
        potentialPostId = linkPathname.replace(/^\/|\/$/g, "");
      }

      // Remove .md extension if present (links might include it)
      if (potentialPostId) {
        potentialPostId = potentialPostId.replace(/\.md$/, "");
      }

      // Check if this post ID exists in our blog posts
      if (potentialPostId && this.allPosts.some((post) => post.id === potentialPostId)) {
        // Internal blog post link, use SPA routing
        e.preventDefault();
        e.stopPropagation();
        await this.handlePostClick(potentialPostId, linkHash);
      }
    });
  }

  /**
   * Loads and displays a specific blog post by its ID.
   *
   * Fetches the markdown file from the server, converts it to HTML using
   * the marked library, and displays it with metadata.
   * Triggers MathJax rendering for any mathematical expressions, Mermaid rendering for Mermaid diagram code blocks, and Graphviz rendering for DOT/Graphviz diagram code blocks.
   *
   * Updates the sidebar to highlight the active post and smoothly scrolls to the top
   * of the page after loading.
   *
   * @param postId - The unique identifier of the blog post to load
   * @param hash - Optional hash fragment to include in the URL
   * @returns Promise that resolves when the post has been loaded and rendered
   */
  private async loadBlogPost(postId: string, hash?: string): Promise<void> {
    if (!this.blogContent) {
      console.error("blogContent element not found");
      return;
    }

    // Ensure posts are loaded
    if (this.allPosts.length === 0) {
      await this.loadBlogList();

      // Preserve the current topic filter when setting posts
      const currentTopic = this.topicsBar.getSelectedTopic();
      this.topicsBar.setPosts(this.allPosts);

      if (currentTopic !== null) {
        // Restore the topic filter without triggering the callback to avoid unnecessary post loads
        this.topicsBar.setSelectedTopic(currentTopic, true);

        // Manually filter posts and update sidebar
        this.posts = this.allPosts
          .filter((post) => post.topics.some((t) => t.toLowerCase() === currentTopic.toLowerCase()))
          .sort((a, b) => {
            return parseDateAsPacificTime(b.date).getTime() - parseDateAsPacificTime(a.date).getTime();
          });
      } else {
        this.posts = [...this.allPosts];
      }

      this.sidebar.setPosts(this.posts);
    }

    // Try to find post in filtered list first, then in all posts
    let post = this.posts.find((p) => p.id === postId);
    if (!post) {
      post = this.allPosts.find((p) => p.id === postId);
    }

    if (!post) {
      console.error(`Post not found: ${postId}`, {
        postsCount: this.posts.length,
        allPostsCount: this.allPosts.length,
        postIds: this.allPosts.map((p) => p.id),
      });

      this.showError("Blog post not found");
      return;
    }

    this.currentPostId = postId;
    this.sidebar.setActivePost(postId);

    // Update URL immediately after validating post exists, before heavy async operations
    // This provides instant feedback to the user while content loads
    const url = `${this.basePath}${postId}${hash || ""}`;
    window.history.pushState({ postId }, "", url);

    // Update document title
    document.title = `Isaac's Blog | ${post.name}`;
    this.blogContent.innerHTML = div("loading", "Loading post...");

    try {
      const [{ marked }, { markedHighlight }, hljsModule] = await Promise.all([
        import("marked"),
        import("marked-highlight"),
        import("highlight.js"),
      ]);

      // Get hljs from the module (handles both default and named exports)
      const hljs = hljsModule.default || hljsModule;

      // Configure highlight.js to not escape HTML entities (code is safe from markdown)
      // This prevents => from being encoded as =&gt;
      hljs.configure({ ignoreUnescapedHTML: true });

      // Configure marked for syntax highlighting and heading IDs
      const highlightConfig = createHighlightConfig(hljs);
      marked.use(markedHighlight(highlightConfig));

      // Add heading IDs for section links and handle Mermaid code blocks
      marked.use({
        renderer: {
          heading({ text, depth }) {
            // Process inline code in heading text (marked.js doesn't process inline code
            // in headings when using a custom renderer, so we need to do it manually)
            // parseInline is synchronous in marked.js, despite TypeScript types
            const processedText = marked.parseInline(text) as string;

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
          },
          code({ lang, text }) {
            if (lang === "mermaid") {
              return `<pre class="mermaid">${text}</pre>`;
            }

            if (lang === "dot" || lang === "graphviz") {
              return `<pre class="graphviz">${text}</pre>`;
            }

            if (lang === "typescript:run") {
              const blockId = `ts-run-${Math.random().toString(36).substring(2, 11)}`;
              return createTypeScriptExecutableBlock(text, blockId, highlightConfig);
            }

            return false;
          },
        },
      });

      const response = await fetch(`${this.basePath}posts/${post.file}`);
      if (!response.ok) {
        throw new Error("Failed to load blog post");
      }

      // Remove frontmatter before parsing markdown
      const markdown = await response.text();
      const markdownWithoutFrontmatter = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");

      // Check if post contains executable TypeScript blocks and preload dependencies
      const hasTypeScriptBlocks = /```typescript:run/.test(markdownWithoutFrontmatter);
      const preloadPromise = hasTypeScriptBlocks
        ? import("./typescript-runner").then((module) => module.preloadTypeScriptDependencies())
        : Promise.resolve();

      // Parse markdown and preload TypeScript dependencies in parallel
      const [html] = await Promise.all([marked.parse(markdownWithoutFrontmatter), preloadPromise]);

      await this.renderBlogPostContent(html, post.date, markdownWithoutFrontmatter, hash);
    } catch (error) {
      this.showError("Failed to load blog post content. Please try again.");
      console.error("Error loading blog post:", error);
    }
  }

  /**
   * Displays an error message in the blog content area.
   *
   * Renders the error message with appropriate styling and escapes HTML
   * to prevent XSS vulnerabilities.
   *
   * @param message - The error message to display to the user
   */
  private showError(message: string): void {
    if (this.blogContent) {
      this.blogContent.innerHTML = div("error", escapeHtml(message));
    }
  }
}
