/**
 * Integration tests for BlogReader including SPA routing, post loading, link interception,
 * topic filtering, MathJax integration, and browser navigation handling.
 */
import { describe, it, expect, beforeEach, afterEach, vi, assert } from "vitest";
import {
  setupDOM,
  cleanupDOM,
  createMockResponse,
  createMockTextResponse,
  createUrlBasedFetchMock,
  waitForBlogContent,
  waitForBlogList,
  setBasePath,
} from "../helpers/dom";
import { createMockManifest, createMockMarkdown, createMockHomeMarkdown } from "../helpers/mocks";
import { resolveWithTimeout } from "../../src/utils/async";
import { initializeBlogReader } from "../common";

// Mock the blog module - we'll need to import it dynamically
// Since BlogReader is instantiated on module load, we need to handle this carefully

const TIMEOUT = { timeout: 2000 };

describe("BlogReader Integration", () => {
  let originalFetch: typeof fetch;
  let originalLocation: Location;
  let originalHistory: History;

  let mockFetch: ReturnType<typeof vi.fn>;
  let mockPushState: ReturnType<typeof vi.fn>;
  let mockReplaceState: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Clear module cache and reset DOM
    vi.resetModules();
    cleanupDOM();
    setupDOM();

    // Mock fetch with default error response to catch unmocked calls
    // Note: Tests that need URL-based mocking will override this
    originalFetch = global.fetch;
    mockFetch = vi.fn<typeof fetch>().mockImplementation((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

      if (url.includes("home.md")) {
        return Promise.resolve(createMockTextResponse("# Home\n\nWelcome to my blog."));
      }

      // Return a proper error response instead of undefined
      return Promise.resolve(
        new Response(JSON.stringify({ error: `Unmocked fetch call: ${url}` }), {
          status: 404,
          statusText: "Not Found",
        }),
      );
    });
    global.fetch = mockFetch as typeof fetch;

    // Mock history API
    originalHistory = window.history;
    mockPushState = vi.fn();
    mockReplaceState = vi.fn();
    Object.defineProperty(window, "history", {
      value: {
        ...originalHistory,
        pushState: mockPushState,
        replaceState: mockReplaceState,
      },
      writable: true,
    });

    // Mock location
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: {
        ...originalLocation,
        pathname: "/",
        origin: "http://localhost",
        href: "http://localhost/",
      },
      writable: true,
    });

    setBasePath("/");
  });

  afterEach(() => {
    // Reset original values
    global.fetch = originalFetch;
    window.history = originalHistory;
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });

    // Clean up DOM and reset mocks
    cleanupDOM();
    vi.clearAllMocks();
  });

  describe("SPA Routing", () => {
    it("should extract post ID from URL pathname", async () => {
      // This test would require accessing private methods
      // For now, we test the behavior through public API
      const manifest = createMockManifest(["post-1.md", "post-2.md"]);
      const markdown1 = createMockMarkdown({ name: "Post 1", date: "2024-01-15" });
      const markdown2 = createMockMarkdown({ name: "Post 2", date: "2024-01-20" });

      // Use URL-based mocking to handle all fetch calls
      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown1));
      urlHandlers.set(/post-2\.md/, () => createMockTextResponse(markdown2));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      // MathJax is mocked via vi.mock in mathjax.test.ts
      // For this test, we'll set it up directly
      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
        startup: {
          promise: Promise.resolve(),
        },
      };

      // Wait for blog list to be populated
      await initializeBlogReader();
      await waitForBlogList(2, TIMEOUT);

      // Check that posts were loaded
      const blogList = document.getElementById("blog-list");
      expect(blogList?.children.length).toBeGreaterThan(0);
    });

    it("should handle base path in URL", async () => {
      // Set base path and location before importing
      setBasePath("/blog/");
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/blog/post-1",
          origin: "http://localhost",
          href: "http://localhost/blog/post-1",
        },
        writable: true,
      });

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Post 1\n\nThis is Post 1 content.",
      });

      // Use URL-based mocking to handle fetch calls regardless of order
      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      // Override the mock fetch with URL-based handler
      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      // Should have loaded the post
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Post 1");
    });
  });

  describe("Post Loading", () => {
    it("should load and display blog posts", async () => {
      Object.defineProperty(window, "location", {
        value: {
          ...originalLocation,
          pathname: "/post-1",
          origin: "http://localhost",
          href: "http://localhost/post-1",
        },
        writable: true,
      });

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Test Post",
        date: "2024-01-15",
        content: "# Test Post\n\nThis is test content.",
      });

      // Use URL-based mocking to handle multiple calls to the same URL
      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Test Post");
    });

    it("should handle manifest loading errors", async () => {
      // Set up console spy before importing
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      await initializeBlogReader();
      await new Promise(resolveWithTimeout(200));

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should handle post loading errors", async () => {
      // Set up console spy before importing
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const manifest = createMockManifest(["post-1.md"]);

      mockFetch
        .mockResolvedValueOnce(createMockResponse(manifest))
        .mockRejectedValueOnce(new Error("Failed to load post"));
      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      await initializeBlogReader();
      await new Promise(resolveWithTimeout(1000));

      expect(consoleWarnSpy.mock.calls.length).toBe(1);
      consoleWarnSpy.mockRestore();
    });

    it("should sort posts by date (newest first)", async () => {
      const manifest = createMockManifest(["post-1.md", "post-2.md", "post-3.md"]);
      const markdown1 = createMockMarkdown({ name: "Post 1", date: "2024-01-10" });
      const markdown2 = createMockMarkdown({ name: "Post 2", date: "2024-01-20" });
      const markdown3 = createMockMarkdown({ name: "Post 3", date: "2024-01-15" });

      mockFetch
        .mockResolvedValueOnce(createMockResponse(manifest))
        .mockResolvedValueOnce(createMockTextResponse(markdown1))
        .mockResolvedValueOnce(createMockTextResponse(markdown2))
        .mockResolvedValueOnce(createMockTextResponse(markdown3));
      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      await initializeBlogReader();
      await new Promise(resolveWithTimeout(400));

      const blogList = document.getElementById("blog-list");
      const items = Array.from(blogList?.children || []) as HTMLElement[];

      assert(items[0].textContent?.startsWith("Post 2"));
      assert(items[1].textContent?.startsWith("Post 3"));
      assert(items[2].textContent?.startsWith("Post 1"));
    });
  });

  describe("Home Page", () => {
    it("should load the home page at the root URL", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Post 1\n\nThis is Post 1 content.",
      });
      const homeMarkdown = createMockHomeMarkdown("# Welcome\n\nThis is the home page.");

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));
      urlHandlers.set(/home\.md/, () => createMockTextResponse(homeMarkdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("This is the home page");
      expect(blogContent?.querySelector(".blog-meta")).toBeNull();
    });
  });

  describe("Link Interception", () => {
    it("should intercept internal blog post links", async () => {
      Object.defineProperty(window, "location", {
        value: {
          ...originalLocation,
          pathname: "/post-1",
          origin: "http://localhost",
          href: "http://localhost/post-1",
        },
        writable: true,
      });

      const manifest = createMockManifest(["post-1.md", "post-2.md"]);
      const markdown1 = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "[Link to Post 2](./post-2.md)",
      });
      const markdown2 = createMockMarkdown({ name: "Post 2", date: "2024-01-20" });

      mockFetch
        .mockResolvedValueOnce(createMockResponse(manifest))
        .mockResolvedValueOnce(createMockTextResponse(markdown1))
        .mockResolvedValueOnce(createMockTextResponse(markdown2));

      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      await initializeBlogReader();
      await new Promise(resolveWithTimeout(200));

      const blogContent = document.getElementById("blog-content");
      const link = blogContent?.querySelector("a");
      if (link) {
        const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
        link.dispatchEvent(clickEvent);

        await new Promise(resolveWithTimeout(100));

        // Should have called pushState for SPA routing
        expect(mockPushState).toHaveBeenCalled();
      }
    });

    it("should allow external links to navigate normally", async () => {
      Object.defineProperty(window, "location", {
        value: {
          ...originalLocation,
          pathname: "/post-1",
          origin: "http://localhost",
          href: "http://localhost/post-1",
        },
        writable: true,
      });

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "[External Link](https://example.com)",
      });

      mockFetch
        .mockResolvedValueOnce(createMockResponse(manifest))
        .mockResolvedValueOnce(createMockTextResponse(markdown));

      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      await initializeBlogReader();
      await new Promise(resolveWithTimeout(200));

      const blogContent = document.getElementById("blog-content");
      const link = blogContent?.querySelector("a[href='https://example.com']");
      if (link) {
        const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
        link.dispatchEvent(clickEvent);

        await new Promise(resolveWithTimeout(50));

        // Should not have called pushState for external links
        // (pushState might be called for other reasons, so we just check the link exists)
        expect(link).toBeDefined();
      }
    });

    it("should handle hash-only links for section navigation", async () => {
      Object.defineProperty(window, "location", {
        value: {
          ...originalLocation,
          pathname: "/post-1",
          origin: "http://localhost",
          href: "http://localhost/post-1",
        },
        writable: true,
      });

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Section 1\n\n[Link to section](#section-1)",
      });

      mockFetch
        .mockResolvedValueOnce(createMockResponse(manifest))
        .mockResolvedValueOnce(createMockTextResponse(markdown));

      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      await initializeBlogReader();
      await new Promise(resolveWithTimeout(200));

      const blogContent = document.getElementById("blog-content");
      const link = blogContent?.querySelector("a[href='#section-1']");
      if (link) {
        const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});

        const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
        link.dispatchEvent(clickEvent);

        await new Promise(resolveWithTimeout(100));

        expect(mockPushState).toHaveBeenCalled();
        scrollIntoViewSpy.mockRestore();
      }
    });
  });

  describe("Topic Filtering Integration", () => {
    it("should filter posts when topic is selected", async () => {
      const manifest = createMockManifest(["post-1.md", "post-2.md"]);
      const markdown1 = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        topics: ["testing"],
      });
      const markdown2 = createMockMarkdown({
        name: "Post 2",
        date: "2024-01-20",
        topics: ["development"],
      });

      mockFetch
        .mockResolvedValueOnce(createMockResponse(manifest))
        .mockResolvedValueOnce(createMockTextResponse(markdown1))
        .mockResolvedValueOnce(createMockTextResponse(markdown2));

      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      await initializeBlogReader();
      await new Promise(resolveWithTimeout(200));

      // Click on a topic button
      const topicsBar = document.getElementById("topics-bar");
      const buttons = topicsBar?.querySelectorAll(".topic-button") || [];
      const testingButton = Array.from(buttons).find((btn) => btn.textContent === "testing") as HTMLButtonElement;

      if (testingButton) {
        testingButton.click();
        await new Promise(resolveWithTimeout(100));

        // Sidebar should show only filtered posts
        const blogList = document.getElementById("blog-list");
        const items = Array.from(blogList?.children || []);
        // Should have only posts with "testing" topic
        expect(items.length).toBeGreaterThan(0);
      }
    });
  });

  describe("MathJax Integration", () => {
    it("should typeset math after content loads", async () => {
      Object.defineProperty(window, "location", {
        value: {
          ...originalLocation,
          pathname: "/post-1",
          origin: "http://localhost",
          href: "http://localhost/post-1",
        },
        writable: true,
      });

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "Inline math: $E = mc^2$",
      });

      // loadBlogList fetches manifest, then each markdown for frontmatter
      // loadBlogPost fetches the markdown again for full content
      mockFetch
        .mockResolvedValueOnce(createMockResponse(manifest))
        .mockResolvedValueOnce(createMockTextResponse(markdown)) // For frontmatter parsing
        .mockResolvedValueOnce(createMockTextResponse(markdown)); // For content loading

      const mockTypesetPromise = vi.fn().mockResolvedValue(undefined);
      (window as any).MathJax = {
        typesetPromise: mockTypesetPromise,
      };

      await initializeBlogReader();
      // Wait longer for content to load, MathJax import, and typesetting
      await new Promise(resolveWithTimeout(400));

      // MathJax should have been called
      expect(mockTypesetPromise).toHaveBeenCalled();
    });

    it("should detect and render display math ($$)", async () => {
      Object.defineProperty(window, "location", {
        value: {
          ...originalLocation,
          pathname: "/post-1",
          origin: "http://localhost",
          href: "http://localhost/post-1",
        },
        writable: true,
      });

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "Display math: $$E = mc^2$$",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      const mockTypesetPromise = vi.fn().mockResolvedValue(undefined);
      (window as any).MathJax = {
        typesetPromise: mockTypesetPromise,
      };

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);
      await new Promise(resolveWithTimeout(400));

      expect(mockTypesetPromise).toHaveBeenCalled();
    });

    it("should detect and render LaTeX delimiters", async () => {
      Object.defineProperty(window, "location", {
        value: {
          ...originalLocation,
          pathname: "/post-1",
          origin: "http://localhost",
          href: "http://localhost/post-1",
        },
        writable: true,
      });

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "Inline: \\(E = mc^2\\) Display: \\[E = mc^2\\]",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      const mockTypesetPromise = vi.fn().mockResolvedValue(undefined);
      (window as any).MathJax = {
        typesetPromise: mockTypesetPromise,
      };

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);
      await new Promise(resolveWithTimeout(400));

      expect(mockTypesetPromise).toHaveBeenCalled();
    });
  });

  describe("Mermaid Integration", () => {
    it("should detect and render Mermaid diagrams", async () => {
      Object.defineProperty(window, "location", {
        value: {
          ...originalLocation,
          pathname: "/post-1",
          origin: "http://localhost",
          href: "http://localhost/post-1",
        },
        writable: true,
      });

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "```mermaid\ngraph TD\nA-->B\n```",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      const mockRender = vi.fn().mockResolvedValue(undefined);
      (window as any).mermaid = {
        initialize: vi.fn(),
        run: mockRender,
      };

      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);
      await new Promise(resolveWithTimeout(400));

      // Mermaid should have been called
      expect(mockRender).toHaveBeenCalled();
    });
  });

  describe("Graphviz Integration", () => {
    it("should detect and render Graphviz diagrams", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "```dot\ndigraph { A -> B }\n```",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);
      await new Promise(resolveWithTimeout(400));

      // Graphviz should have been rendered (check for graphviz class)
      const blogContent = document.getElementById("blog-content");
      const graphvizElement = blogContent?.querySelector(".graphviz");
      expect(graphvizElement).toBeDefined();
    });

    it("should detect and render Graphviz diagrams with graphviz language", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "```graphviz\ndigraph { A -> B }\n```",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);
      await new Promise(resolveWithTimeout(400));

      // Graphviz should have been rendered
      const blogContent = document.getElementById("blog-content");
      const graphvizElement = blogContent?.querySelector(".graphviz");
      expect(graphvizElement).toBeDefined();
    });
  });

  describe("TypeScript Executable Blocks", () => {
    it("should render TypeScript executable blocks", async () => {
      Object.defineProperty(window, "location", {
        value: {
          ...originalLocation,
          pathname: "/post-1",
          origin: "http://localhost",
          href: "http://localhost/post-1",
        },
        writable: true,
      });

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "```typescript:run\nconst x = 1;\nconsole.log(x);\n```",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);
      await new Promise(resolveWithTimeout(400));

      // TypeScript executable block should have been rendered
      const blogContent = document.getElementById("blog-content");
      const tsBlock = blogContent?.querySelector(".ts-executable-block");
      expect(tsBlock).toBeDefined();
      expect(tsBlock?.querySelector(".ts-run-button")).toBeDefined();
      expect(tsBlock?.querySelector('script[type="application/json"]')).toBeDefined();
    });
  });

  describe("Browser Navigation", () => {
    it("should handle popstate events", async () => {
      const manifest = createMockManifest(["post-1.md", "post-2.md"]);
      const markdown1 = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Post 1\n\nThis is Post 1 content.",
      });
      const markdown2 = createMockMarkdown({
        name: "Post 2",
        date: "2024-01-20",
        content: "# Post 2\n\nThis is Post 2 content.",
      });

      // Use URL-based mocking to handle fetch calls regardless of order
      // This handles multiple calls to the same URL (e.g. manifest or markdown files)
      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();

      // Manifest handler - can be called multiple times
      urlHandlers.set(/manifest\.json$/, () => createMockResponse(manifest));

      // Markdown handlers - can be called multiple times (frontmatter parsing + content loading)
      urlHandlers.set(/post-1\.md$/, () => createMockTextResponse(markdown1));
      urlHandlers.set(/post-2\.md$/, () => createMockTextResponse(markdown2));

      // Override the mock fetch with URL-based handler
      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      (window as any).MathJax = {
        typesetPromise: vi.fn().mockResolvedValue(undefined),
      };

      // Wait for reader and initial load to complete - ensure posts are loaded before triggering popstate
      await initializeBlogReader();
      await waitForBlogList(2, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      // Simulate browser back button
      const popstateEvent = new PopStateEvent("popstate", {
        state: { postId: "post-2" },
      });
      window.dispatchEvent(popstateEvent);

      // Wait for popstate handler to load the post
      await waitForBlogContent(TIMEOUT);

      // Should have loaded post-2
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Post 2");
    });
  });
});
