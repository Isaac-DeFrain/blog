/**
 * Tests for Vite build plugins including manifest generation, base path injection,
 * 404.html processing, and file copying operations.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, unlinkSync, rmdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { getBasePath, generateBlogManifest, copyDir, process404Html } from "../../vite.config";
import { basePathScript } from "../../src/utils";

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
      writeFileSync(join(postsDir, "post-1.md"), "# Post 1");
      writeFileSync(join(postsDir, "post-2.md"), "# Post 2");
      writeFileSync(join(postsDir, "post-3.md"), "# Post 3");
      writeFileSync(join(postsDir, "not-a-blog.txt"), "Not a blog");

      // Verify manifest
      const manifest = generateBlogManifest(postsDir);
      expect(manifest).not.toBeNull();
      expect(manifest?.files).toEqual(["post-1.md", "post-2.md", "post-3.md"]);
      expect(manifest?.files).not.toContain("not-a-blog.txt");

      // Verify path
      const manifestPath = join(postsDir, "manifest.json");
      expect(existsSync(manifestPath)).toBe(true);

      // Verify content
      const manifestContent = JSON.parse(readFileSync(manifestPath, "utf-8"));
      expect(manifestContent.files).toEqual(["post-1.md", "post-2.md", "post-3.md"]);
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
      writeFileSync(join(postsDir, "post-1.md"), "# Post 1");

      const manifest = generateBlogManifest(postsDir);
      expect(manifest?.files).toEqual(["post-1.md"]);
      expect(manifest?.files).not.toContain("subdir");
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
    let originalGithubRepository: string | undefined;

    beforeEach(() => {
      originalGithubRepository = process.env.GITHUB_REPOSITORY;
    });

    afterEach(() => {
      if (originalGithubRepository !== undefined) {
        process.env.GITHUB_REPOSITORY = originalGithubRepository;
      } else {
        delete process.env.GITHUB_REPOSITORY;
      }
    });

    it("should determine base path from GITHUB_REPOSITORY", () => {
      const repo = "owner/repo-name";
      process.env.GITHUB_REPOSITORY = repo;

      const basePath = getBasePath();
      const basePathExpected = repo ? `/${repo.split("/")[1]}/` : "/";
      expect(basePath).toBe(basePathExpected);
    });

    it("should use root path when GITHUB_REPOSITORY is not set", () => {
      delete process.env.GITHUB_REPOSITORY;

      // After deleting GITHUB_REPOSITORY, basePath should be "/"
      const basePath = getBasePath();
      const basePathExpected = "/";
      expect(basePath).toBe(basePathExpected);
    });

    it("should inject base path script into HTML", () => {
      const basePath = getBasePath();
      const html = "<head><title>Test</title></head><body>Content</body>";
      const modifiedHtml = html.replace("<head>", `<head>${basePathScript(basePath)}`);

      expect(modifiedHtml).toContain(`window.__BASE_PATH__ = "${basePath}"`);
      expect(modifiedHtml).toContain("<head>");
    });
  });

  describe("404 processing", () => {
    it("should inject base path into 404.html", () => {
      const basePath = getBasePath();
      const src404 = join(testDir, "404.html");
      const dist404 = join(testDir, "404-processed.html");

      const html = `<!doctype html>
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

      writeFileSync(src404, html);

      // Process using the actual function
      process404Html(src404, dist404, basePath);

      const modifiedHtml = readFileSync(dist404, "utf-8");
      const pathSegmentsToKeep = basePath.split("/").filter((segment) => segment.length > 0).length;

      expect(modifiedHtml).toContain(`window.__BASE_PATH__ = "${basePath}"`);
      expect(modifiedHtml).toContain(`var pathSegmentsToKeep = ${pathSegmentsToKeep};`);
    });

    it("should handle root base path in 404.html", () => {
      const basePath = "/";
      const src404 = join(testDir, "404-root.html");
      const dist404 = join(testDir, "404-root-processed.html");

      const html = `<!doctype html>
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

      writeFileSync(src404, html);

      // Process using the actual function
      process404Html(src404, dist404, basePath);

      const modifiedHtml = readFileSync(dist404, "utf-8");
      expect(modifiedHtml).toContain(`window.__BASE_PATH__ = "/"`);
    });
  });

  describe("blog post file management", () => {
    it("should copy posts to dist directory", () => {
      const srcDir = postsDir;
      const distDir = join(testDir, "dist", "posts");

      // Create source files
      writeFileSync(join(srcDir, "post-1.md"), "# Post 1");
      writeFileSync(join(srcDir, "post-2.md"), "# Post 2");

      // Copy using the actual function
      copyDir(srcDir, distDir);

      // Verify files were copied
      expect(existsSync(join(distDir, "post-1.md"))).toBe(true);
      expect(existsSync(join(distDir, "post-2.md"))).toBe(true);

      // Verify content
      const copiedContent = readFileSync(join(distDir, "post-1.md"), "utf-8");
      expect(copiedContent).toBe("# Post 1");
    });

    it("should handle recursive directory copying", () => {
      const srcDir = postsDir;
      const distDir = join(testDir, "dist", "posts");

      // Create nested structure
      const subDir = join(srcDir, "subdir");
      mkdirSync(subDir, { recursive: true });
      writeFileSync(join(subDir, "nested-post.md"), "# Nested Post");

      // Copy using the actual function
      copyDir(srcDir, distDir);

      // Verify nested file was copied
      expect(existsSync(join(distDir, "subdir", "nested-post.md"))).toBe(true);
    });
  });

  describe("manifest validation", () => {
    it("should handle existing valid manifest", () => {
      const manifestPath = join(postsDir, "manifest.json");
      const existingManifest = { files: ["post-1.md", "post-2.md"] };
      writeFileSync(manifestPath, JSON.stringify(existingManifest, null, 2));

      // Generate manifest - should return existing one
      const manifest = generateBlogManifest(postsDir);

      expect(manifest).toEqual(existingManifest);
    });

    it("should regenerate invalid manifest", () => {
      const manifestPath = join(postsDir, "manifest.json");
      writeFileSync(manifestPath, "invalid json{");
      writeFileSync(join(postsDir, "post-1.md"), "# Post 1");

      // Generate manifest - should regenerate due to invalid JSON
      const manifest = generateBlogManifest(postsDir);

      expect(manifest?.files).toEqual(["post-1.md"]);

      // Verify manifest file was regenerated
      const newManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      expect(newManifest.files).toEqual(["post-1.md"]);
    });
  });
});
