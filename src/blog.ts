import { ThemeManager } from "./theme";
import { TopicsBar, type BlogPost } from "./topics-bar";
import { Sidebar } from "./sidebar";

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

  constructor() {
    new ThemeManager("theme-toggle");

    // Initialize blog content
    this.blogContent = document.getElementById("blog-content");

    // Initialize topics bar and sidebar with callbacks
    this.topicsBar = new TopicsBar(
      "topics-bar",
      this.handleTopicFilterChange.bind(this),
    );
    this.sidebar = new Sidebar(
      "blog-list",
      this.handlePostClick.bind(this),
    );

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
   * Extracts the post ID from the pathname (e.g., "/welcome" -> "welcome").
   *
   * @returns The post ID if found, or null if on the index page
   */
  private getPostIdFromPath(): string | null {
    const pathname = window.location.pathname;
    // Remove leading slash and any trailing slashes
    const postId = pathname.replace(/^\/|\/$/g, "");
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
   * Loads the blog post list from the server's index.json.
   *
   * Fetches the blog posts from `/src/blogs/index.json`, loads topics from each
   * markdown file's frontmatter, and sorts them by date in reverse chronological
   * order (newest first).
   *
   * If loading fails, display an error message to the user and log the error.
   *
   * @returns Promise resolved when the blog list is loaded and sorted
   */
  private async loadBlogList(): Promise<void> {
    try {
      const response = await fetch("/src/blogs/index.json");
      if (!response.ok) {
        throw new Error("Failed to load blog list");
      }
      const data = (await response.json()) as { posts: BlogPost[] };

      // Load topics from each markdown file
      const postsWithTopics = await Promise.all(
        data.posts.map(async (post) => {
          try {
            const markdownResponse = await fetch(`/src/blogs/${post.file}`);
            if (!markdownResponse.ok) {
              return { ...post, topics: [] };
            }

            const markdown = await markdownResponse.text();
            const topics = this.parseTopicsFromFrontmatter(markdown);
            return { ...post, topics };
          } catch (error) {
            console.error(`Error loading topics for ${post.file}:`, error);
            return { ...post, topics: [] };
          }
        }),
      );

      // Sort by date in reverse chronological order
      this.allPosts = postsWithTopics.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      this.posts = [...this.allPosts];
    } catch (error) {
      this.showError("Failed to load blog posts. Please try again later.");
      console.error("Error loading blog list:", error);
    }
  }

  /**
   * Parses topics from YAML frontmatter in markdown files.
   *
   * Extracts topics from a frontmatter block at the beginning of the markdown file.
   * The frontmatter should be in the format:
   * ---
   * topics:
   *   - Topic 1
   *   - Topic 2
   * ---
   *
   * @param markdown - The markdown content with optional frontmatter
   * @returns Array of topic strings, or empty array if no topics found
   */
  private parseTopicsFromFrontmatter(markdown: string): string[] {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = markdown.match(frontmatterRegex);

    if (!match) {
      return [];
    }

    const frontmatter = match[1];
    const topicsMatch = frontmatter.match(/^topics:\s*\n((?:\s*-\s*.+\n?)+)/m);

    if (!topicsMatch) {
      return [];
    }

    const topicsList = topicsMatch[1];
    const topics = topicsList
      .split("\n")
      .map((line) =>
        line
          .replace(/^\s*-\s*/, "")
          .trim()
          .toLowerCase(),
      )
      .filter((topic) => topic.length > 0);

    return topics;
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
      const currentPostInList = this.currentPostId
        ? this.posts.some((post) => post.id === this.currentPostId)
        : false;
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
   */
  private async handlePostClick(postId: string): Promise<void> {
    // Preserve the current topic filter
    const currentTopic = this.topicsBar.getSelectedTopic();
    
    try {
      await this.loadBlogPost(postId);
      
      // Update URL without page reload
      window.history.pushState({ postId }, "", `/${postId}`);
      
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
      if (
        error instanceof DOMException &&
        error.name === "QuotaExceededError"
      ) {
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

      // Remove half of the oldest entries (simple strategy)
      const keysToRemove = blogPostKeys.slice(
        0,
        Math.floor(blogPostKeys.length / 2),
      );
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
  private async renderBlogPostContent(
    html: string,
    date: string,
  ): Promise<void> {
    if (!this.blogContent) {
      console.error("Blog post content is is null");
      return;
    }

    this.blogContent.innerHTML = `
      <div class="blog-meta">
        ${this.escapeHtml(this.formatDate(date))}
      </div>
      <div class="blog-content">
        ${html}
      </div>
    `;

    // Dynamically import and render MathJax for the new content
    const contentElement = this.blogContent.querySelector(".blog-content");
    if (contentElement) {
      const { typesetMath } = await import("./mathjax");
      await typesetMath(contentElement as HTMLElement);
    }

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * Loads and displays a specific blog post by its ID.
   *
   * First checks localStorage cache for the post. If cached, uses cached.
   * Otherwise, fetches the markdown file from the server, converts it to HTML using
   * the marked library, caches the result, and displays it with metadata.
   * Triggers MathJax rendering for any mathematical expressions.
   *
   * Updates the sidebar to highlight the active post and smoothly scrolls to the top
   * of the page after loading.
   *
   * @param postId - The unique identifier of the blog post to load
   * @returns Promise that resolves when the post has been loaded and rendered
   */
  private async loadBlogPost(postId: string): Promise<void> {
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
    document.title = `Isaac's Blog | ${post.title}`;

    // Check cache first
    const cached = this.getCachedPost(postId);
    if (cached) {
      console.debug("Using cached content for post:", postId);
      await this.renderBlogPostContent(cached.html, cached.date);
      return;
    }

    console.debug("Fetching post content for:", postId);

    // If not cached, fetch and parse
    this.blogContent.innerHTML = '<div class="loading">Loading post...</div>';

    try {
      const [{ marked }, { markedHighlight }, hljsModule] = await Promise.all([
        import("marked"),
        import("marked-highlight"),
        import("highlight.js"),
      ]);

      // Get hljs from the module (handles both default and named exports)
      const hljs = hljsModule.default || hljsModule;

      // Configure marked for syntax highlighting
      marked.use(
        markedHighlight({
          langPrefix: "hljs language-",
          highlight(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : "plaintext";
            return hljs.highlight(code, { language }).value;
          },
        }),
      );

      const response = await fetch(`/src/blogs/${post.file}`);
      if (!response.ok) {
        throw new Error("Failed to load blog post");
      }

      const markdown = await response.text();
      // Remove frontmatter before parsing markdown
      const markdownWithoutFrontmatter = markdown.replace(
        /^---\s*\n[\s\S]*?\n---\s*\n/,
        "",
      );
      const html = await marked.parse(markdownWithoutFrontmatter);

      // Cache the parsed HTML
      this.setCachedPost(postId, html, post.date);

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
      this.blogContent.innerHTML = `<div class="error">${this.escapeHtml(message)}</div>`;
    }
  }

  /**
   * Formats a date string into a human-readable format.
   *
   * Converts ISO date strings (e.g., "2024-01-15") into a localized format
   * like "January 15, 2024" using US English locale.
   *
   * @param dateString - ISO format date string (YYYY-MM-DD)
   * @returns Formatted date string in "Month Day, Year" format
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
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

// Initialize the blog reader
new BlogReader();
