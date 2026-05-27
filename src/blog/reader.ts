/**
 * @module blog/reader
 *
 * The main blog reader orchestrator which coordinates blog post loading, rendering, and navigation.
 *
 * This class acts as a thin orchestrator that delegates to specialized classes:
 * - PostLoader: Loading posts from the server
 * - PostRenderer: Rendering markdown to HTML
 * - LinkInterceptor: Handling SPA routing
 */

import { ThemeManager } from "../utils/theme";
import { TopicsBar } from "../components/topics-bar";
import { Sidebar } from "../components/sidebar";
import type { BlogPost } from "./types";
import { PostLoader } from "./post-loader";
import { PostRenderer } from "./post-renderer";
import { LinkInterceptor } from "./link-interceptor";
import { PathResolver } from "../utils/path-resolver";
import { filterAndSortPosts } from "../utils/posts";
import { PostNotFoundError, PostLoadError, RenderingError, logError } from "../utils/errors";
import { createDivElement, escapeHtml, unescapeHtml } from "../utils/html";
import { getBasePath } from "../utils/paths";
import { getElementByIdSafe } from "../utils/dom";
import { ELEMENT_IDS, CSS_CLASSES, ERROR_MESSAGES, LOADING_MESSAGES } from "./constants";
import type { HLJSApi } from "highlight.js";
import { CODE_LANGUAGES, REGEX_PATTERNS } from "./constants";
import { collectTerminologyPostIds } from "../utils/terminology";
import { clearTerminologyDefinitionCache } from "../render/terminology-preview";
import type { TerminologyPreviewContext } from "../render/terminology-preview";
import type { HighlightConfig } from "./types";

/**
 * Creates highlight.js configuration for marked-highlight.
 * @param hljs - The highlight.js API instance
 * @returns Configuration object for markedHighlight
 */
export function createHighlightConfig(hljs: HLJSApi) {
  return {
    langPrefix: "hljs language-",
    highlight(code: string, lang: string) {
      // Skip highlighting for nested code blocks
      // (e.g. ````txt block containing ```typescript:run block)
      if (
        [CODE_LANGUAGES.MARKDOWN, CODE_LANGUAGES.PLAINTEXT, CODE_LANGUAGES.TXT].some((l) => (l as string) === lang) &&
        REGEX_PATTERNS.NESTED_CODE_BLOCKS.test(code)
      ) {
        return code;
      }

      const language = hljs.getLanguage(lang) ? lang : CODE_LANGUAGES.PLAINTEXT;
      return hljs.highlight(unescapeHtml(code), { language }).value;
    },
  };
}

/**
 * BlogReader orchestrates blog loading, rendering, and sidebar navigation.
 */
export class BlogReader {
  private blogContent: HTMLElement | null;
  private posts: BlogPost[] = [];
  private allPosts: BlogPost[] = [];
  private currentPostId: string | null = null;
  private topicsBar: TopicsBar;
  private sidebar: Sidebar;
  private basePath: string;
  private postLoader: PostLoader;
  private postRenderer: PostRenderer;
  private linkInterceptor: LinkInterceptor;
  private terminologyPostIds: Set<string> = new Set();
  private highlightConfigPromise: Promise<HighlightConfig> | null = null;

  constructor() {
    this.basePath = getBasePath();
    new ThemeManager(ELEMENT_IDS.THEME_TOGGLE);

    // Initialize blog content
    this.blogContent = getElementByIdSafe(ELEMENT_IDS.BLOG_CONTENT);

    // Initialize topics bar and sidebar with callbacks
    this.topicsBar = new TopicsBar(ELEMENT_IDS.TOPICS_BAR, this.handleTopicFilterChange.bind(this));
    this.sidebar = new Sidebar(ELEMENT_IDS.BLOG_LIST, this.handlePostClick.bind(this));

    // Initialize specialized classes
    this.postLoader = new PostLoader();
    this.postRenderer = new PostRenderer();
    this.linkInterceptor = new LinkInterceptor();

    this.setupHomeLink();
    this.setupSocialLinks();

    // Set up link interception for internal blog post links
    if (this.blogContent) {
      this.linkInterceptor.setup(
        this.blogContent,
        this.basePath,
        this.allPosts,
        this.currentPostId,
        this.handlePostClick.bind(this),
        this.loadHomePage.bind(this),
      );
    }

    this.init();

    // Handle browser back/forward navigation
    window.addEventListener("popstate", async (event) => {
      try {
        // Get post ID from state or path
        // If no post ID in state or path, load first post
        const postId = event.state?.postId ?? PathResolver.getPostIdFromPath(this.basePath);

        if (postId) {
          await this.loadBlogPost(postId);
        } else {
          await this.loadHomePage();
        }
      } catch (error) {
        logError(error, "Error handling popstate event:");

        if (error instanceof PostNotFoundError) {
          this.showError(ERROR_MESSAGES.POST_NOT_FOUND);
        } else {
          this.showError(ERROR_MESSAGES.FAILED_LOAD_POST);
        }
      }
    });
  }

  /**
   * Sets social icon image sources using the deployment base path.
   */
  private setupSocialLinks(): void {
    document.querySelectorAll<HTMLImageElement>("[data-social-icon]").forEach((icon) => {
      const filename = icon.dataset.socialIcon;
      if (filename) {
        icon.src = `${this.basePath}assets/icons/${filename}`;
      }
    });
  }

  /**
   * Wires the header title link to navigate to the home page via SPA routing.
   */
  private setupHomeLink(): void {
    const homeLink = document.getElementById(ELEMENT_IDS.HOME_LINK);
    if (!homeLink) return;

    homeLink.setAttribute("href", this.basePath);
    homeLink.addEventListener("click", async (e) => {
      e.preventDefault();

      try {
        await this.loadHomePage();
      } catch (error) {
        logError(error, "Error loading home page from header link:");
        this.showError(ERROR_MESSAGES.FAILED_LOAD_POST);
      }
    });
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
    try {
      await this.loadBlogList();
      this.topicsBar.setPosts(this.allPosts);
      this.sidebar.setPosts(this.posts);

      // Check if URL has a post ID in the pathname
      // Otherwise load the first post if it exists
      const pathPostId = PathResolver.getPostIdFromPath(this.basePath);

      if (pathPostId && this.posts.some((p) => p.id === pathPostId)) {
        await this.loadBlogPost(pathPostId);
      } else if (pathPostId) {
        this.showError(ERROR_MESSAGES.POST_NOT_FOUND);
      } else {
        await this.loadHomePage();
      }
    } catch (error) {
      logError(error, "Error initializing blog:");
      this.showError(ERROR_MESSAGES.FAILED_LOAD_POSTS);
    }
  }

  /**
   * Loads the blog post list by discovering all markdown files and parsing their frontmatter.
   *
   * @returns Promise resolved when the blog list is loaded and sorted
   */
  private async loadBlogList(): Promise<void> {
    try {
      this.allPosts = await this.postLoader.loadBlogList(this.basePath);
      this.posts = [...this.allPosts];
      this.terminologyPostIds = collectTerminologyPostIds(this.allPosts);
      clearTerminologyDefinitionCache();
    } catch (error) {
      logError(error, "Error loading blog list:");
      this.showError(ERROR_MESSAGES.FAILED_LOAD_POSTS);
      throw error;
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
        this.loadBlogPost(this.posts[0].id).catch((error) => {
          logError(error, "Error loading post after topic filter change:");
          if (error instanceof PostNotFoundError) {
            this.showError(ERROR_MESSAGES.POST_NOT_FOUND);
          } else {
            this.showError(ERROR_MESSAGES.FAILED_LOAD_POST);
          }
        });
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
        this.posts = filterAndSortPosts(this.allPosts, currentTopic);
        this.sidebar.setPosts(this.posts);
      }
    } catch (error) {
      logError(error, "Error loading blog post:");
      if (error instanceof PostNotFoundError) {
        this.showError(ERROR_MESSAGES.POST_NOT_FOUND);
      } else {
        this.showError(ERROR_MESSAGES.FAILED_LOAD_POST);
      }
    }
  }

  /**
   * Loads and displays a specific blog post by its ID.
   *
   * Fetches the markdown file from the server, converts it to HTML using
   * the marked library, and displays it with metadata.
   * Triggers:
   * - MathJax rendering for any mathematical expressions
   * - Mermaid rendering for Mermaid diagram code blocks
   * - Graphviz rendering for DOT/Graphviz diagram code blocks
   * - TypeScript rendering for TypeScript code blocks
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
      throw new RenderingError(ERROR_MESSAGES.BLOG_CONTENT_NOT_FOUND);
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
        this.posts = filterAndSortPosts(this.allPosts, currentTopic);
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
      throw new PostNotFoundError(postId, {
        postsCount: this.posts.length,
        allPostsCount: this.allPosts.length,
        postIds: this.allPosts.map((p) => p.id),
      });
    }

    this.currentPostId = postId;
    this.sidebar.setActivePost(postId);

    // Update link interceptor with current post ID
    if (this.blogContent) {
      this.linkInterceptor.setup(
        this.blogContent,
        this.basePath,
        this.allPosts,
        this.currentPostId,
        this.handlePostClick.bind(this),
        this.loadHomePage.bind(this),
      );
    }

    // Update URL immediately after validating post exists, before heavy async operations
    // This provides instant feedback to the user while content loads
    const url = `${this.basePath}${postId}${hash || ""}`;
    window.history.pushState({ postId }, "", url);

    // Update document title
    document.title = `Isaac's Blog | ${post.name}`;
    this.blogContent.innerHTML = createDivElement(CSS_CLASSES.LOADING, LOADING_MESSAGES.LOADING_POST);

    try {
      // Load post content
      const contentMarkdown = await this.postLoader.loadPostContent(this.basePath, post.file);
      const hljsModule = await import("highlight.js");

      // Configure highlight.js to not escape HTML entities (code is safe from markdown)
      // This prevents => from being encoded as =&gt;
      const hljs = hljsModule.default || hljsModule;
      hljs.configure({ ignoreUnescapedHTML: true });
      const highlightConfig = createHighlightConfig(hljs);

      // Process markdown to HTML
      // Remove frontmatter for feature detection
      this.postRenderer.setCurrentPostId(postId);
      const html = await this.postRenderer.processMarkdown(contentMarkdown, highlightConfig);
      const markdownWithoutFrontmatter = contentMarkdown.replace(REGEX_PATTERNS.FRONTMATTER, "");

      await this.postRenderer.renderBlogPostContent(
        this.blogContent,
        html,
        markdownWithoutFrontmatter,
        hash,
        post.date,
        this.buildTerminologyPreviewContext(),
      );
    } catch (error) {
      if (error instanceof PostLoadError || error instanceof RenderingError) {
        throw error;
      }

      throw new PostLoadError("Failed to load blog post content", { postId, originalError: error });
    }
  }

  /**
   * Loads and displays the home page markdown content.
   *
   * @param hash - Optional hash fragment to include in the URL
   * @returns Promise that resolves when the home page has been loaded and rendered
   */
  private async loadHomePage(hash?: string): Promise<void> {
    if (!this.blogContent) {
      throw new RenderingError(ERROR_MESSAGES.BLOG_CONTENT_NOT_FOUND);
    }

    this.currentPostId = null;
    this.topicsBar.setSelectedTopic(null, true);
    this.posts = [...this.allPosts];
    this.sidebar.setActivePost(null);
    this.sidebar.setPosts(this.posts);

    if (this.blogContent) {
      this.linkInterceptor.setup(
        this.blogContent,
        this.basePath,
        this.allPosts,
        this.currentPostId,
        this.handlePostClick.bind(this),
        this.loadHomePage.bind(this),
      );
    }

    const url = `${this.basePath}${hash || ""}`;
    window.history.pushState({ postId: null }, "", url);
    document.title = "Isaac's Blog";
    this.blogContent.innerHTML = createDivElement(CSS_CLASSES.LOADING, LOADING_MESSAGES.LOADING_HOME);

    try {
      const contentMarkdown = await this.postLoader.loadHomePageContent(this.basePath);
      const hljsModule = await import("highlight.js");

      const hljs = hljsModule.default || hljsModule;
      hljs.configure({ ignoreUnescapedHTML: true });
      const highlightConfig = createHighlightConfig(hljs);

      const html = await this.postRenderer.processMarkdown(contentMarkdown, highlightConfig);
      const markdownWithoutFrontmatter = contentMarkdown.replace(REGEX_PATTERNS.FRONTMATTER, "");

      this.postRenderer.setCurrentPostId(null);
      await this.postRenderer.renderBlogPostContent(
        this.blogContent,
        html,
        markdownWithoutFrontmatter,
        hash,
        undefined,
        this.buildTerminologyPreviewContext(),
      );
    } catch (error) {
      if (error instanceof PostLoadError || error instanceof RenderingError) {
        throw error;
      }

      throw new PostLoadError("Failed to load home page content", { originalError: error });
    }
  }

  /**
   * Builds context for terminology hover previews.
   */
  private buildTerminologyPreviewContext(): TerminologyPreviewContext {
    return {
      basePath: this.basePath,
      currentPostId: this.currentPostId,
      terminologyPostIds: this.terminologyPostIds,
      postLoader: this.postLoader,
      postRenderer: this.postRenderer,
      postFiles: new Map(this.allPosts.map((post) => [post.id, post.file])),
      getHighlightConfig: () => this.getHighlightConfig(),
    };
  }

  /**
   * Returns a cached highlight.js configuration for markdown rendering.
   */
  private async getHighlightConfig(): Promise<HighlightConfig> {
    if (!this.highlightConfigPromise) {
      this.highlightConfigPromise = import("highlight.js").then((hljsModule) => {
        const hljs = hljsModule.default || hljsModule;
        hljs.configure({ ignoreUnescapedHTML: true });
        return createHighlightConfig(hljs);
      });
    }

    return this.highlightConfigPromise;
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
      this.blogContent.innerHTML = createDivElement(CSS_CLASSES.ERROR, escapeHtml(message));
    }
  }
}
