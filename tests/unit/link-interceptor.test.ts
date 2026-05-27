/**
 * Unit tests for LinkInterceptor class
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { LinkInterceptor } from "../../src/blog/link-interceptor";
import type { BlogPost, PostClickCallback } from "../../src/blog/types";

describe("LinkInterceptor", () => {
  let interceptor: LinkInterceptor;
  let blogContent: HTMLElement;
  let mockOnPostClick: PostClickCallback;
  let mockOnHomeClick: () => Promise<void>;

  beforeEach(() => {
    document.body.innerHTML = "";
    interceptor = new LinkInterceptor();
    blogContent = document.createElement("div");
    blogContent.id = "blog-content";
    document.body.appendChild(blogContent);
    mockOnPostClick = vi.fn<PostClickCallback>();
    mockOnHomeClick = vi.fn(async () => {});
  });

  describe("scrollToHash", () => {
    it("should scroll to element by ID", () => {
      const targetElement = document.createElement("div");
      targetElement.id = "section-1";
      document.body.appendChild(targetElement);

      const scrollIntoViewSpy = vi.spyOn(targetElement, "scrollIntoView");

      // Access private method via type assertion (testing private method)
      (interceptor as any).scrollToHash("#section-1");

      expect(scrollIntoViewSpy).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      });
    });

    it("should scroll to anchor element by name attribute", () => {
      const targetAnchor = document.createElement("a");
      targetAnchor.setAttribute("name", "section-1");
      document.body.appendChild(targetAnchor);

      const scrollIntoViewSpy = vi.spyOn(targetAnchor, "scrollIntoView");

      (interceptor as any).scrollToHash("#section-1");

      expect(scrollIntoViewSpy).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      });
    });

    it("should prefer ID over name attribute", () => {
      const idElement = document.createElement("div");
      idElement.id = "section-1";
      document.body.appendChild(idElement);

      const nameAnchor = document.createElement("a");
      nameAnchor.setAttribute("name", "section-1");
      document.body.appendChild(nameAnchor);

      const idScrollSpy = vi.spyOn(idElement, "scrollIntoView");
      const nameScrollSpy = vi.spyOn(nameAnchor, "scrollIntoView");

      (interceptor as any).scrollToHash("#section-1");

      expect(idScrollSpy).toHaveBeenCalled();
      expect(nameScrollSpy).not.toHaveBeenCalled();
    });

    it("should handle empty hash", () => {
      const element = document.createElement("div");
      element.id = "test";
      document.body.appendChild(element);

      const scrollIntoViewSpy = vi.spyOn(element, "scrollIntoView");

      (interceptor as any).scrollToHash("");
      (interceptor as any).scrollToHash("#");

      expect(scrollIntoViewSpy).not.toHaveBeenCalled();
    });

    it("should handle hash without leading #", () => {
      const targetElement = document.createElement("div");
      targetElement.id = "section-1";
      document.body.appendChild(targetElement);

      const scrollIntoViewSpy = vi.spyOn(targetElement, "scrollIntoView");

      // Should handle hash without # (though normally called with #)
      (interceptor as any).scrollToHash("section-1");

      expect(scrollIntoViewSpy).toHaveBeenCalled();
    });

    it("should handle non-existent hash", () => {
      // No element with this ID or name
      expect(() => {
        (interceptor as any).scrollToHash("#non-existent");
      }).not.toThrow();
    });

    it("should handle hash with only #", () => {
      expect(() => {
        (interceptor as any).scrollToHash("#");
      }).not.toThrow();
    });
  });

  describe("setup - hash-only links", () => {
    it("should handle hash-only link with hash fragment", async () => {
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/post-1",
          origin: "http://localhost",
          href: "http://localhost/post-1",
        },
        writable: true,
      });

      const allPosts: BlogPost[] = [
        {
          id: "post-1",
          name: "Post 1",
          date: "2024-01-15",
          file: "post-1.md",
          topics: [],
        },
      ];

      const pushStateSpy = vi.spyOn(window.history, "pushState");

      const contentElement = document.createElement("div");
      contentElement.className = "blog-content";
      blogContent.appendChild(contentElement);

      interceptor.setup(blogContent, "/", allPosts, "post-1", mockOnPostClick, mockOnHomeClick);

      const link = document.createElement("a");
      link.href = "http://localhost/post-1#section-1";
      contentElement.appendChild(link);

      const targetElement = document.createElement("div");
      targetElement.id = "section-1";
      document.body.appendChild(targetElement);
      const scrollIntoViewSpy = vi.spyOn(targetElement, "scrollIntoView");

      const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(clickEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(pushStateSpy).toHaveBeenCalledWith({ postId: "post-1" }, "", expect.stringContaining("#section-1"));
      expect(scrollIntoViewSpy).toHaveBeenCalled();
      expect(mockOnPostClick).not.toHaveBeenCalled();
    });

    it("should handle hash-only link without hash fragment", async () => {
      const allPosts: BlogPost[] = [
        {
          id: "post-1",
          name: "Post 1",
          date: "2024-01-15",
          file: "post-1.md",
          topics: [],
        },
      ];

      interceptor.setup(blogContent, "/", allPosts, "post-1", mockOnPostClick, mockOnHomeClick);

      const link = document.createElement("a");
      link.href = window.location.pathname; // Same pathname, no hash
      blogContent.appendChild(link);

      const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(clickEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockOnPostClick).not.toHaveBeenCalled();
    });
  });

  describe("setup - navigation", () => {
    const allPosts: BlogPost[] = [
      {
        id: "post-1",
        name: "Post 1",
        date: "2024-01-15",
        file: "post-1.md",
        topics: [],
      },
      {
        id: "post-2",
        name: "Post 2",
        date: "2024-01-16",
        file: "post-2.md",
        topics: [],
      },
    ];

    function createNestedContent(): HTMLElement {
      const contentElement = document.createElement("div");
      contentElement.className = "blog-content";
      blogContent.appendChild(contentElement);
      return contentElement;
    }

    it("should route internal post clicks through the SPA callback", async () => {
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/post-1",
          origin: "http://localhost",
          href: "http://localhost/post-1",
        },
        writable: true,
      });

      const contentElement = createNestedContent();
      interceptor.setup(blogContent, "/", allPosts, "post-1", mockOnPostClick, mockOnHomeClick);

      const link = document.createElement("a");
      link.href = "http://localhost/post-2#intro";
      contentElement.appendChild(link);

      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(event.defaultPrevented).toBe(true);
      expect(mockOnPostClick).toHaveBeenCalledWith("post-2", "#intro");
    });

    it("should navigate home when clicking the home link from another page", async () => {
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/post-1",
          origin: "http://localhost",
          href: "http://localhost/post-1",
        },
        writable: true,
      });

      const contentElement = createNestedContent();
      interceptor.setup(blogContent, "/", allPosts, "post-1", mockOnPostClick, mockOnHomeClick);

      const link = document.createElement("a");
      link.href = "http://localhost/";
      contentElement.appendChild(link);

      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(event.defaultPrevented).toBe(true);
      expect(mockOnHomeClick).toHaveBeenCalledWith("");
    });

    it("should scroll in-page when clicking a home hash link while already home", async () => {
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/",
          origin: "http://localhost",
          href: "http://localhost/",
        },
        writable: true,
      });

      const contentElement = createNestedContent();
      const targetElement = document.createElement("div");
      targetElement.id = "welcome";
      document.body.appendChild(targetElement);
      const scrollIntoViewSpy = vi.spyOn(targetElement, "scrollIntoView");
      const pushStateSpy = vi.spyOn(window.history, "pushState");

      interceptor.setup(blogContent, "/", allPosts, null, mockOnPostClick, mockOnHomeClick);

      const link = document.createElement("a");
      link.href = "http://localhost/#welcome";
      contentElement.appendChild(link);

      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(event.defaultPrevented).toBe(true);
      expect(mockOnHomeClick).not.toHaveBeenCalled();
      expect(pushStateSpy).toHaveBeenCalledWith({ postId: null }, "", "/#welcome");
      expect(scrollIntoViewSpy).toHaveBeenCalled();
    });

    it("should allow external links to navigate normally", async () => {
      const contentElement = createNestedContent();
      interceptor.setup(blogContent, "/", allPosts, "post-1", mockOnPostClick, mockOnHomeClick);

      const link = document.createElement("a");
      link.href = "https://example.com/docs";
      contentElement.appendChild(link);

      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(event);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(event.defaultPrevented).toBe(false);
      expect(mockOnPostClick).not.toHaveBeenCalled();
      expect(mockOnHomeClick).not.toHaveBeenCalled();
    });
  });
});
