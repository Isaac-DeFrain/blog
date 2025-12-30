/**
 * @module DOM Helpers
 * @description DOM setup and teardown utilities for testing
 */

/**
 * Sets up a minimal DOM environment for testing
 * Creates required elements that components expect
 */
export function setupDOM(): {
  blogContent: HTMLElement;
  blogList: HTMLElement;
  topicsBar: HTMLElement;
  themeToggle: HTMLButtonElement;
  cleanup: () => void;
} {
  // Create required DOM elements
  const blogContent = document.createElement("div");
  blogContent.id = "blog-content";
  document.body.appendChild(blogContent);

  const blogList = document.createElement("ul");
  blogList.id = "blog-list";
  document.body.appendChild(blogList);

  const topicsBar = document.createElement("div");
  topicsBar.id = "topics-bar";
  document.body.appendChild(topicsBar);

  const themeToggle = document.createElement("button");
  themeToggle.id = "theme-toggle";
  document.body.appendChild(themeToggle);

  // Set up window.__BASE_PATH__ if not already set
  if (typeof (window as any).__BASE_PATH__ === "undefined") {
    (window as any).__BASE_PATH__ = "/";
  }

  return {
    blogContent,
    blogList,
    topicsBar,
    themeToggle,
    cleanup: () => {
      document.body.innerHTML = "";
      delete (window as any).__BASE_PATH__;
    },
  };
}

/**
 * Clears all DOM elements
 */
export function cleanupDOM(): void {
  document.body.innerHTML = "";
  delete (window as any).__BASE_PATH__;
}

/**
 * Creates a mock fetch response
 */
export function createMockResponse(data: any, options: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    statusText: "OK",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });
}

/**
 * Creates a mock fetch response for text content
 */
export function createMockTextResponse(text: string, options: ResponseInit = {}): Response {
  return new Response(text, {
    status: 200,
    statusText: "OK",
    headers: {
      "Content-Type": "text/plain",
      ...options.headers,
    },
    ...options,
  });
}

/**
 * Creates a URL-based fetch mock that matches requests by URL pattern
 * instead of call order. This is more reliable for complex async flows.
 */
export function createUrlBasedFetchMock(
  urlHandlers: Map<string | RegExp, () => Response | Promise<Response>>,
): typeof fetch {
  return async (input: RequestInfo | URL): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    // Extract pathname from full URL for better matching
    // This handles URLs like "http://localhost:3000/blog/posts/manifest.json"
    let pathname = url;
    let normalizedUrl = url;
    try {
      // Try to parse as URL - handle both relative and absolute URLs
      let urlObj: URL;
      if (typeof input === "string") {
        // If it's already a full URL, parse it directly
        if (/^https?:\/\//.test(input)) {
          urlObj = new URL(input);
        } else {
          // Relative URL - use current location as base
          // Handle case where window.location.href might have a port
          const baseUrl = window.location.href || "http://localhost/";
          urlObj = new URL(input, baseUrl);
        }
      } else if (input instanceof URL) {
        urlObj = input;
      } else {
        // Request object
        const baseUrl = window.location.href || "http://localhost/";
        urlObj = new URL(input.url, baseUrl);
      }

      pathname = urlObj.pathname;
      // Normalize URL by removing port for matching (ports can vary in test environments)
      // Keep the original URL structure but create a normalized version without port
      normalizedUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
    } catch (error) {
      // If URL parsing fails, try to extract pathname manually
      // Match pattern like "/blog/posts/manifest.json" or "/posts/manifest.json"
      // Also handle URLs with ports: "http://localhost:3000/blog/posts/manifest.json"
      const pathnameMatch = url.match(/\/[^?#]*/);
      if (pathnameMatch) {
        pathname = pathnameMatch[0];
      } else {
        pathname = url;
      }

      // Try to extract pathname from URL with port
      const urlWithPortMatch = url.match(/https?:\/\/[^\/]+(\/[^?#]*)/);
      if (urlWithPortMatch) {
        pathname = urlWithPortMatch[1];
      }
    }

    // Try to find a matching handler
    // Test against: original URL, normalized URL (without port), and pathname
    for (const [pattern, handler] of urlHandlers.entries()) {
      if (typeof pattern === "string") {
        // String matching: check if pattern appears in any of the URL variants
        if (url.includes(pattern) || normalizedUrl.includes(pattern) || pathname.includes(pattern)) {
          return handler();
        }
      } else {
        // RegExp - test against original URL, normalized URL, and pathname
        // This handles cases where URLs include base paths and ports
        if (pattern.test(url) || pattern.test(normalizedUrl) || pattern.test(pathname)) {
          return handler();
        }
      }
    }

    // No match found - return a default error response
    return new Response(JSON.stringify({ error: `No mock handler for URL: ${url} (pathname: ${pathname})` }), {
      status: 404,
      statusText: "Not Found",
    });
  };
}

/**
 * Waits for a condition to become true, checking at regular intervals.
 * Useful for waiting for async operations to complete.
 */
export async function waitFor(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;

  // Promise that resolves when condition becomes true
  const conditionMet = new Promise<void>((resolve) => {
    (function check() {
      if (condition()) {
        resolve();
      } else {
        setTimeout(check, interval);
      }
    })();
  });

  // Promise that rejects after timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Condition not met within ${timeout}ms`)), timeout);
  });

  // Race between condition being met and timeout
  return Promise.race([conditionMet, timeoutPromise]);
}

/**
 * Waits for a specific number of fetch calls to be made.
 * Useful for ensuring all async operations have started.
 */
export async function waitForFetchCalls(
  mockFetch: ReturnType<typeof import("vitest").vi.fn>,
  expectedCount: number,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  await waitFor(() => mockFetch.mock.calls.length >= expectedCount, options);
}

/**
 * Waits for the blog list to be populated with posts.
 */
export async function waitForBlogList(
  minItems: number = 1,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  await waitFor(() => {
    const blogList = document.getElementById("blog-list");
    return (blogList?.children.length || 0) >= minItems;
  }, options);
}

/**
 * Waits for blog content to be loaded (not loading state).
 */
export async function waitForBlogContent(options: { timeout?: number; interval?: number } = {}): Promise<void> {
  await waitFor(() => {
    const blogContent = document.getElementById("blog-content");
    if (!blogContent) return false;
    const text = blogContent.textContent || "";
    // Wait until content is loaded (not loading state and not empty)
    return text !== "Loading post..." && !text.includes("Loading") && text.trim().length > 0;
  }, options);
}
