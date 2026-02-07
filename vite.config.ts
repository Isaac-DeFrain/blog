/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync, existsSync, statSync, Dirent } from "fs";
import { join, relative, basename } from "path";
import { basePathScript } from "./src/utils/paths";

// Directories
const DIST_DIR = "dist";
const POSTS_DIR = "posts";
const WIP_POSTS_DIR = "wip";

/** Determine base path for GitHub Pages deployment
 *
 * For project repositories, GitHub Pages serves from /repo-name/
 * Extract repo name from GITHUB_REPOSITORY (format: owner/repo-name)
 *
 * @returns The base path for GitHub Pages deployment or root for local development
 */
export function getBasePath(): string {
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo) {
    const repoName = repo.split("/")[1];
    return `/${repoName}/`;
  }

  return "/";
}

const basePath = getBasePath();

/**
 * Recursively copies a directory and its contents
 *
 * @param src - Source directory path
 * @param dest - Destination directory path
 */
export function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Replaces absolute internal paths in HTML with base path prefixed paths
 * Skips external URLs (protocol-relative // or http/https)
 *
 * @param html - HTML content to process
 * @param basePath - Base path to prepend to internal paths
 * @returns HTML with base path injected into internal paths
 */
export function basePathPrefixPaths(html: string, basePath: string): string {
  // Replace absolute internal paths (href="/path" or src="/path")
  return html.replace(/(href|src)="\/([^"]*)"/g, (match, attr, path) => {
    if (path.startsWith("/") || path.startsWith("http")) {
      return match;
    }

    return `${attr}="${basePath}${path}"`;
  });
}

/**
 * Processes 404.html to inject base path for GitHub Pages SPA routing
 *
 * - Injects the base path as a global variable right after opening <head> tag
 * - Updates `pathSegmentsToKeep` in the redirect script
 * - Prefixes paths with the base path if needed
 *
 * @param src404 - Path to source 404.html file
 * @param dist404 - Path to destination 404.html file
 * @param basePath - Base path for the application
 */
export function process404Html(src404: string, dist404: string, basePath: string): void {
  let html = readFileSync(src404, "utf-8");
  html = html.replace("<head>", `<head>${basePathScript(basePath)}`);

  // Count non-empty segments in the base path (e.g. "/blog/" = 1 segment)
  const pathSegmentsToKeep = basePath.split("/").filter((segment) => segment.length > 0).length;
  html = html.replace(/var pathSegmentsToKeep = \d+;/, `var pathSegmentsToKeep = ${pathSegmentsToKeep};`);

  if (basePath !== "/") {
    html = basePathPrefixPaths(html, basePath);
  }

  writeFileSync(dist404, html);
}

/**
 * Generates a manifest file listing all markdown files found recursively in the posts directory.
 * Uses relative paths from postsDir (e.g. "zk/post.md") so nested posts load correctly.
 *
 * By default, returns existing manifest if present. Excludes markdown files from the
 * specified `excludeDir` if provided.
 *
 * @param postsDir - The directory to recursively search for markdown files
 * @param excludeDir - Optional directory name to exclude from the manifest (e.g. "wip")
 * @returns The manifest object with sorted files array, or null if generation failed
 */
export function generateBlogManifest(postsDir: string, excludeDir?: string): { files: string[] } | null {
  const manifestPath = join(postsDir, "manifest.json");

  if (existsSync(manifestPath)) {
    try {
      const validJson = JSON.parse(readFileSync(manifestPath, "utf-8"));
      return validJson;
    } catch (error) {
      console.warn("Failed to parse manifest, regenerating:", error);
    }
  }

  try {
    const isIncluded = (entry: Dirent) => {
      const parentDir = basename(entry.parentPath);
      return entry.isFile() && entry.name.endsWith(".md") && parentDir !== excludeDir;
    };
    const entries = readdirSync(postsDir, { withFileTypes: true, recursive: true });
    const posts = entries
      .filter(isIncluded)
      .map((entry) => relative(postsDir, join(entry.parentPath, entry.name)).replace(/\\/g, "/"))
      .sort();
    const manifest = { files: posts };

    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    return manifest;
  } catch (error) {
    console.warn("Failed to generate blog manifest:", error);
    return null;
  }
}

export default defineConfig({
  base: basePath,
  build: {
    chunkSizeWarningLimit: 1500, // 1.5 MB
  },
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "tests/", "**/*.config.ts", "**/*.d.ts", "posts/**"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  plugins: [
    //
    // Development plugins
    //
    {
      name: "serve-posts",
      /**
       * Serve posts during development
       */
      configureServer(server) {
        return () => {
          server.middlewares.use((req, res, next) => {
            const url = req.url || "";

            // Check if this is a request for a post file
            if (url.startsWith("/posts/")) {
              const filePath = join(process.cwd(), url);

              try {
                const stats = statSync(filePath);
                if (stats.isFile()) {
                  const content = readFileSync(filePath);

                  // Set appropriate content type
                  if (url.endsWith(".json")) {
                    res.setHeader("Content-Type", "application/json");
                  } else if (url.endsWith(".md")) {
                    res.setHeader("Content-Type", "text/markdown; charset=utf-8");
                  }

                  res.end(content);
                  return;
                }
              } catch (error) {
                // File doesn't exist, return 404
                res.statusCode = 404;
                res.end("Not Found");
                return;
              }
            }

            next();
          });
        };
      },
    },
    {
      name: "spa-fallback",
      /**
       * Serve index.html for all routes (SPA routing)
       */
      configureServer(server) {
        return () => {
          server.middlewares.use((req, res, next) => {
            const url = req.url || "";

            // Vite handles these
            if (
              url.startsWith("/src/") ||
              url.startsWith("/styling/") ||
              url.startsWith("/assets/") ||
              url.startsWith("/node_modules/") ||
              url.startsWith("/posts/") ||
              (url.includes(".") && !url.endsWith(".html"))
            ) {
              return next();
            }

            // For all other routes, serve index.html
            const indexHtml = readFileSync(join(process.cwd(), "index.html"), "utf-8");
            res.setHeader("Content-Type", "text/html");
            res.end(indexHtml);
          });
        };
      },
    },
    //
    // GitHub Pages Production plugins
    //
    {
      name: "inject-base-path",
      /**
       * Inject base path as a global variable so client code can access it
       */
      transformIndexHtml: {
        order: "pre",
        handler(html) {
          return html.replace("<head>", `<head>${basePathScript(basePath)}`);
        },
      },
    },
    {
      name: "copy-posts",
      /**
       * Copy blog post files to dist directory
       */
      closeBundle() {
        const srcBlogsDir = join(process.cwd(), POSTS_DIR);
        const distBlogsDir = join(process.cwd(), DIST_DIR, POSTS_DIR);

        try {
          copyDir(srcBlogsDir, distBlogsDir);
        } catch (error) {
          console.warn("Failed to copy blog files:", error);
        }
      },
    },
    {
      name: "generate-blog-manifest",
      buildStart() {
        generateBlogManifest(join(process.cwd(), POSTS_DIR), WIP_POSTS_DIR);
      },
      /**
       * Generate manifest file and write to dist directory
       */
      closeBundle() {
        const srcPostsDir = join(process.cwd(), POSTS_DIR);
        const manifest = generateBlogManifest(srcPostsDir, WIP_POSTS_DIR);

        if (manifest) {
          const distPostsDir = join(process.cwd(), DIST_DIR, POSTS_DIR);
          const manifestPath = join(distPostsDir, "manifest.json");

          mkdirSync(distPostsDir, { recursive: true });
          writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        }
      },
    },
    {
      name: "process-404",
      /**
       * Process 404.html for GitHub Pages SPA routing
       */
      closeBundle() {
        const src404 = join(process.cwd(), "404.html");
        const dist404 = join(process.cwd(), DIST_DIR, "404.html");

        try {
          process404Html(src404, dist404, basePath);
        } catch (error) {
          console.warn("Failed to process 404.html:", error);
        }
      },
    },
  ],
});
