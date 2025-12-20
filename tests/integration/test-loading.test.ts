/**
 * Integration test that verifies all blog posts load correctly including manifest validation,
 * file existence checks, and frontmatter validation. This is a Vitest version of test-loading.ts.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { parseFrontmatter } from "../../src/utils";
import { isValidDate } from "../common";

describe("Blog Post Loading Integration Test", () => {
  const srcBlogsDir = join(process.cwd(), "src", "blogs");
  const distBlogsDir = join(process.cwd(), "dist", "src", "blogs");
  const manifestPath = join(distBlogsDir, "manifest.json");

  let originalConsoleError: typeof console.error;
  let originalConsoleWarn: typeof console.warn;

  beforeEach(() => {
    // Suppress expected console errors and warnings during tests
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  beforeAll(() => {
    // Check if dist directory exists (build must be run first)
    if (!existsSync(distBlogsDir)) {
      throw new Error(`Dist directory not found: ${distBlogsDir}. Please run 'npm run build' first.`);
    }

    // Check if manifest exists
    if (!existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}. The build may have failed.`);
    }
  });

  describe("Manifest validation", () => {
    it("should have a valid manifest file", () => {
      expect(existsSync(manifestPath)).toBe(true);

      const manifestContent = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent) as { files: string[] };

      expect(manifest).toBeDefined();
      expect(manifest.files).toBeInstanceOf(Array);
    });

    it("should include all source markdown files in manifest", () => {
      const manifestContent = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent) as { files: string[] };

      const entries = readdirSync(srcBlogsDir, { withFileTypes: true });
      const sourceFiles = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map((entry) => entry.name)
        .sort();

      const manifestFiles = new Set(manifest.files);

      for (const sourceFile of sourceFiles) {
        expect(manifestFiles.has(sourceFile)).toBe(true);
      }
    });

    it("should not list non-existent files in manifest", () => {
      const manifestContent = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent) as { files: string[] };

      const entries = readdirSync(srcBlogsDir, { withFileTypes: true });
      const sourceFiles = new Set(
        entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md")).map((entry) => entry.name),
      );

      for (const manifestFile of manifest.files) {
        expect(sourceFiles.has(manifestFile)).toBe(true);
      }
    });
  });

  describe("Blog post files", () => {
    it("should have all post files in dist directory", () => {
      const manifestContent = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent) as { files: string[] };

      for (const filename of manifest.files) {
        const distFilePath = join(distBlogsDir, filename);
        expect(existsSync(distFilePath)).toBe(true);
      }
    });

    it("should have all post files in source directory", () => {
      const manifestContent = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent) as { files: string[] };

      for (const filename of manifest.files) {
        const srcFilePath = join(srcBlogsDir, filename);
        expect(existsSync(srcFilePath)).toBe(true);
      }
    });
  });

  describe("Frontmatter validation", () => {
    it("should parse frontmatter for all posts", () => {
      const manifestContent = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent) as { files: string[] };

      for (const filename of manifest.files) {
        const distFilePath = join(distBlogsDir, filename);
        const markdown = readFileSync(distFilePath, "utf-8");
        const frontmatter = parseFrontmatter(markdown);

        expect(frontmatter).toBeDefined();
      }
    });

    it("should have valid date format in frontmatter", () => {
      const manifestContent = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent) as { files: string[] };

      for (const filename of manifest.files) {
        const distFilePath = join(distBlogsDir, filename);
        const markdown = readFileSync(distFilePath, "utf-8");
        const frontmatter = parseFrontmatter(markdown);

        if (frontmatter.date) {
          expect(isValidDate(frontmatter.date)).toBe(true);
        }
      }
    });

    it("should have name in frontmatter (warning if missing)", () => {
      const manifestContent = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent) as { files: string[] };

      for (const filename of manifest.files) {
        const distFilePath = join(distBlogsDir, filename);
        const markdown = readFileSync(distFilePath, "utf-8");
        const frontmatter = parseFrontmatter(markdown);

        // Name is recommended but not required
        if (!frontmatter.name) {
          console.warn(`${filename}: Missing 'name' in frontmatter`);
        }
      }
    });

    it("should have topics in frontmatter (warning if missing)", () => {
      const manifestContent = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent) as { files: string[] };

      for (const filename of manifest.files) {
        const distFilePath = join(distBlogsDir, filename);
        const markdown = readFileSync(distFilePath, "utf-8");
        const frontmatter = parseFrontmatter(markdown);

        // Topics are recommended but not required
        if (!frontmatter.topics || frontmatter.topics.length === 0) {
          console.warn(`${filename}: No topics specified in frontmatter`);
        }
      }
    });

    it("should have content after frontmatter", () => {
      const manifestContent = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent) as { files: string[] };

      for (const filename of manifest.files) {
        const distFilePath = join(distBlogsDir, filename);
        const markdown = readFileSync(distFilePath, "utf-8");
        const markdownWithoutFrontmatter = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");

        // Content is recommended but not required
        if (markdownWithoutFrontmatter.trim().length === 0) {
          console.warn(`${filename}: No content found after frontmatter`);
        }
      }
    });
  });
});
