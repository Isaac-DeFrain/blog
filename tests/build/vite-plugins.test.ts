/**
 * Tests for Vite build plugins including manifest generation, base path injection,
 * 404.html processing, and file copying operations.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, unlinkSync, rmdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { generateBlogManifest, copyDir, process404Html } from "../../vite.config";
import { basePathScript } from "../../src/utils/paths";

const HTML_404 = `<!doctype html>
<html>
<head>
  <title>404</title>
</head>
<body>
  <script>
    var pathSegmentsToKeep = 0;
  </script>
</body>
</html>`;

// Post names and contents
const POST1 = "post-1.md";
const POST2 = "post-2.md";
const POST3 = "post-3.md";

const POST1_CONTENT = "# Post 1";
const POST2_CONTENT = "# Post 2";
const POST3_CONTENT = "# Post 3";

describe("Vite Plugins", () => {
  let testDir: string;
  let postsDir: string;

  beforeEach(() => {
    // Create a temporary directory for testing
    testDir = join(tmpdir(), `blog-test-${Date.now()}`);
    postsDir = join(testDir, "posts");
    mkdirSync(postsDir, { recursive: true });

    // Clean up any existing files in postsDir
    if (existsSync(postsDir)) {
      const files = readdirSync(postsDir, { withFileTypes: true });

      for (const file of files) {
        const filePath = join(postsDir, file.name);

        if (file.isDirectory()) {
          // Recursively remove directory contents
          const subFiles = readdirSync(filePath, { withFileTypes: true });

          for (const subFile of subFiles) {
            const subFilePath = join(filePath, subFile.name);

            if (subFile.isDirectory()) {
              rmdirSync(subFilePath);
            } else {
              unlinkSync(subFilePath);
            }
          }

          rmdirSync(filePath);
        } else {
          unlinkSync(filePath);
        }
      }
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      try {
        const files = readdirSync(testDir, { recursive: true, withFileTypes: true });

        for (const file of files.reverse()) {
          const filePath = join(testDir, file.name);

          if (file.isDirectory()) {
            rmdirSync(filePath);
          } else {
            unlinkSync(filePath);
          }
        }

        rmdirSync(testDir);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe("manifest generation", () => {
    it("should generate manifest with all posts", () => {
      // Create posts
      writeFileSync(join(postsDir, POST1), POST1_CONTENT);
      writeFileSync(join(postsDir, POST2), POST2_CONTENT);
      writeFileSync(join(postsDir, POST3), POST3_CONTENT);
      writeFileSync(join(postsDir, "not-a-blog.txt"), "Not a blog");

      // Verify manifest
      const manifest = generateBlogManifest(postsDir);
      expect(manifest).not.toBeNull();
      expect(manifest?.files).toEqual([POST1, POST2, POST3]);
      expect(manifest?.files).not.toContain("not-a-blog.txt");

      // Verify path
      const manifestPath = join(postsDir, "manifest.json");
      expect(existsSync(manifestPath)).toBe(true);

      // Verify content
      const manifestContent = JSON.parse(readFileSync(manifestPath, "utf-8"));
      expect(manifestContent.files).toEqual([POST1, POST2, POST3]);
    });

    it("should sort files alphabetically", () => {
      writeFileSync(join(postsDir, "z-post.md"), "# Z Post");
      writeFileSync(join(postsDir, "a-post.md"), "# A Post");
      writeFileSync(join(postsDir, "m-post.md"), "# M Post");

      const manifest = generateBlogManifest(postsDir);
      expect(manifest?.files).toEqual(["a-post.md", "m-post.md", "z-post.md"]);
    });

    it("should handle empty blogs directory", () => {
      const manifest = generateBlogManifest(postsDir);
      expect(manifest?.files).toEqual([]);
    });

    it("should skip directories", () => {
      mkdirSync(join(postsDir, "subdir"));
      writeFileSync(join(postsDir, POST1), POST1_CONTENT);

      const manifest = generateBlogManifest(postsDir);
      expect(manifest?.files).toEqual([POST1]);
      expect(manifest?.files).not.toContain("subdir");
    });

    it("should include nested posts with relative path", () => {
      writeFileSync(join(postsDir, POST1), POST1_CONTENT);

      const subdir = "subdir";
      const nestedPost = "nested-post.md";
      mkdirSync(join(postsDir, subdir), { recursive: true });
      writeFileSync(join(postsDir, subdir, nestedPost), "# Nested Post");

      const manifest = generateBlogManifest(postsDir);
      expect(manifest).not.toBeNull();
      expect(manifest?.files).toContain(POST1);
      expect(manifest?.files).toContain(join(subdir, nestedPost));
    });

    it("should exclude markdown files in excluded subdirectory", () => {
      // Create included posts
      writeFileSync(join(postsDir, "published-post-1.md"), "# Published Post 1");
      writeFileSync(join(postsDir, "published-post-2.md"), "# Published Post 2");

      // Create excluded subdirectory with markdown files
      const excluded = "excluded";
      const excludedDir = join(postsDir, excluded);
      mkdirSync(excludedDir, { recursive: true });
      writeFileSync(join(excludedDir, "excluded-post-1.md"), "# Excluded Post 1");
      writeFileSync(join(excludedDir, "excluded-post-2.md"), "# Excluded Post 2");

      // Generate manifest with excluded dir
      const manifest = generateBlogManifest(postsDir, excluded);

      // Verify only published posts are included
      expect(manifest).not.toBeNull();
      expect(manifest?.files).toEqual(["published-post-1.md", "published-post-2.md"]);
      expect(manifest?.files).not.toContain("excluded-post-1.md");
      expect(manifest?.files).not.toContain("excluded-post-2.md");
    });
  });

  describe("base path injection", () => {
    it("should inject compile-time root base path for custom domain", () => {
      const html = "<head><title>Test</title></head><body>Content</body>";
      const modifiedHtml = html.replace("<head>", `<head>${basePathScript("/")}`);

      expect(modifiedHtml).toContain('var b="/"');
      expect(modifiedHtml).toContain("window.__BASE_PATH__=b");
      expect(modifiedHtml).not.toContain(".github.io");
      expect(modifiedHtml).toContain("<head>");
    });

    it("should inject compile-time project Pages base path", () => {
      const html = "<head><title>Test</title></head><body>Content</body>";
      const modifiedHtml = html.replace("<head>", `<head>${basePathScript("/blog/")}`);

      expect(modifiedHtml).toContain('var b="/blog/"');
      expect(modifiedHtml).toContain("window.__BASE_PATH__=b");
      expect(modifiedHtml).not.toContain(".github.io");
    });
  });

  describe("404 processing", () => {
    it("should inject compile-time root base path for custom domain", () => {
      const src404 = join(testDir, "404.html");
      const dist404 = join(testDir, "404-processed.html");

      writeFileSync(src404, HTML_404);
      process404Html(src404, dist404, { basePath: "/", pathSegmentsToKeep: 0 });

      const modifiedHtml = readFileSync(dist404, "utf-8");

      expect(modifiedHtml).toContain('var b="/"');
      expect(modifiedHtml).toContain("window.__BASE_PATH__=b");
      expect(modifiedHtml).toContain("var pathSegmentsToKeep = 0;");
      expect(modifiedHtml).not.toContain(".github.io");
    });

    it("should inject compile-time project Pages base path", () => {
      const src404 = join(testDir, "404-project.html");
      const dist404 = join(testDir, "404-project-processed.html");

      writeFileSync(src404, HTML_404);
      process404Html(src404, dist404, { basePath: "/blog/", pathSegmentsToKeep: 1 });

      const modifiedHtml = readFileSync(dist404, "utf-8");

      expect(modifiedHtml).toContain('var b="/blog/"');
      expect(modifiedHtml).toContain("window.__BASE_PATH__=b");
      expect(modifiedHtml).toContain("var pathSegmentsToKeep = 1;");
      expect(modifiedHtml).not.toContain(".github.io");
    });
  });

  describe("blog post file management", () => {
    it("should copy posts to dist directory", () => {
      const srcDir = postsDir;
      const distDir = join(testDir, "dist", "posts");

      writeFileSync(join(srcDir, POST1), POST1_CONTENT);
      writeFileSync(join(srcDir, POST2), POST2_CONTENT);
      copyDir(srcDir, distDir);

      expect(existsSync(join(distDir, POST1))).toBe(true);
      expect(existsSync(join(distDir, POST2))).toBe(true);

      const copiedContent1 = readFileSync(join(distDir, POST1), "utf-8");
      expect(copiedContent1).toBe(POST1_CONTENT);

      const copiedContent2 = readFileSync(join(distDir, POST2), "utf-8");
      expect(copiedContent2).toBe(POST2_CONTENT);
    });

    it("should handle recursive directory copying", () => {
      const srcDir = postsDir;
      const distDir = join(testDir, "dist", "posts");

      // Create nested structure
      const subDir = join(srcDir, "subdir");
      mkdirSync(subDir, { recursive: true });
      writeFileSync(join(subDir, "nested-post.md"), "# Nested Post");

      copyDir(srcDir, distDir);
      expect(existsSync(join(distDir, "subdir", "nested-post.md"))).toBe(true);
    });
  });

  describe("manifest validation", () => {
    it("should handle existing valid manifest", () => {
      const manifestPath = join(postsDir, "manifest.json");
      const existingManifest = { files: [POST1, POST2] };
      writeFileSync(manifestPath, JSON.stringify(existingManifest, null, 2));

      // Generate manifest - should return existing one
      const manifest = generateBlogManifest(postsDir);
      expect(manifest).toEqual(existingManifest);
    });

    it("should regenerate invalid manifest", () => {
      const manifestPath = join(postsDir, "manifest.json");
      writeFileSync(manifestPath, "invalid json{");
      writeFileSync(join(postsDir, POST1), POST1_CONTENT);

      // Generate manifest - should regenerate due to invalid JSON
      const manifest = generateBlogManifest(postsDir);
      expect(manifest?.files).toEqual([POST1]);

      // Verify manifest file was regenerated
      const newManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      expect(newManifest.files).toEqual([POST1]);
    });
  });
});
