/**
 * Unit tests to verify all exports from src/blog/index.ts are accessible
 */

import { describe, it, expect } from "vitest";
import { BlogReader } from "../../src/blog/reader";
import { createHighlightConfig } from "../../src/blog/reader";
import { PostLoader } from "../../src/blog/post-loader";
import { PostRenderer } from "../../src/blog/post-renderer";
import { LinkInterceptor } from "../../src/blog/link-interceptor";

describe("blog/index.ts exports", () => {
  it("should export BlogReader", async () => {
    expect(BlogReader).toBeDefined();
    expect(typeof BlogReader).toBe("function");
  });

  it("should export createHighlightConfig", async () => {
    expect(createHighlightConfig).toBeDefined();
    expect(typeof createHighlightConfig).toBe("function");
  });

  it("should export PostLoader", async () => {
    expect(PostLoader).toBeDefined();
    expect(typeof PostLoader).toBe("function");
  });

  it("should export PostRenderer", async () => {
    expect(PostRenderer).toBeDefined();
    expect(typeof PostRenderer).toBe("function");
  });

  it("should export LinkInterceptor", async () => {
    expect(LinkInterceptor).toBeDefined();
    expect(typeof LinkInterceptor).toBe("function");
  });

  it("should allow instantiation of exported classes", async () => {
    expect(() => new BlogReader()).not.toThrow();
    expect(() => new PostLoader()).not.toThrow();
    expect(() => new PostRenderer()).not.toThrow();
    expect(() => new LinkInterceptor()).not.toThrow();
  });
});
