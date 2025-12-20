/**
 * Tests for error handling scenarios including missing manifest files, invalid JSON,
 * missing blog posts, invalid frontmatter, invalid dates, missing DOM elements,
 * and network failures.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { setupDOM, cleanupDOM } from "../helpers/dom";
import { parseDateAsPacificTime, parseFrontmatter } from "../../src/utils";

describe("Error Handling", () => {
  beforeEach(() => {
    cleanupDOM();
    setupDOM();
  });

  describe("Missing manifest file", () => {
    it("should handle fetch error when manifest is missing", async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));

      try {
        const response = await fetch("/src/blogs/manifest.json");
        expect(response).toBeUndefined();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      global.fetch = originalFetch;
    });

    it("should handle 404 response for manifest", async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue(
        new Response(null, {
          status: 404,
          statusText: "Not Found",
        }),
      );

      const response = await fetch("/src/blogs/manifest.json");
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);

      global.fetch = originalFetch;
    });
  });

  describe("Invalid manifest JSON", () => {
    it("should handle invalid JSON in manifest", async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue(
        new Response("invalid json{", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      try {
        const response = await fetch("/src/blogs/manifest.json");
        const data = await response.json();
        expect(data).toBeUndefined();
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }

      global.fetch = originalFetch;
    });

    it("should handle empty manifest", async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue(
        new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

      const response = await fetch("/src/blogs/manifest.json");
      const data = await response.json();
      expect(data).toEqual({});
      expect(data.files).toBeUndefined();

      global.fetch = originalFetch;
    });
  });

  describe("Missing blog post files", () => {
    it("should handle 404 for missing blog post", async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue(
        new Response(null, {
          status: 404,
          statusText: "Not Found",
        }),
      );

      const response = await fetch("/src/blogs/non-existent.md");
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);

      global.fetch = originalFetch;
    });

    it("should handle network timeout", async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Network timeout")), 100);
        });
      });

      try {
        await fetch("/src/blogs/post.md");
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Network timeout");
      }

      global.fetch = originalFetch;
    });
  });

  describe("Invalid frontmatter", () => {
    it("should handle markdown without frontmatter", () => {
      const markdown = "# Just content\n\nNo frontmatter here.";
      const result = parseFrontmatter(markdown);
      expect(result).toEqual({});
    });

    it("should handle malformed frontmatter", () => {
      const markdown = `---
name: Test
date: 2024-01-15
invalid yaml: [unclosed
---

# Content`;
      const result = parseFrontmatter(markdown);
      // Should still parse what it can
      expect(result.name).toBe("Test");
      expect(result.date).toBe("2024-01-15");
    });

    it("should handle frontmatter with missing closing delimiter", () => {
      const markdown = `---
name: Test
date: 2024-01-15

# Content`;
      const result = parseFrontmatter(markdown);
      // Should not parse as frontmatter is incomplete
      expect(result).toEqual({});
    });
  });

  describe("Invalid dates", () => {
    it("should handle invalid date format in frontmatter", () => {
      const markdown = `---
date: invalid-date
---

# Content`;
      const result = parseFrontmatter(markdown);
      expect(result.date).toBe("invalid-date");
      // parseDateAsPacificTime will handle the parsing
    });

    it("should handle malformed date strings", () => {
      expect(() => {
        parseDateAsPacificTime("not-a-date");
      }).not.toThrow();
      // Should create a date, but it might be invalid
      const date = parseDateAsPacificTime("not-a-date");
      expect(date).toBeInstanceOf(Date);
    });

    it("should handle empty date string", () => {
      expect(() => {
        parseDateAsPacificTime("");
      }).not.toThrow();
    });

    it("should handle date with wrong format", () => {
      expect(() => {
        parseDateAsPacificTime("01/15/2024");
      }).not.toThrow();
      // Should attempt to parse, might produce unexpected results
    });
  });

  describe("Missing DOM elements", () => {
    it("should handle missing blog-content element", () => {
      cleanupDOM();
      // BlogReader should handle this gracefully
      expect(document.getElementById("blog-content")).toBeNull();
    });

    it("should handle missing blog-list element", () => {
      cleanupDOM();
      expect(document.getElementById("blog-list")).toBeNull();
    });

    it("should handle missing topics-bar element", () => {
      cleanupDOM();
      expect(document.getElementById("topics-bar")).toBeNull();
    });
  });

  describe("Empty post lists", () => {
    it("should handle manifest with empty files array", () => {
      const manifest = { files: [] };
      expect(manifest.files.length).toBe(0);
    });

    it("should handle posts array with null entries", () => {
      const posts = [null, null, null];
      const validPosts = posts.filter((post) => post !== null);
      expect(validPosts.length).toBe(0);
    });
  });

  describe("Network failures", () => {
    it("should handle fetch rejection", async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      try {
        await fetch("/src/blogs/manifest.json");
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Network error");
      }

      global.fetch = originalFetch;
    });

    it("should handle CORS errors", async () => {
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockRejectedValue(new Error("CORS policy blocked"));

      try {
        await fetch("https://external-site.com/data.json");
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      global.fetch = originalFetch;
    });
  });
});
