/**
 * Tests for the TopicsBar component including topic extraction, counting, sorting,
 * filter button rendering, and topic selection/filtering functionality.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { TopicsBar, type TopicFilterCallback } from "../../src/topics-bar";
import { setupDOM, cleanupDOM } from "../helpers/dom";
import { createMockBlogPost, createMockBlogPosts } from "../helpers/mocks";

describe("TopicsBar", () => {
  let topicsBar: TopicsBar;
  let mockOnFilterChange: ReturnType<typeof vi.fn<TopicFilterCallback>>;

  beforeEach(() => {
    cleanupDOM();
    setupDOM();
    mockOnFilterChange = vi.fn();
    topicsBar = new TopicsBar("topics-bar", mockOnFilterChange);
  });

  describe("topic extraction and counting", () => {
    it("should extract unique topics from posts", () => {
      const posts = [
        createMockBlogPost({ id: "post-1", topics: ["testing", "development"] }),
        createMockBlogPost({ id: "post-2", topics: ["testing", "design"] }),
        createMockBlogPost({ id: "post-3", topics: ["development"] }),
      ];
      topicsBar.setPosts(posts);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      const buttons = topicsBarElement?.querySelectorAll(".topic-button") || [];
      // Should have "all" button + 3 unique topics
      expect(buttons.length).toBe(4);
    });

    it("should count how many posts reference each topic", () => {
      const posts = [
        createMockBlogPost({ id: "post-1", topics: ["testing"] }),
        createMockBlogPost({ id: "post-2", topics: ["testing"] }),
        createMockBlogPost({ id: "post-3", topics: ["development"] }),
      ];
      topicsBar.setPosts(posts);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      const buttons = Array.from(topicsBarElement?.querySelectorAll(".topic-button") || []);
      // "all" button should be first, then topics sorted by count
      // "testing" (2 posts) should come before "development" (1 post)
      expect(buttons[1].textContent).toBe("testing");
      expect(buttons[2].textContent).toBe("development");
    });

    it("should handle posts with no topics", () => {
      const posts = [
        createMockBlogPost({ id: "post-1", topics: [] }),
        createMockBlogPost({ id: "post-2", topics: ["testing"] }),
      ];
      topicsBar.setPosts(posts);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      const buttons = topicsBarElement?.querySelectorAll(".topic-button") || [];
      // Should only have "all" and "testing"
      expect(buttons.length).toBe(2);
    });

    it("should handle empty posts list", () => {
      topicsBar.setPosts([]);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      expect(topicsBarElement?.innerHTML).toBe("");
    });
  });

  describe("topic sorting", () => {
    it("should sort topics by count (descending)", () => {
      const posts = [
        createMockBlogPost({ id: "post-1", topics: ["testing"] }),
        createMockBlogPost({ id: "post-2", topics: ["testing"] }),
        createMockBlogPost({ id: "post-3", topics: ["testing"] }),
        createMockBlogPost({ id: "post-4", topics: ["development"] }),
        createMockBlogPost({ id: "post-5", topics: ["development"] }),
        createMockBlogPost({ id: "post-6", topics: ["design"] }),
      ];
      topicsBar.setPosts(posts);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      const buttons = Array.from(topicsBarElement?.querySelectorAll(".topic-button") || []);
      // "all" button is first, then sorted by count
      expect(buttons[1].textContent).toBe("testing"); // 3 posts
      expect(buttons[2].textContent).toBe("development"); // 2 posts
      expect(buttons[3].textContent).toBe("design"); // 1 post
    });

    it("should sort topics alphabetically when counts are equal", () => {
      const posts = [
        createMockBlogPost({ id: "post-1", topics: ["zebra"] }),
        createMockBlogPost({ id: "post-2", topics: ["apple"] }),
        createMockBlogPost({ id: "post-3", topics: ["banana"] }),
      ];
      topicsBar.setPosts(posts);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      const buttons = Array.from(topicsBarElement?.querySelectorAll(".topic-button") || []);
      // All have count 1, so sorted alphabetically
      expect(buttons[1].textContent).toBe("apple");
      expect(buttons[2].textContent).toBe("banana");
      expect(buttons[3].textContent).toBe("zebra");
    });
  });

  describe("filter button rendering", () => {
    it("should render 'all' button", () => {
      const posts = createMockBlogPosts(2);
      topicsBar.setPosts(posts);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      const allButton = topicsBarElement?.querySelector(".topic-button");
      expect(allButton?.textContent).toBe("all");
    });

    it("should mark 'all' button as active when no topic is selected", () => {
      const posts = createMockBlogPosts(2);
      topicsBar.setPosts(posts);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      const allButton = topicsBarElement?.querySelector(".topic-button");
      expect(allButton?.classList.contains("active")).toBe(true);
    });

    it("should render topic buttons", () => {
      const posts = [createMockBlogPost({ id: "post-1", topics: ["testing", "development"] })];
      topicsBar.setPosts(posts);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      const buttons = topicsBarElement?.querySelectorAll(".topic-button") || [];
      expect(buttons.length).toBe(3); // "all" + 2 topics
    });

    it("should render topics in lowercase", () => {
      const posts = [createMockBlogPost({ id: "post-1", topics: ["Testing", "DEVELOPMENT"] })];
      topicsBar.setPosts(posts);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      const buttons = Array.from(topicsBarElement?.querySelectorAll(".topic-button") || []);
      // Topics are sorted alphabetically when counts are equal
      expect(buttons[1].textContent).toBe("development");
      expect(buttons[2].textContent).toBe("testing");
    });
  });

  describe("topic selection and filtering", () => {
    it("should call onFilterChange when topic is clicked", () => {
      const posts = [
        createMockBlogPost({ id: "post-1", topics: ["testing"] }),
        createMockBlogPost({ id: "post-2", topics: ["development"] }),
      ];
      topicsBar.setPosts(posts);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      const buttons = topicsBarElement?.querySelectorAll(".topic-button") || [];
      // Topics are sorted alphabetically: development (buttons[1]), then testing (buttons[2])
      const testingButton = buttons[2] as HTMLButtonElement;

      testingButton.click();

      expect(mockOnFilterChange).toHaveBeenCalled();
      const filteredPosts = mockOnFilterChange.mock.calls[0][0];
      expect(filteredPosts.length).toBe(1);
      expect(filteredPosts[0].id).toBe("post-1");
    });

    it("should filter posts by selected topic", () => {
      const posts = [
        createMockBlogPost({ id: "post-1", topics: ["testing"] }),
        createMockBlogPost({ id: "post-2", topics: ["development"] }),
        createMockBlogPost({ id: "post-3", topics: ["testing", "development"] }),
      ];
      topicsBar.setPosts(posts);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      const buttons = topicsBarElement?.querySelectorAll(".topic-button") || [];
      // Topics are sorted alphabetically: development (buttons[1]), then testing (buttons[2])
      const testingButton = buttons[2] as HTMLButtonElement;

      testingButton.click();

      const filteredPosts = mockOnFilterChange.mock.calls[0][0];
      expect(filteredPosts.length).toBe(2); // post-1 and post-3
      expect(
        filteredPosts.every((p: { topics: string[] }) => p.topics.some((t: string) => t.toLowerCase() === "testing")),
      ).toBe(true);
    });

    it("should sort filtered posts by date (newest first)", () => {
      const posts = [
        createMockBlogPost({ id: "post-1", date: "2024-01-15", topics: ["testing"] }),
        createMockBlogPost({ id: "post-2", date: "2024-01-20", topics: ["testing"] }),
        createMockBlogPost({ id: "post-3", date: "2024-01-10", topics: ["testing"] }),
      ];
      topicsBar.setPosts(posts);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      const buttons = topicsBarElement?.querySelectorAll(".topic-button") || [];
      const testingButton = buttons[1] as HTMLButtonElement;

      testingButton.click();

      const filteredPosts = mockOnFilterChange.mock.calls[0][0];
      expect(filteredPosts[0].id).toBe("post-2"); // Newest first
      expect(filteredPosts[1].id).toBe("post-1");
      expect(filteredPosts[2].id).toBe("post-3");
    });

    it("should clear filter when 'all' button is clicked", () => {
      const posts = [
        createMockBlogPost({ id: "post-1", topics: ["testing"] }),
        createMockBlogPost({ id: "post-2", topics: ["development"] }),
      ];
      topicsBar.setPosts(posts);
      topicsBar.render();

      // Select a topic first
      const topicsBarElement = document.getElementById("topics-bar");
      const buttons = topicsBarElement?.querySelectorAll(".topic-button") || [];
      const testingButton = buttons[1] as HTMLButtonElement;
      testingButton.click();

      // Then click "all"
      const allButton = buttons[0] as HTMLButtonElement;
      allButton.click();

      const filteredPosts = mockOnFilterChange.mock.calls[1][0];
      expect(filteredPosts.length).toBe(2); // All posts
    });

    it("should mark selected topic button as active", () => {
      const posts = [createMockBlogPost({ id: "post-1", topics: ["testing"] })];
      topicsBar.setPosts(posts);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      const buttons = topicsBarElement?.querySelectorAll(".topic-button") || [];
      const testingButton = buttons[1] as HTMLButtonElement;

      testingButton.click();

      // Re-render to check active state
      topicsBar.render();
      const updatedButtons = topicsBarElement?.querySelectorAll(".topic-button") || [];
      expect(updatedButtons[0].classList.contains("active")).toBe(false); // "all" not active
      expect(updatedButtons[1].classList.contains("active")).toBe(true); // "testing" active
    });
  });

  describe("getSelectedTopic and setSelectedTopic", () => {
    it("should return null when no topic is selected", () => {
      expect(topicsBar.getSelectedTopic()).toBeNull();
    });

    it("should return selected topic", () => {
      const posts = [createMockBlogPost({ id: "post-1", topics: ["testing"] })];
      topicsBar.setPosts(posts);
      topicsBar.setSelectedTopic("testing");

      expect(topicsBar.getSelectedTopic()).toBe("testing");
    });

    it("should clear selection when setSelectedTopic is called with null", () => {
      topicsBar.setSelectedTopic("testing");
      topicsBar.setSelectedTopic(null);

      expect(topicsBar.getSelectedTopic()).toBeNull();
    });

    it("should update selection when setSelectedTopic is called", () => {
      const posts = [createMockBlogPost({ id: "post-1", topics: ["testing", "development"] })];
      topicsBar.setPosts(posts);
      topicsBar.setSelectedTopic("testing");
      topicsBar.setSelectedTopic("development");

      expect(topicsBar.getSelectedTopic()).toBe("development");
    });
  });

  describe("edge cases", () => {
    it("should handle missing topics-bar element gracefully", () => {
      cleanupDOM();
      const mockCallback: TopicFilterCallback = vi.fn();
      const topicsBarWithoutElement = new TopicsBar("non-existent", mockCallback);
      topicsBarWithoutElement.setPosts([createMockBlogPost()]);
      topicsBarWithoutElement.render();
      // Should not throw
      expect(true).toBe(true);
    });

    it("should handle posts with duplicate topics", () => {
      const posts = [createMockBlogPost({ id: "post-1", topics: ["testing", "testing"] })];
      topicsBar.setPosts(posts);
      topicsBar.render();

      const topicsBarElement = document.getElementById("topics-bar");
      const buttons = topicsBarElement?.querySelectorAll(".topic-button") || [];
      // Should only count "testing" once
      expect(buttons.length).toBe(2); // "all" + "testing"
    });

    it("should handle case-insensitive topic matching", () => {
      const posts = [createMockBlogPost({ id: "post-1", topics: ["Testing"] })];
      topicsBar.setPosts(posts);
      topicsBar.setSelectedTopic("testing");

      const topicsBarElement = document.getElementById("topics-bar");
      const buttons = topicsBarElement?.querySelectorAll(".topic-button") || [];
      const testingButton = buttons[1] as HTMLButtonElement;

      testingButton.click();

      const filteredPosts = mockOnFilterChange.mock.calls[0][0];
      expect(filteredPosts.length).toBe(1);
    });
  });
});
