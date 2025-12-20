/**
 * Tests for invalid input handling including malformed dates, XSS attempts,
 * special characters in filenames, very long content, and Unicode edge cases.
 */
import { describe, it, expect } from "vitest";
import { parseDateAsPacificTime, formatDateAsPacificTime, escapeHtml, parseFrontmatter } from "../../src/utils";

describe("Invalid Inputs", () => {
  describe("Malformed dates", () => {
    it("should handle date with invalid month", () => {
      const date = parseDateAsPacificTime("2024-13-15");
      expect(date).toBeInstanceOf(Date);
      // Invalid month will wrap around or be adjusted
    });

    it("should handle date with invalid day", () => {
      const date = parseDateAsPacificTime("2024-02-30");
      expect(date).toBeInstanceOf(Date);
      // Invalid day will be adjusted
    });

    it("should handle date with non-numeric values", () => {
      const date = parseDateAsPacificTime("abcd-ef-gh");
      expect(date).toBeInstanceOf(Date);
      // NaN values will create an invalid date
    });

    it("should handle very old dates", () => {
      const date = parseDateAsPacificTime("1900-01-01");
      expect(date.getFullYear()).toBe(1900);
    });

    it("should handle future dates", () => {
      const date = parseDateAsPacificTime("2100-12-31");
      expect(date.getFullYear()).toBe(2100);
    });
  });

  describe("XSS attempts in frontmatter", () => {
    it("should parse frontmatter with script tags in name", () => {
      const markdown = `---
name: <script>alert('XSS')</script>
date: 2024-01-15
---

# Content`;
      const result = parseFrontmatter(markdown);
      expect(result.name).toBe("<script>alert('XSS')</script>");
      // The name is parsed as-is, escaping should happen when rendering
    });

    it("should parse frontmatter with event handlers in name", () => {
      const markdown = `---
name: Test<img src=x onerror="alert(1)">
date: 2024-01-15
---

# Content`;
      const result = parseFrontmatter(markdown);
      expect(result.name).toContain("onerror");
      // Should be escaped when rendered
    });

    it("should handle javascript: protocol in name", () => {
      const markdown = `---
name: javascript:alert('XSS')
date: 2024-01-15
---

# Content`;
      const result = parseFrontmatter(markdown);
      expect(result.name).toContain("javascript:");
    });
  });

  describe("XSS prevention in escapeHtml", () => {
    it("should escape script tags", () => {
      const input = '<script>alert("XSS")</script>';
      const escaped = escapeHtml(input);
      expect(escaped).not.toContain("<script>");
      expect(escaped).toContain("&lt;");
      expect(escaped).toContain("&gt;");
    });

    it("should escape event handlers", () => {
      const input = '<img src=x onerror="alert(1)">';
      const escaped = escapeHtml(input);
      // The entire HTML is escaped, so "onerror" will be present as text, not as an executable attribute
      expect(escaped).toContain("onerror");
      expect(escaped).toContain("&quot;");
      expect(escaped).toContain("&lt;");
      expect(escaped).toContain("&gt;");
      // Ensure it's not executable - the quotes should be escaped
      expect(escaped).not.toContain('onerror="');
    });

    it("should escape javascript: protocol", () => {
      const input = 'javascript:alert("XSS")';
      const escaped = escapeHtml(input);
      // Should escape quotes
      expect(escaped).toContain("&quot;");
    });

    it("should escape nested HTML", () => {
      const input = '<div><script>alert("XSS")</script></div>';
      const escaped = escapeHtml(input);
      expect(escaped).not.toContain("<script>");
      expect(escaped).not.toContain("</div>");
    });

    it("should escape HTML entities", () => {
      const input = "&lt;script&gt;";
      const escaped = escapeHtml(input);
      // Should escape the & and < >
      expect(escaped).toContain("&amp;");
    });
  });

  describe("Special characters in filenames", () => {
    it("should handle filenames with spaces", () => {
      const filename = "post with spaces.md";
      const id = filename.replace(/\.md$/, "");
      expect(id).toBe("post with spaces");
    });

    it("should handle filenames with special characters", () => {
      const filename = "post-with-special-chars-!@#$%.md";
      const id = filename.replace(/\.md$/, "");
      expect(id).toContain("!");
    });

    it("should handle unicode characters in filenames", () => {
      const filename = "post-中文.md";
      const id = filename.replace(/\.md$/, "");
      expect(id).toContain("中文");
    });
  });

  describe("Very long content", () => {
    it("should handle very long markdown content", () => {
      const longContent = "# " + "A".repeat(10000) + "\n\n" + "B".repeat(10000);
      const markdown = `---
name: Long Post
date: 2024-01-15
---

${longContent}`;
      const result = parseFrontmatter(markdown);
      expect(result.name).toBe("Long Post");
      // Should parse successfully
    });

    it("should handle very long frontmatter", () => {
      const longTopics = Array.from({ length: 1000 }, (_, i) => `topic-${i}`).join("\n  - ");
      const markdown = `---
name: Post with many topics
date: 2024-01-15
topics:
  - ${longTopics}
---

# Content`;
      const result = parseFrontmatter(markdown);
      expect(result.topics).toBeDefined();
      expect(result.topics!.length).toBe(1000);
    });
  });

  describe("Edge cases in date formatting", () => {
    it("should format invalid dates gracefully", () => {
      // parseDateAsPacificTime might create an invalid date
      const date = parseDateAsPacificTime("invalid");
      expect(date).toBeInstanceOf(Date);

      const formatted = formatDateAsPacificTime("invalid");
      // Should not throw, but might produce unexpected output
      expect(typeof formatted).toBe("string");
    });

    it("should handle dates at DST boundaries", () => {
      // March 10, 2024 is DST start
      const date1 = parseDateAsPacificTime("2024-03-10");
      expect(date1).toBeInstanceOf(Date);

      // November 3, 2024 is DST end
      const date2 = parseDateAsPacificTime("2024-11-03");
      expect(date2).toBeInstanceOf(Date);
    });
  });

  describe("Empty and null inputs", () => {
    it("should handle empty string in parseFrontmatter", () => {
      const result = parseFrontmatter("");
      expect(result).toEqual({});
    });

    it("should handle whitespace-only string", () => {
      const result = parseFrontmatter("   \n\n   ");
      expect(result).toEqual({});
    });

    it("should handle empty string in escapeHtml", () => {
      const result = escapeHtml("");
      expect(result).toBe("");
    });

    it("should handle null-like values", () => {
      // TypeScript prevents null, but test edge cases
      const result1 = escapeHtml(String(null));
      expect(result1).toBe("null");

      const result2 = escapeHtml(String(undefined));
      expect(result2).toBe("undefined");
    });
  });

  describe("Unicode and special characters", () => {
    it("should handle unicode characters in frontmatter", () => {
      const markdown = `---
name: 测试文章
date: 2024-01-15
topics:
  - 测试
---

# Content`;
      const result = parseFrontmatter(markdown);
      expect(result.name).toBe("测试文章");
      expect(result.topics).toEqual(["测试"]);
    });

    it("should handle emoji in frontmatter", () => {
      const markdown = `---
name: Post 🎉
date: 2024-01-15
---

# Content`;
      const result = parseFrontmatter(markdown);
      expect(result.name).toBe("Post 🎉");
    });

    it("should escape unicode in HTML", () => {
      const input = "测试<script>alert('XSS')</script>";
      const escaped = escapeHtml(input);
      expect(escaped).toContain("测试");
      expect(escaped).not.toContain("<script>");
    });
  });
});
