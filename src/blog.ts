/**
 * @module blog
 *
 * The main blog reader module which handles blog post loading, rendering, and navigation.
 *
 * This module provides the core functionality for a single-page application (SPA) blog reader.
 * It manages the lifecycle of blog posts from discovery through rendering, including:
 *
 * - **Blog Discovery**: Loads and parses blog post metadata from markdown files via `manifest.json`
 * - **Content Rendering**: Converts markdown to HTML with syntax highlighting and MathJax support
 * - **Caching**: Implements localStorage-based caching for improved performance
 * - **SPA Routing**: Handles client-side navigation for internal blog links without page reloads
 * - **Topic Filtering**: Integrates with [[`TopicsBar`]] for filtering posts by topic
 * - **Sidebar Navigation**: Manages post list display and active post highlighting
 * - **Browser Navigation**: Supports browser back/forward button navigation via History API
 *
 * The module exports the [[`parseFrontmatter`]] utility function and automatically instantiates
 * a [[`BlogReader`]] instance when loaded in a browser environment.
 *
 * @example
 * ```typescript
 * // The BlogReader is automatically instantiated on module load
 * // To parse frontmatter manually:
 * import { parseFrontmatter } from "./blog";
 * const metadata = parseFrontmatter(markdownContent);
 * ```
 */

import { ThemeManager } from "./theme";
import { TopicsBar, type BlogPost } from "./topics-bar";
import { Sidebar } from "./sidebar";
import { div, parseDateAsPacificTime } from "./utils";

/**
 * Gets the base path for the application.
 * This is injected by the build process for GitHub Pages deployments.
 *
 * @returns The base path (e.g. "/blog/" or "/")
 */
function getBasePath(): string {
  // @ts-expect-error - Injected by build process
  return window.__BASE_PATH__ || "/";
}

/**
 * Parses YAML frontmatter from markdown files.
 *
 * Extracts metadata from a frontmatter block at the beginning of the markdown file.
 * The frontmatter should be in the format:
 * ---
 * name: Post Name
 * date: 2024-01-15
 * topics:
 *   - Topic 1
 *   - Topic 2
 * ---
 *
 * @param markdown - The markdown content with optional frontmatter
 * @returns Object with parsed frontmatter fields (name, date, topics)
 */
export function parseFrontmatter(markdown: string): {
  name?: string;
  date?: string;
  topics?: string[];
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return {};
  }

  const frontmatter = match[1];
  const result: { name?: string; date?: string; topics?: string[] } = {};

  // Parse name
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  if (nameMatch) {
    result.name = nameMatch[1].trim();
  }

  // Parse date
  const dateMatch = frontmatter.match(/^date:\s*(.+)$/m);
  if (dateMatch) {
    result.date = dateMatch[1].trim();
  }

  // Parse topics
  const topicsMatch = frontmatter.match(/^topics:\s*\n((?:\s*-\s*.+\n?)+)/m);
  if (topicsMatch) {
    const topicsList = topicsMatch[1];
    result.topics = topicsList
      .split("\n")
      .map((line) =>
        line
          .replace(/^\s*-\s*/, "")
          .trim()
          .toLowerCase(),
      )
      .filter((topic) => topic.length > 0);
  }

  return result;
}

/**
 * BlogReader handles blog loading, rendering, and sidebar navigation
 */
class BlogReader {
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
    const pathname = window.location.pathname;
    // Remove the base path from the beginning
    let path = pathname;
    if (this.basePath !== "/" && pathname.startsWith(this.basePath)) {
      // Remove the base path, keeping one leading slash
      path = pathname.slice(this.basePath.length - 1);
    } else if (this.basePath === "/") {
      // For root base path, use pathname as-is
      path = pathname;
    } else {
      // Pathname doesn't start with base path, likely an error case
      // Return null to indicate we're on the index page
      return null;
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
    } else if (this.posts.length > 0) {
      // Load first post by default
      await this.loadBlogPost(this.posts[0].id);
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
      const manifestResponse = await fetch(`${this.basePath}src/blogs/manifest.json`);
      if (!manifestResponse.ok) {
        throw new Error("Failed to load blog manifest");
      }

      const manifest = (await manifestResponse.json()) as { files: string[] };

      // Load and parse each markdown file
      const posts = await Promise.all(
        manifest.files.map(async (filename) => {
          try {
            const markdownResponse = await fetch(`${this.basePath}src/blogs/${filename}`);
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
      // Cache posts that users explicitly click on
      await this.loadBlogPost(postId, true);

      // Update URL without page reload, preserving hash if provided
      const url = `${this.basePath}${postId}${hash || ""}`;
      window.history.pushState({ postId }, "", url);

      // Restore the topic filter if it was set
      if (currentTopic !== null) {
        this.topicsBar.setSelectedTopic(currentTopic);
      }
    } catch (error) {
      console.error("Error loading blog post:", error);
      this.showError("Failed to load blog post. Please try again.");
    }
  }

  /**
   * Gets the cache key for a blog post.
   *
   * @param postId - The unique identifier of the blog post
   * @returns The cache key string
   */
  private getCacheKey(postId: string): string {
    return `blog-post-${postId}`;
  }

  /**
   * Retrieves cached blog post content from localStorage.
   *
   * @param postId - The unique identifier of the blog post
   * @returns Cached content object with HTML and date, or null if not cached
   */
  private getCachedPost(postId: string): { html: string; date: string } | null {
    try {
      const cacheKey = this.getCacheKey(postId);
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn("Error reading from cache:", error);
    }

    return null;
  }

  /**
   * Stores blog post content in localStorage cache.
   *
   * @param postId - The unique identifier of the blog post
   * @param html - The parsed HTML content
   * @param date - The post date string
   */
  private setCachedPost(postId: string, html: string, date: string): void {
    try {
      const cacheKey = this.getCacheKey(postId);
      const cacheData = { html, date };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Error writing to cache:", error);

      // If storage is full, try to clear old entries
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        this.clearOldCacheEntries();
      }
    }
  }

  /**
   * Clears old cache entries when storage quota is exceeded.
   * Removes entries that haven't been accessed recently.
   */
  private clearOldCacheEntries(): void {
    try {
      const keys = Object.keys(localStorage);
      const blogPostKeys = keys.filter((key) => key.startsWith("blog-post-"));

      // Remove half of the oldest entries
      const keysToRemove = blogPostKeys.slice(0, Math.floor(blogPostKeys.length / 2));
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn("Error clearing old cache entries:", error);
    }
  }

  /**
   * Renders blog post content to the DOM.
   *
   * @param html - The parsed HTML content
   * @param date - The post date string
   */
  private async renderBlogPostContent(html: string, date: string): Promise<void> {
    if (!this.blogContent) {
      console.error("Blog post content is is null");
      return;
    }

    this.blogContent.innerHTML = `
      ${div("blog-meta", this.escapeHtml(this.formatDate(date)))}
      ${div("blog-content", html)}
    `;

    // Dynamically import and render MathJax for the new content
    const contentElement = this.blogContent.querySelector(".blog-content");
    if (contentElement) {
      const { typesetMath } = await import("./mathjax");
      await typesetMath(contentElement as HTMLElement);
    }

    // Check if there's a hash fragment in the URL and scroll to it
    const hash = window.location.hash;
    if (hash) {
      // Wait a bit for MathJax to finish rendering
      await new Promise((resolve) => setTimeout(resolve, 100));
      this.scrollToHash(hash);
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
   * First checks localStorage cache for the post. If cached, uses cached.
   * Otherwise, fetches the markdown file from the server, converts it to HTML using
   * the marked library, and displays it with metadata.
   * Only caches the result if shouldCache is true (i.e. when user clicks on a post).
   * Triggers MathJax rendering for any mathematical expressions.
   *
   * Updates the sidebar to highlight the active post and smoothly scrolls to the top
   * of the page after loading.
   *
   * @param postId - The unique identifier of the blog post to load
   * @param shouldCache - Whether to cache the post after loading (default: false)
   * @returns Promise that resolves when the post has been loaded and rendered
   */
  private async loadBlogPost(postId: string, shouldCache: boolean = false): Promise<void> {
    if (!this.blogContent) {
      console.error("blogContent element not found");
      return;
    }

    // Ensure posts are loaded
    if (this.allPosts.length === 0) {
      console.log("Posts not loaded, loading blog list...");
      await this.loadBlogList();

      // Preserve the current topic filter when setting posts
      const currentTopic = this.topicsBar.getSelectedTopic();
      this.topicsBar.setPosts(this.allPosts);

      if (currentTopic !== null) {
        this.topicsBar.setSelectedTopic(currentTopic);
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

    // Update document title
    document.title = `Isaac's Blog | ${post.name}`;

    // Check cache first
    const cached = this.getCachedPost(postId);
    if (cached) {
      console.debug("Using cached content for post:", postId);
      await this.renderBlogPostContent(cached.html, cached.date);
      return;
    }

    console.debug("Fetching post content for:", postId);

    // If not cached, fetch and parse
    this.blogContent.innerHTML = div("loading", "Loading post...");

    try {
      const [{ marked }, { markedHighlight }, hljsModule] = await Promise.all([
        import("marked"),
        import("marked-highlight"),
        import("highlight.js"),
      ]);

      // Get hljs from the module (handles both default and named exports)
      const hljs = hljsModule.default || hljsModule;

      // Configure marked for syntax highlighting and heading IDs
      marked.use(
        markedHighlight({
          langPrefix: "hljs language-",
          highlight(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : "plaintext";
            return hljs.highlight(code, { language }).value;
          },
        }),
      );

      // Add heading IDs for section links
      marked.use({
        renderer: {
          heading({ text, depth }) {
            // Strip HTML tags from text to get plain text for ID generation
            const plainText = text.replace(/<[^>]*>/g, "");

            // Generate ID from heading text (similar to GitHub)
            const id = plainText
              .toLowerCase()
              .replace(/[^\w\s-]/g, "") // Remove special characters
              .replace(/\s+/g, "-") // Replace spaces with hyphens
              .replace(/-+/g, "-") // Replace multiple hyphens with a single hyphen
              .trim();

            const tag = `h${depth}`;
            return `<${tag} id="${id}">${text}</${tag}>\n`;
          },
        },
      });

      const response = await fetch(`${this.basePath}src/blogs/${post.file}`);
      if (!response.ok) {
        throw new Error("Failed to load blog post");
      }

      const markdown = await response.text();
      // Remove frontmatter before parsing markdown
      const markdownWithoutFrontmatter = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");
      const html = await marked.parse(markdownWithoutFrontmatter);

      // Cache the parsed HTML only if shouldCache is true
      if (shouldCache) {
        this.setCachedPost(postId, html, post.date);
      }

      // Render the content
      await this.renderBlogPostContent(html, post.date);
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
      this.blogContent.innerHTML = div("error", this.escapeHtml(message));
    }
  }

  /**
   * Formats a date string into a human-readable format.
   *
   * Converts ISO date strings (e.g. "2024-01-15") into a localized format
   * like "January 15, 2024" using US English locale. The date is interpreted
   * as Pacific Time.
   *
   * @param dateString - ISO format date string (YYYY-MM-DD)
   * @returns Formatted date string in "Month Day, Year" format
   */
  private formatDate(dateString: string): string {
    const date = parseDateAsPacificTime(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Los_Angeles",
    });
  }

  /**
   * Escapes HTML special characters in text to prevent XSS attacks.
   *
   * Uses the browser's built-in DOM API to safely escape characters like
   * <, >, &, ", and ' by setting textContent and reading back innerHTML.
   *
   * @param text - The raw text string that may contain HTML characters
   * @returns HTML-escaped string safe for insertion into the DOM
   */
  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Only instantiate BlogReader in browser environment
if (typeof window !== "undefined") {
  new BlogReader();
}
