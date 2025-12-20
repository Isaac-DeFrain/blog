/**
 * Mock data factories for tests
 */

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

