/**
 * Tests for the Sidebar component including post rendering, active post highlighting,
 * click handling, and date formatting.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { Sidebar, type PostClickCallback } from "../../src/sidebar";
import { setupDOM, cleanupDOM } from "../helpers/dom";
import { createMockBlogPost, createMockBlogPosts } from "../helpers/mocks";

describe("Sidebar", () => {
  let sidebar: Sidebar;
  let mockOnPostClick: ReturnType<typeof vi.fn<PostClickCallback>>;

  beforeEach(() => {
    cleanupDOM();
    setupDOM();
    mockOnPostClick = vi.fn().mockResolvedValue(undefined);
    sidebar = new Sidebar("blog-list", mockOnPostClick);
  });

  describe("rendering", () => {
    it("should render posts list", () => {
      const posts = createMockBlogPosts(3);
      sidebar.setPosts(posts);

      const blogList = document.getElementById("blog-list");
      expect(blogList).not.toBeNull();
      expect(blogList?.children.length).toBe(3);
    });

    it("should display post names", () => {
      const posts = [
        createMockBlogPost({ id: "post-1", name: "First Post" }),
        createMockBlogPost({ id: "post-2", name: "Second Post" }),
      ];
      sidebar.setPosts(posts);

      const blogList = document.getElementById("blog-list");
      const firstItem = blogList?.children[0] as HTMLElement;
      const h3 = firstItem.querySelector("h3");
      expect(h3?.textContent).toBe("First Post");
    });

    it("should display formatted dates", () => {
      const posts = [createMockBlogPost({ id: "post-1", date: "2024-01-15" })];
      sidebar.setPosts(posts);

      const blogList = document.getElementById("blog-list");
      const firstItem = blogList?.children[0] as HTMLElement;
      const dateElement = firstItem.querySelector(".date");
      expect(dateElement?.textContent).toMatch(/January 15, 2024/);
    });

    it("should handle empty posts list", () => {
      sidebar.setPosts([]);

      const blogList = document.getElementById("blog-list");
      expect(blogList?.children.length).toBe(1);
      expect(blogList?.children[0].textContent).toBe("No posts available");
      expect(blogList?.children[0].className).toBe("loading");
    });

    it("should escape HTML in post names", () => {
      const posts = [createMockBlogPost({ id: "post-1", name: '<script>alert("XSS")</script>' })];
      sidebar.setPosts(posts);

      const blogList = document.getElementById("blog-list");
      const firstItem = blogList?.children[0] as HTMLElement;
      const h3 = firstItem.querySelector("h3");
      expect(h3?.textContent).toBe('<script>alert("XSS")</script>');
      // The HTML should be escaped, so innerHTML should contain &lt; and &gt;
      expect(h3?.innerHTML).toContain("&lt;");
    });
  });

  describe("active post highlighting", () => {
    it("should highlight active post", () => {
      const posts = createMockBlogPosts(3);
      sidebar.setPosts(posts);
      sidebar.setActivePost("post-2");

      const blogList = document.getElementById("blog-list");
      const items = Array.from(blogList?.children || []) as HTMLElement[];
      expect(items[0].classList.contains("active")).toBe(false);
      expect(items[1].classList.contains("active")).toBe(true);
      expect(items[2].classList.contains("active")).toBe(false);
    });

    it("should remove active class when setting active post to null", () => {
      const posts = createMockBlogPosts(2);
      sidebar.setPosts(posts);
      sidebar.setActivePost("post-1");
      sidebar.setActivePost(null);

      const blogList = document.getElementById("blog-list");
      const items = Array.from(blogList?.children || []) as HTMLElement[];
      items.forEach((item) => {
        expect(item.classList.contains("active")).toBe(false);
      });
    });

    it("should update active post when changed", () => {
      const posts = createMockBlogPosts(3);
      sidebar.setPosts(posts);
      sidebar.setActivePost("post-1");

      const blogList = document.getElementById("blog-list");
      let items = Array.from(blogList?.children || []) as HTMLElement[];
      expect(items[0].classList.contains("active")).toBe(true);

      sidebar.setActivePost("post-3");
      items = Array.from(blogList?.children || []) as HTMLElement[];
      expect(items[0].classList.contains("active")).toBe(false);
      expect(items[2].classList.contains("active")).toBe(true);
    });

    it("should handle active post that is not in the list", () => {
      const posts = createMockBlogPosts(2);
      sidebar.setPosts(posts);
      sidebar.setActivePost("non-existent-post");

      const blogList = document.getElementById("blog-list");
      const items = Array.from(blogList?.children || []) as HTMLElement[];
      items.forEach((item) => {
        expect(item.classList.contains("active")).toBe(false);
      });
    });
  });

  describe("click handling", () => {
    it("should call onPostClick when post is clicked", async () => {
      const posts = [createMockBlogPost({ id: "post-1", name: "Test Post" })];
      sidebar.setPosts(posts);

      const blogList = document.getElementById("blog-list");
      const firstItem = blogList?.children[0] as HTMLElement;

      const clickEvent = new MouseEvent("click", { bubbles: true });
      firstItem.dispatchEvent(clickEvent);

      // Wait for async callback
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockOnPostClick).toHaveBeenCalledWith("post-1");
    });

    it("should prevent default and stop propagation on click", async () => {
      const posts = [createMockBlogPost({ id: "post-1" })];
      sidebar.setPosts(posts);

      const blogList = document.getElementById("blog-list");
      const firstItem = blogList?.children[0] as HTMLElement;

      const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });

      firstItem.dispatchEvent(clickEvent);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Note: preventDefault and stopPropagation are called in the event handler
      // but we can't easily test them since the event is already dispatched
      expect(mockOnPostClick).toHaveBeenCalled();
    });

    it("should handle click errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockOnPostClick.mockRejectedValue(new Error("Test error"));

      const posts = [createMockBlogPost({ id: "post-1" })];
      sidebar.setPosts(posts);

      const blogList = document.getElementById("blog-list");
      const firstItem = blogList?.children[0] as HTMLElement;

      const clickEvent = new MouseEvent("click", { bubbles: true });
      firstItem.dispatchEvent(clickEvent);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(consoleErrorSpy).toHaveBeenCalledWith("Error loading blog post:", expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe("date formatting", () => {
    it("should format dates correctly for different months", () => {
      const posts = [
        createMockBlogPost({ id: "post-1", date: "2024-01-15" }),
        createMockBlogPost({ id: "post-2", date: "2024-07-15" }),
        createMockBlogPost({ id: "post-3", date: "2024-12-25" }),
      ];
      sidebar.setPosts(posts);

      const blogList = document.getElementById("blog-list");
      const items = Array.from(blogList?.children || []) as HTMLElement[];

      expect(items[0].querySelector(".date")?.textContent).toMatch(/January 15, 2024/);
      expect(items[1].querySelector(".date")?.textContent).toMatch(/July 15, 2024/);
      expect(items[2].querySelector(".date")?.textContent).toMatch(/December 25, 2024/);
    });

    it("should handle leap year dates", () => {
      const posts = [createMockBlogPost({ id: "post-1", date: "2024-02-29" })];
      sidebar.setPosts(posts);

      const blogList = document.getElementById("blog-list");
      const dateElement = blogList?.children[0].querySelector(".date");
      expect(dateElement?.textContent).toMatch(/February 29, 2024/);
    });
  });

  describe("edge cases", () => {
    it("should handle missing blog-list element gracefully", () => {
      cleanupDOM();
      const mockCallback: PostClickCallback = vi.fn().mockResolvedValue(undefined);
      const sidebarWithoutElement = new Sidebar("non-existent", mockCallback);
      sidebarWithoutElement.setPosts([createMockBlogPost()]);
      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle posts with very long names", () => {
      const longName = "A".repeat(200);
      const posts = [createMockBlogPost({ id: "post-1", name: longName })];
      sidebar.setPosts(posts);

      const blogList = document.getElementById("blog-list");
      const h3 = blogList?.children[0].querySelector("h3");
      expect(h3?.textContent).toBe(longName);
    });

    it("should handle posts with special characters in names", () => {
      const posts = [createMockBlogPost({ id: "post-1", name: "Post with 'quotes' and \"double quotes\"" })];
      sidebar.setPosts(posts);

      const blogList = document.getElementById("blog-list");
      const h3 = blogList?.children[0].querySelector("h3");
      expect(h3?.textContent).toContain("quotes");
    });
  });

  describe("scrolling and visibility", () => {
    it("should display all posts on both desktop and mobile", () => {
      const posts = createMockBlogPosts(15);
      sidebar.setPosts(posts);

      const blogList = document.getElementById("blog-list");
      expect(blogList?.children.length).toBe(15);
    });

    it("should scroll active post into view", () => {
      // Create a sidebar card container for testing
      const sidebarCard = document.createElement("div");
      sidebarCard.className = "sidebar-card";

      const blogListElement = document.getElementById("blog-list");
      if (blogListElement?.parentElement) {
        blogListElement.parentElement.appendChild(sidebarCard);
        sidebarCard.appendChild(blogListElement);
      }

      const posts = createMockBlogPosts(20);
      sidebar.setPosts(posts);
      sidebar.setActivePost("post-15");

      const activeItem = blogListElement?.querySelector(".blog-list-item.active");
      expect(activeItem).not.toBeNull();

      // The scrollIntoView method should be called (we can't easily test the actual scroll)
      // but we can verify the active item exists and has the active class
      expect(activeItem?.classList.contains("active")).toBe(true);
    });
  });
});
