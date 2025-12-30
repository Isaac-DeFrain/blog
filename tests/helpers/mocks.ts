/**
 * Mock data factories for tests
 */

import { vi } from "vitest";
import type { BlogPost } from "../../src/topics-bar";

/**
 * Creates a mock blog post
 */
export function createMockBlogPost(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: "test-post",
    name: "Test Post",
    date: "2024-01-15",
    file: "test-post.md",
    topics: ["testing"],
    ...overrides,
  };
}

/**
 * Creates multiple mock blog posts
 */
export function createMockBlogPosts(count: number, baseDate: string = "2024-01-15"): BlogPost[] {
  const posts: BlogPost[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    posts.push({
      id: `post-${i + 1}`,
      name: `Post ${i + 1}`,
      date: dateStr,
      file: `post-${i + 1}.md`,
      topics: i % 2 === 0 ? ["testing", "development"] : ["testing"],
    });
  }
  return posts;
}

/**
 * Creates a mock manifest response
 */
export function createMockManifest(files: string[] = ["test-post.md"]): { files: string[] } {
  return { files };
}

/**
 * Creates a mock markdown file with frontmatter
 */
export function createMockMarkdown(options: {
  name?: string;
  date?: string;
  topics?: string[];
  content?: string;
}): string {
  const name = options.name || "Test Post";
  const date = options.date || "2024-01-15";
  const topics = options.topics || ["testing"];
  const content = options.content || "# Test Post\n\nThis is test content.";

  return `---
name: ${name}
date: ${date}
topics:
${topics.map((t) => `  - ${t}`).join("\n")}
---

${content}`;
}

/**
 * Creates a mock SVG element for testing Graphviz rendering
 */
export function createMockSVGElement(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svg.appendChild(g);
  return svg;
}

/**
 * Sets up a MathJax mock for testing
 */
export function setupMathJaxMock(includeStartup: boolean = false) {
  (window as any).MathJax = {
    typesetPromise: vi.fn().mockResolvedValue(undefined),
    ...(includeStartup && {
      startup: {
        promise: Promise.resolve(),
      },
    }),
  };
}

/**
 * Sets up a mermaid mock for testing
 */
export function setupMermaidMock() {
  (window as any).mermaid = {
    run: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn(),
  };
}
