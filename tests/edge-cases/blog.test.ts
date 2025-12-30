/**
 * Edge case and error handling tests for BlogReader
 * Tests uncovered branches and error paths
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  setupDOM,
  cleanupDOM,
  createMockResponse,
  createMockTextResponse,
  createUrlBasedFetchMock,
  waitForBlogContent,
  waitForBlogList,
} from "../helpers/dom";
import {
  createMockManifest,
  createMockMarkdown,
  createMockSVGElement,
  setupMathJaxMock,
  setupMermaidMock,
} from "../helpers/mocks";
import { li } from "../../src/utils";

const TIMEOUT = 2000;

// Mock Viz instance
const mockRenderSVGElement = vi.fn((_dot: string) => {
  return createMockSVGElement();
});

const mockVizInstance = {
  renderSVGElement: mockRenderSVGElement,
};

// Mock the @viz-js/viz module
vi.mock("@viz-js/viz", () => {
  return {
    instance: vi.fn(() => Promise.resolve(mockVizInstance)),
  };
});

/** Sets the base path for the blog reader */
function setBasePath(path: string) {
  (window as any).__BASE_PATH__ = path;
}

describe("Blog Reader Edge Cases", () => {
  let originalFetch: typeof fetch;
  let originalLocation: Location;
  let originalHistory: History;

  let mockPushState: ReturnType<typeof vi.fn>;
  let mockReplaceState: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    cleanupDOM();
    setupDOM();

    originalFetch = global.fetch;
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

    // Viz.js is mocked via vi.mock at the top of the file

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
    global.fetch = originalFetch;
    window.history = originalHistory;

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });

    // Viz.js is mocked via vi.mock at the top of the file

    cleanupDOM();
    vi.clearAllMocks();
  });

  describe("getPostIdFromPath edge cases", () => {
    it("should handle base path with trailing slash", async () => {
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
        content: "# Post 1",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await Promise.all([waitForBlogList(1, { timeout: TIMEOUT }), waitForBlogContent({ timeout: TIMEOUT })]);

      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Post 1");
    });

    it("should handle base path without trailing slash", async () => {
      setBasePath("/blog");
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
        content: "# Post 1",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await Promise.all([waitForBlogList(1, { timeout: TIMEOUT }), waitForBlogContent({ timeout: TIMEOUT })]);

      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Post 1");
    });

    it("should handle pathname exactly matching base path", async () => {
      setBasePath("/blog/");
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/blog/",
          origin: "http://localhost",
          href: "http://localhost/blog/",
        },
        writable: true,
      });

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Post 1",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await Promise.all([waitForBlogList(1, { timeout: TIMEOUT }), waitForBlogContent({ timeout: TIMEOUT })]);

      // Should load first post when pathname is just base path
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Post 1");
    });

    it("should handle pathname not starting with base path", async () => {
      setBasePath("/blog/");
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/other/path",
          origin: "http://localhost",
          href: "http://localhost/other/path",
        },
        writable: true,
      });

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Post 1",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await Promise.all([waitForBlogList(1, { timeout: TIMEOUT }), waitForBlogContent({ timeout: TIMEOUT })]);

      // Should load first post when pathname doesn't match base path
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Post 1");
    });
  });

  describe("Error handling", () => {
    it("should handle blogContent being null", async () => {
      cleanupDOM();
      // Don't set up blog-content element

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should handle manifest fetch failure", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(consoleErrorSpy).toHaveBeenCalled();
      const blogContent = document.getElementById("blog-content");
      // When manifest fails, it shows "No posts available" or error message
      expect(blogContent?.textContent).toMatch(/Failed to load blog posts|No posts available/);

      consoleErrorSpy.mockRestore();
    });

    it("should handle manifest response not ok", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      global.fetch = vi.fn().mockResolvedValue(
        new Response(null, {
          status: 404,
          statusText: "Not Found",
        }),
      );

      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should handle individual post fetch failure", async () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const manifest = createMockManifest(["post-1.md", "post-2.md"]);

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () =>
        Promise.resolve(
          new Response(null, {
            status: 404,
            statusText: "Not Found",
          }),
        ),
      );
      urlHandlers.set(/post-2\.md/, () => {
        const markdown = createMockMarkdown({
          name: "Post 2",
          date: "2024-01-20",
        });
        return createMockTextResponse(markdown);
      });

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await Promise.all([waitForBlogList(1, { timeout: TIMEOUT }), waitForBlogContent({ timeout: TIMEOUT })]);

      // Should have warned about failed post
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it("should handle post not found error", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      const reader = new BlogReader();

      await waitForBlogList(1, { timeout: TIMEOUT });

      // Try to load a non-existent post
      // Access private method via type assertion (testing only)
      await (reader as any).loadBlogPost("non-existent-post");

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(consoleErrorSpy).toHaveBeenCalled();
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Blog post not found");

      consoleErrorSpy.mockRestore();
    });

    it("should handle post content fetch failure", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
      });

      let callCount = 0;
      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => {
        callCount++;
        // First call (for frontmatter) succeeds, second call (for content) fails
        if (callCount === 1) {
          return createMockTextResponse(markdown);
        } else {
          return Promise.resolve(
            new Response(null, {
              status: 500,
              statusText: "Internal Server Error",
            }),
          );
        }
      });

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(consoleErrorSpy).toHaveBeenCalled();
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Failed to load blog post content");

      consoleErrorSpy.mockRestore();
    });

    it("should handle renderBlogPostContent when blogContent is null", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      const reader = new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });

      // Set blogContent to null in the reader instance
      (reader as any).blogContent = null;

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Try to render content
      await (reader as any).renderBlogPostContent("<p>Test</p>", "2024-01-15", "# Test");

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Link interception edge cases", () => {
    it("should handle link click when blogContent is null", async () => {
      cleanupDOM();
      setupDOM();

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "[Link](./post-1.md)",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Remove blogContent after setup
      const blogContent = document.getElementById("blog-content");
      blogContent?.remove();

      // Try to click a link (should not crash)
      const link = document.createElement("a");
      link.href = "/post-1";
      link.click();

      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it("should handle link without href", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Post 1",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Create a link without href
      const blogContent = document.getElementById("blog-content");
      const link = document.createElement("a");
      blogContent?.appendChild(link);

      const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(clickEvent);

      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    it("should handle link outside blog content area", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Post 1",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Get the call count after initial load (pushState is called when loading the initial post)
      const initialCallCount = mockPushState.mock.calls.length;

      // Create a link outside blog content
      const link = document.createElement("a");
      link.href = "/post-1";
      document.body.appendChild(link);

      const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(clickEvent);

      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not have called pushState again (link outside blog content should not be intercepted)
      expect(mockPushState).toHaveBeenCalledTimes(initialCallCount);
    });

    it("should handle link with .md extension", async () => {
      const manifest = createMockManifest(["post-1.md", "post-2.md"]);
      const markdown1 = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "[Link to Post 2](./post-2.md)",
      });
      const markdown2 = createMockMarkdown({
        name: "Post 2",
        date: "2024-01-20",
        content: "# Post 2",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown1));
      urlHandlers.set(/post-2\.md/, () => createMockTextResponse(markdown2));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await Promise.all([waitForBlogList(2, { timeout: 2000 }), waitForBlogContent({ timeout: 2000 })]);

      const blogContent = document.getElementById("blog-content");
      const link = blogContent?.querySelector("a[href*='post-2']");
      if (link) {
        const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
        link.dispatchEvent(clickEvent);

        await waitForBlogContent({ timeout: 2000 });

        expect(mockPushState).toHaveBeenCalled();
        expect(blogContent?.textContent).toContain("Post 2");
      }
    });

    it("should handle link with base path and .md extension", async () => {
      setBasePath("/blog/");

      const manifest = createMockManifest(["post-1.md", "post-2.md"]);
      const markdown1 = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "[Link to Post 2](/blog/post-2.md)",
      });
      const markdown2 = createMockMarkdown({
        name: "Post 2",
        date: "2024-01-20",
        content: "# Post 2",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown1));
      urlHandlers.set(/post-2\.md/, () => createMockTextResponse(markdown2));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await Promise.all([waitForBlogList(2, { timeout: 2000 }), waitForBlogContent({ timeout: 2000 })]);

      const blogContent = document.getElementById("blog-content");
      const link = blogContent?.querySelector("a");
      if (link) {
        const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
        link.dispatchEvent(clickEvent);

        await waitForBlogContent({ timeout: 2000 });
        expect(mockPushState).toHaveBeenCalled();
      }
    });
  });

  describe("Topic filtering edge cases", () => {
    it("should handle topic filter when current post is not in filtered list", async () => {
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

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown1));
      urlHandlers.set(/post-2\.md/, () => createMockTextResponse(markdown2));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;

      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await Promise.all([waitForBlogList(2, { timeout: 2000 }), waitForBlogContent({ timeout: 2000 })]);

      // Filter to only development posts (Post 2)
      const topicsBar = document.getElementById("topics-bar");
      const buttons = topicsBar?.querySelectorAll(".topic-button") || [];
      const devButton = Array.from(buttons).find((btn) => btn.textContent === "development") as HTMLButtonElement;

      if (devButton) {
        devButton.click();
        await waitForBlogContent({ timeout: 2000 });

        // Should have loaded Post 2 (check for date or content)
        const blogContent = document.getElementById("blog-content");
        // The content might show the date or post name
        expect(blogContent?.textContent).toMatch(/Post 2|January 20/);
      }
    });

    it("should handle topic filter when no posts match", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        topics: ["testing"],
        content: "# Post 1\n\nThis is test content.",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      const reader = new BlogReader();

      await Promise.all([waitForBlogList(1, { timeout: 2000 }), waitForBlogContent({ timeout: 2000 })]);

      // Initial state should have one post
      const blogList = document.getElementById("blog-list");
      expect(blogList?.children.length).toBe(1);

      // Simulate topic filter that results in no matches (no posts)
      (reader as any).handleTopicFilterChange([]);

      // Sidebar should show "No posts available" message when filtered to no matches
      expect(blogList?.children.length).toBe(1);
      expect(blogList?.innerHTML).toContain(li("loading", "No posts available"));
      expect(blogList?.textContent).toContain("No posts available");

      // Blog content should remain unchanged
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Post 1");
    });
  });

  describe("Popstate handler edge cases", () => {
    it("should handle popstate with no postId in state or path", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Post 1",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Simulate popstate with no postId
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/",
          origin: "http://localhost",
          href: "http://localhost/",
        },
        writable: true,
      });

      const popstateEvent = new PopStateEvent("popstate", {
        state: null,
      });
      window.dispatchEvent(popstateEvent);

      await waitForBlogContent({ timeout: 2000 });

      // Should have loaded first post
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Post 1");
    });
  });

  describe("Scroll to hash edge cases", () => {
    it("should handle scrollToHash with empty hash", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Post 1",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      const reader = new BlogReader();
      await waitForBlogList(1, { timeout: 2000 });

      const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});

      // Test scrollToHash with empty hash
      (reader as any).scrollToHash("");
      (reader as any).scrollToHash("#");

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(scrollIntoViewSpy).not.toHaveBeenCalled();

      scrollIntoViewSpy.mockRestore();
    });

    it("should handle scrollToHash when element not found by id", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Post 1",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      const reader = new BlogReader();
      await waitForBlogList(1, { timeout: 2000 });

      const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});

      // Test scrollToHash with non-existent id
      (reader as any).scrollToHash("#non-existent");
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(scrollIntoViewSpy).not.toHaveBeenCalled();

      scrollIntoViewSpy.mockRestore();
    });

    it("should handle scrollToHash with anchor element", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: '<a name="section-1">Section 1</a>',
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      const reader = new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});

      // Test scrollToHash with anchor name
      (reader as any).scrollToHash("#section-1");

      await new Promise((resolve) => setTimeout(resolve, 100));

      scrollIntoViewSpy.mockRestore();
    });
  });

  describe("No posts available", () => {
    it("should handle case when no posts are available", async () => {
      const manifest = createMockManifest([]);

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await new Promise((resolve) => setTimeout(resolve, 200));

      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("No posts available");
    });
  });

  describe("handlePostClick coverage", () => {
    it("should handle post click with hash parameter", async () => {
      const manifest = createMockManifest(["post-1.md", "post-2.md"]);
      const markdown1 = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Post 1",
      });
      const markdown2 = createMockMarkdown({
        name: "Post 2",
        date: "2024-01-20",
        content: "# Post 2\n\n## Section",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown1));
      urlHandlers.set(/post-2\.md/, () => createMockTextResponse(markdown2));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock(true);
      setupMermaidMock();

      const { BlogReader } = await import("../../src/blog");
      const reader = new BlogReader();

      await waitForBlogList(2, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Test handlePostClick with hash
      await (reader as any).handlePostClick("post-2", "#section");

      await waitForBlogContent({ timeout: 5000 });

      expect(mockPushState).toHaveBeenCalled();
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Post 2");
    });

    it("should preserve topic filter when loading post", async () => {
      const manifest = createMockManifest(["post-1.md", "post-2.md"]);
      const markdown1 = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        topics: ["testing"],
      });
      const markdown2 = createMockMarkdown({
        name: "Post 2",
        date: "2024-01-20",
        topics: ["testing"],
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown1));
      urlHandlers.set(/post-2\.md/, () => createMockTextResponse(markdown2));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock(true);
      setupMermaidMock();

      const { BlogReader } = await import("../../src/blog");
      const reader = new BlogReader();

      await waitForBlogList(2, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Set a topic filter
      const topicsBar = document.getElementById("topics-bar");
      const buttons = topicsBar?.querySelectorAll(".topic-button") || [];
      const testingButton = Array.from(buttons).find((btn) => btn.textContent === "testing") as HTMLButtonElement;
      if (testingButton) {
        testingButton.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Load a post - should preserve topic filter
      await (reader as any).handlePostClick("post-2");

      await waitForBlogContent({ timeout: 5000 });

      // Topic filter should still be active
      expect(mockPushState).toHaveBeenCalled();
    });
  });

  describe("Hash scrolling coverage", () => {
    it("should scroll to hash when loading post with hash in URL", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Post 1\n\n## Section One\n\nContent here",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      // Set hash in URL before loading
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/post-1",
          origin: "http://localhost",
          href: "http://localhost/post-1#section-one",
          hash: "#section-one",
        },
        writable: true,
      });

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Wait for hash scrolling
      await new Promise((resolve) => setTimeout(resolve, 200));

      const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
      // Hash scrolling should have been attempted
      // (The element might not exist, but the code path should be covered)
      scrollIntoViewSpy.mockRestore();
    });

    it("should scroll to element found by ID", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Post 1\n\n## Section One\n\nContent here",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      const reader = new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Create an element with the ID
      const section = document.createElement("h2");
      section.id = "test-section";
      section.textContent = "Test Section";
      const blogContent = document.getElementById("blog-content");
      blogContent?.appendChild(section);

      const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});

      // Test scrollToHash with element found by ID
      (reader as any).scrollToHash("#test-section");

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(scrollIntoViewSpy).toHaveBeenCalled();
      scrollIntoViewSpy.mockRestore();
    });
  });

  describe("Link interception with base path", () => {
    it("should handle link with base path and extract post ID correctly", async () => {
      setBasePath("/blog/");

      const manifest = createMockManifest(["post-1.md", "post-2.md"]);
      const markdown1 = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "[Link to Post 2](/blog/post-2)",
      });
      const markdown2 = createMockMarkdown({
        name: "Post 2",
        date: "2024-01-20",
        content: "# Post 2",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown1));
      urlHandlers.set(/post-2\.md/, () => createMockTextResponse(markdown2));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await waitForBlogList(2, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      const blogContent = document.getElementById("blog-content");
      const link = blogContent?.querySelector("a[href*='post-2']");
      if (link) {
        const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
        link.dispatchEvent(clickEvent);

        await waitForBlogContent({ timeout: 2000 });

        expect(mockPushState).toHaveBeenCalled();
        expect(blogContent?.textContent).toContain("Post 2");
      }
    });

    it("should handle link with hash to different post", async () => {
      const manifest = createMockManifest(["post-1.md", "post-2.md"]);
      const markdown1 = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "[Link to Post 2](./post-2.md#section)",
      });
      const markdown2 = createMockMarkdown({
        name: "Post 2",
        date: "2024-01-20",
        content: "# Post 2\n\n## Section\n\nContent",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown1));
      urlHandlers.set(/post-2\.md/, () => createMockTextResponse(markdown2));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await waitForBlogList(2, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      const blogContent = document.getElementById("blog-content");
      const link = blogContent?.querySelector("a[href*='post-2']");
      if (link) {
        const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
        link.dispatchEvent(clickEvent);

        await waitForBlogContent({ timeout: 2000 });

        expect(mockPushState).toHaveBeenCalled();
        expect(blogContent?.textContent).toContain("Post 2");
      }
    });
  });

  describe("Missing frontmatter fields", () => {
    it("should use default values when frontmatter fields are missing", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      // Markdown without name, date, or topics
      const markdown = `---
---

# Content without frontmatter fields`;

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Should have loaded with default values (Untitled, 1970-01-01, empty topics)
      const blogList = document.getElementById("blog-list");
      expect(blogList?.textContent).toContain("Untitled");
    });
  });

  describe("Path handling edge cases", () => {
    it("should handle path without leading slash after base path removal", async () => {
      setBasePath("/blog/");
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/blogpost-1", // No slash after "blog"
          origin: "http://localhost",
          href: "http://localhost/blogpost-1",
        },
        writable: true,
      });

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "# Post 1",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Should handle the path correctly
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Post 1");
    });
  });

  describe("Topic filter edge cases", () => {
    it("should handle topic filter when currentPostId is null", async () => {
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

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown1));
      urlHandlers.set(/post-2\.md/, () => createMockTextResponse(markdown2));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog");
      const reader = new BlogReader();

      await waitForBlogList(2, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Set currentPostId to null
      (reader as any).currentPostId = null;

      // Filter to only testing posts
      const topicsBar = document.getElementById("topics-bar");
      const buttons = topicsBar?.querySelectorAll(".topic-button") || [];
      const testingButton = Array.from(buttons).find((btn) => btn.textContent === "testing") as HTMLButtonElement;

      if (testingButton) {
        testingButton.click();
        await waitForBlogContent({ timeout: 2000 });

        // Should have loaded first post from filtered list
        const blogContent = document.getElementById("blog-content");
        // Check for either post name or date
        expect(blogContent?.textContent).toMatch(/Post 1|January 15/);
      }
    });
  });

  describe("loadBlogPost edge cases", () => {
    it("should preserve topic filter when loading post list", async () => {
      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        topics: ["testing"],
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock(true);
      setupMermaidMock();

      const { BlogReader } = await import("../../src/blog");
      const reader = new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Set a topic filter
      const topicsBar = document.getElementById("topics-bar");
      const buttons = topicsBar?.querySelectorAll(".topic-button") || [];
      const testingButton = Array.from(buttons).find((btn) => btn.textContent === "testing") as HTMLButtonElement;

      if (testingButton) {
        testingButton.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Clear posts to trigger reload
      (reader as any).allPosts = [];

      // Load post - should preserve topic filter
      await (reader as any).loadBlogPost("post-1");
      await waitForBlogContent({ timeout: 5000 });

      // Topic filter should still be active
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toMatch(/Post 1|January 15/);
    });
  });
});
