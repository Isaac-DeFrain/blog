/**
 * Edge case and error handling tests for BlogReader
 * Tests uncovered branches and error paths
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
import {
  createMockManifest,
  createMockMarkdown,
  createMockSVGElement,
  setupMathJaxMock,
  setupMermaidMock,
} from "../helpers/mocks";
import { createListItemElement } from "../../src/utils/html";
import { resolveWithTimeout } from "../../src/utils/async";
import { initializeBlogReader } from "../common";
import { ERROR_PREFIXES, RenderingError } from "../../src/utils/errors";

const TIMEOUT = { timeout: 2000 };

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

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

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

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

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

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      // Should load the home page when pathname is just base path
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Welcome to my blog");
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

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      // Should load the home page when pathname doesn't match base path
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Welcome to my blog");
    });
  });

  describe("Error handling", () => {
    it("should handle blogContent being null", async () => {
      cleanupDOM();

      // Don't set up blog-content element
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await initializeBlogReader();
      await new Promise(resolveWithTimeout(100));

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should handle manifest fetch failure", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
      setupMathJaxMock();

      await initializeBlogReader();
      await new Promise(resolveWithTimeout(200));

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

      await initializeBlogReader();
      await new Promise(resolveWithTimeout(200));

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

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

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

      const reader = await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);

      // Try to load a non-existent post using the public API (handlePostClick)
      // This will catch the error and show it to the user
      await (reader as any).handlePostClick("non-existent-post");
      await new Promise(resolveWithTimeout(100));
      expect(consoleErrorSpy).toHaveBeenCalled();

      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Blog post not found");

      consoleErrorSpy.mockRestore();
    });

    it("should handle post content fetch failure", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      Object.defineProperty(window, "location", {
        value: {
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

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await new Promise(resolveWithTimeout(300));
      expect(consoleErrorSpy).toHaveBeenCalled();

      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Failed to load blog post");

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

      const reader = await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);

      // Try to render content with null blogContent (simulating missing element)
      // This should throw a RenderingError
      try {
        await (reader as any).postRenderer.renderBlogPostContent(null as any, "<p>Test</p>", "# Test", undefined, "2024-01-15");
        assert(false, "Should not reach here");
      } catch (error) {
        expect((error as Error).name).toBe(RenderingError.name);
        expect((error as Error).message).toContain(
          `${ERROR_PREFIXES.RENDERING_ERROR}: Blog post content element is null`,
        );
      }
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

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      // Remove blogContent after setup
      const blogContent = document.getElementById("blog-content");
      blogContent?.remove();

      // Try to click a link (should not crash)
      const link = document.createElement("a");
      link.href = "/post-1";
      link.click();

      await new Promise(resolveWithTimeout(50));
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

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      // Create a link without href
      const blogContent = document.getElementById("blog-content");
      const link = document.createElement("a");
      blogContent?.appendChild(link);

      const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(clickEvent);

      await new Promise(resolveWithTimeout(50));
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

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      // Get the call count after initial load (pushState is called when loading the initial post)
      const initialCallCount = mockPushState.mock.calls.length;

      // Create a link outside blog content
      const link = document.createElement("a");
      link.href = "/post-1";
      document.body.appendChild(link);

      const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(clickEvent);

      await new Promise(resolveWithTimeout(50));

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

      await initializeBlogReader();
      await waitForBlogList(2, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      const blogContent = document.getElementById("blog-content");
      const link = blogContent?.querySelector("a[href*='post-2']");
      if (link) {
        const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
        link.dispatchEvent(clickEvent);

        await waitForBlogContent(TIMEOUT);

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

      await initializeBlogReader();
      await waitForBlogList(2, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      const blogContent = document.getElementById("blog-content");
      const link = blogContent?.querySelector("a");
      if (link) {
        const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
        link.dispatchEvent(clickEvent);

        await waitForBlogContent(TIMEOUT);
        expect(mockPushState).toHaveBeenCalled();
      }
    });

    it("should handle link with pathname matching base path exactly", async () => {
      setBasePath("/blog/");

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "[Link to section](#section-1)",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      Object.defineProperty(window, "location", {
        value: {
          pathname: "/blog/post-1",
          origin: "http://localhost",
          href: "http://localhost/blog/post-1",
        },
        writable: true,
      });

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

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

    it("should handle link with pathname matching root path", async () => {
      setBasePath("/");

      const manifest = createMockManifest(["post-1.md"]);
      const markdown = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        content: "[Link to section](#section-1)",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      Object.defineProperty(window, "location", {
        value: {
          pathname: "/post-1",
          origin: "http://localhost",
          href: "http://localhost/post-1",
        },
        writable: true,
      });

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

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

      await initializeBlogReader();
      await waitForBlogList(2, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      // Filter to only development posts (Post 2)
      const topicsBar = document.getElementById("topics-bar");
      const buttons = topicsBar?.querySelectorAll(".topic-button") || [];
      const devButton = Array.from(buttons).find((btn) => btn.textContent === "development") as HTMLButtonElement;

      if (devButton) {
        devButton.click();
        await waitForBlogContent(TIMEOUT);

        // Should have loaded Post 2 (check for date or content)
        const blogContent = document.getElementById("blog-content");
        expect(blogContent?.textContent).toMatch(/Post 2|January 20/);
      }
    });

    it("should handle topic filter when no posts match", async () => {
      Object.defineProperty(window, "location", {
        value: {
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
        topics: ["testing"],
        content: "# Post 1\n\nThis is test content.",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const reader = await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      // Initial state should have one post
      const blogList = document.getElementById("blog-list");
      expect(blogList?.children.length).toBe(1);

      // Simulate topic filter that results in no matches (no posts)
      (reader as any).handleTopicFilterChange([]);

      // Sidebar should show "No posts available" message when filtered to no matches
      expect(blogList?.children.length).toBe(1);
      expect(blogList?.innerHTML).toContain(createListItemElement("loading", "No posts available"));
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

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

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
      await waitForBlogContent(TIMEOUT);

      // Should have loaded the home page
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Welcome to my blog");
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

      const reader = await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);

      // Test scrollToHash with empty hash
      const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});
      (reader as any).postRenderer.scrollToHash("");
      (reader as any).postRenderer.scrollToHash("#");
      await new Promise(resolveWithTimeout(50));

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

      const reader = await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);

      // Test scrollToHash with non-existent id
      const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});
      (reader as any).postRenderer.scrollToHash("#non-existent");
      await new Promise(resolveWithTimeout(50));

      expect(scrollIntoViewSpy).not.toHaveBeenCalled();
      scrollIntoViewSpy.mockRestore();
    });

    it("should handle scrollToHash with anchor element", async () => {
      Object.defineProperty(window, "location", {
        value: {
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
        content: '<a name="section-1">Section 1</a>',
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const reader = await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      // Test scrollToHash with anchor name
      const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView").mockImplementation(() => {});
      (reader as any).postRenderer.scrollToHash("#section-1");
      await new Promise(resolveWithTimeout(100));

      expect(scrollIntoViewSpy).toHaveBeenCalled();
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

      await initializeBlogReader();
      await new Promise(resolveWithTimeout(200));

      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Welcome to my blog");
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

      const reader = await initializeBlogReader();
      await waitForBlogList(2, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

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

      const reader = await initializeBlogReader();
      await waitForBlogList(2, TIMEOUT);
      await waitForBlogContent(TIMEOUT);

      // Set a topic filter
      const topicsBar = document.getElementById("topics-bar");
      const buttons = topicsBar?.querySelectorAll(".topic-button") || [];
      const testingButton = Array.from(buttons).find((btn) => btn.textContent === "testing") as HTMLButtonElement;
      if (testingButton) {
        testingButton.click();
        await new Promise(resolveWithTimeout(100));
      }

      // Load a post - should preserve topic filter
      await (reader as any).handlePostClick("post-2");
      await waitForBlogContent({ timeout: 5000 });
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

      await initializeBlogReader();
      await waitForBlogList(1, TIMEOUT);

      const scrollIntoViewSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
      await waitForBlogContent(TIMEOUT);
      await new Promise(resolveWithTimeout(200));

      expect(scrollIntoViewSpy).toHaveBeenCalled();
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

      const { BlogReader } = await import("../../src/blog/reader");
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
      (reader as any).postRenderer.scrollToHash("#test-section");

      await new Promise(resolveWithTimeout(50));

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

      const { BlogReader } = await import("../../src/blog/reader");
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

      const { BlogReader } = await import("../../src/blog/reader");
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

      const { BlogReader } = await import("../../src/blog/reader");
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

      const { BlogReader } = await import("../../src/blog/reader");
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

      const { BlogReader } = await import("../../src/blog/reader");
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

      const { BlogReader } = await import("../../src/blog/reader");
      const reader = new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Set a topic filter
      const topicsBar = document.getElementById("topics-bar");
      const buttons = topicsBar?.querySelectorAll(".topic-button") || [];
      const testingButton = Array.from(buttons).find((btn) => btn.textContent === "testing") as HTMLButtonElement;

      if (testingButton) {
        testingButton.click();
        await new Promise(resolveWithTimeout(100));
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

    it("should preserve topic filter when handlePostClick is called with multiple posts", async () => {
      const manifest = createMockManifest(["post-1.md", "post-2.md", "post-3.md"]);
      const markdown1 = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-10",
        topics: ["testing"],
      });
      const markdown2 = createMockMarkdown({
        name: "Post 2",
        date: "2024-01-20",
        topics: ["testing"],
      });
      const markdown3 = createMockMarkdown({
        name: "Post 3",
        date: "2024-01-15",
        topics: ["development"],
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown1));
      urlHandlers.set(/post-2\.md/, () => createMockTextResponse(markdown2));
      urlHandlers.set(/post-3\.md/, () => createMockTextResponse(markdown3));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock(true);
      setupMermaidMock();

      const { BlogReader } = await import("../../src/blog/reader");
      const reader = new BlogReader();

      await waitForBlogList(3, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Set a topic filter to "testing"
      const topicsBar = document.getElementById("topics-bar");
      const buttons = topicsBar?.querySelectorAll(".topic-button") || [];
      const testingButton = Array.from(buttons).find((btn) => btn.textContent === "testing") as HTMLButtonElement;

      if (testingButton) {
        testingButton.click();
        await new Promise(resolveWithTimeout(100));
      }

      // Verify filter is active (should have 2 posts)
      const blogList = document.getElementById("blog-list");
      expect(blogList?.children.length).toBe(2);

      // Load a different post - should preserve topic filter and sort correctly
      await (reader as any).handlePostClick("post-2");

      await waitForBlogContent({ timeout: 5000 });

      // Topic filter should still be active and posts should be sorted
      expect(blogList?.children.length).toBe(2);
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toMatch(/Post 2|January 20/);
    });
  });

  describe("Code renderer edge cases", () => {
    it("should handle code block with no language", async () => {
      Object.defineProperty(window, "location", {
        value: {
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
        content: "```\nplain code\n```",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog/reader");
      new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Code block should be rendered (not as special block)
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("plain code");
    });

    it("should handle code block with unknown language", async () => {
      Object.defineProperty(window, "location", {
        value: {
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
        content: "```unknown-lang\nsome code\n```",
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown));

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog/reader");
      new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Code block should be rendered
      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("some code");
    });
  });

  describe("Error path coverage", () => {
    it("should handle non-PostNotFoundError in handleTopicFilterChange", async () => {
      const manifest = createMockManifest(["post-1.md", "post-2.md"]);
      const markdown1 = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        topics: ["testing"],
      });
      const markdown2 = createMockMarkdown({
        name: "Post 2",
        date: "2024-01-16",
        topics: ["testing"],
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown1));
      // Make post-2.md metadata succeed but content fail
      let post2CallCount = 0;
      urlHandlers.set(/post-2\.md/, () => {
        post2CallCount++;
        // First call is for metadata (during loadBlogList), second is for content
        if (post2CallCount === 1) {
          return createMockTextResponse(markdown2);
        }
        // Second call is for content - make it fail
        return Promise.reject(new Error("Network error"));
      });

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog/reader");
      const reader = new BlogReader();

      await waitForBlogList(2, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Filter to only post-2, which will fail to load content
      const allPosts = (reader as any).allPosts;
      const filteredPosts = allPosts.filter((p: any) => p.id === "post-2");
      (reader as any).handleTopicFilterChange(filteredPosts);

      // Wait for error to be displayed
      await new Promise(resolveWithTimeout(500));

      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Failed to load blog post");
    });

    it("should handle non-PostNotFoundError in handlePostClick", async () => {
      const manifest = createMockManifest(["post-1.md", "post-2.md"]);
      const markdown1 = createMockMarkdown({
        name: "Post 1",
        date: "2024-01-15",
        topics: ["testing"],
      });
      const markdown2 = createMockMarkdown({
        name: "Post 2",
        date: "2024-01-16",
        topics: ["testing"],
      });

      const urlHandlers = new Map<string | RegExp, () => Response | Promise<Response>>();
      urlHandlers.set(/manifest\.json/, () => createMockResponse(manifest));
      urlHandlers.set(/post-1\.md/, () => createMockTextResponse(markdown1));
      // Make post-2.md metadata succeed but content fail
      let post2CallCount = 0;
      urlHandlers.set(/post-2\.md/, () => {
        post2CallCount++;
        // First call is for metadata (during loadBlogList), second is for content
        if (post2CallCount === 1) {
          return createMockTextResponse(markdown2);
        }
        // Second call is for content - make it fail
        return Promise.reject(new Error("Network error"));
      });

      global.fetch = createUrlBasedFetchMock(urlHandlers) as typeof fetch;
      setupMathJaxMock();

      const { BlogReader } = await import("../../src/blog/reader");
      const reader = new BlogReader();

      await waitForBlogList(2, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Try to load post-2 - should handle non-PostNotFoundError
      await (reader as any).handlePostClick("post-2");

      await new Promise(resolveWithTimeout(500));

      const blogContent = document.getElementById("blog-content");
      expect(blogContent?.textContent).toContain("Failed to load blog post");
    });

    it("should throw RenderingError when blogContent is null in loadBlogPost", async () => {
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

      const { BlogReader } = await import("../../src/blog/reader");
      const { RenderingError } = await import("../../src/utils/errors");
      const reader = new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });

      // Set blogContent to null to trigger RenderingError
      (reader as any).blogContent = null;

      // Try to load post - should throw RenderingError
      await expect((reader as any).loadBlogPost("post-1")).rejects.toThrow(RenderingError);
    });

    it("should wrap non-PostLoadError/non-RenderingError in loadBlogPost", async () => {
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

      const { BlogReader } = await import("../../src/blog/reader");
      const { PostLoadError } = await import("../../src/utils/errors");
      const reader = new BlogReader();

      await waitForBlogList(1, { timeout: 2000 });
      await waitForBlogContent({ timeout: 2000 });

      // Mock PostRenderer.renderBlogPostContent to throw a generic Error
      const { PostRenderer } = await import("../../src/blog/post-renderer");
      const renderSpy = vi.spyOn(PostRenderer.prototype, "renderBlogPostContent");
      renderSpy.mockRejectedValueOnce(new Error("Generic rendering error"));

      // Try to load post - should wrap error in PostLoadError
      await expect((reader as any).loadBlogPost("post-1")).rejects.toThrow(PostLoadError);

      renderSpy.mockRestore();
    });
  });
});
