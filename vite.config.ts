/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";
import { basePathScript } from "./src/utils";

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
 * Processes 404.html to inject base path for GitHub Pages SPA routing
 *
 * @param src404 - Path to source 404.html file
 * @param dist404 - Path to destination 404.html file
 * @param basePath - Base path for the application
 */
export function process404Html(src404: string, dist404: string, basePath: string): void {
  let html = readFileSync(src404, "utf-8");

  // Inject base path as a global variable right after opening <head> tag
  html = html.replace("<head>", `<head>${basePathScript(basePath)}`);

  // Count non-empty segments in the base path (e.g. "/blog/" = 1 segment)
  const pathSegmentsToKeep = basePath.split("/").filter((segment) => segment.length > 0).length;

  // Update pathSegmentsToKeep in the redirect script
  html = html.replace(/var pathSegmentsToKeep = \d+;/, `var pathSegmentsToKeep = ${pathSegmentsToKeep};`);

  // Only replace paths if base path is not root
  // Ensures assets load correctly with the base path
  if (basePath !== "/") {
    // Replace absolute internal paths (href="/path" or src="/path")
    // but skip external URLs (starting with // or http)
    html = html.replace(/(href|src)="\/([^"]*)"/g, (match, attr, path) => {
      // Don't modify external URLs (protocol-relative // or http/https)
      if (path.startsWith("/") || path.startsWith("http")) {
        return match;
      }

      return `${attr}="${basePath}${path}"`;
    });
  }

  writeFileSync(dist404, html);
}

/**
 * Generates a manifest file listing all markdown files in the blogs directory
 * Only generates if the manifest doesn't already exist
 *
 * @param blogsDir - The directory containing blog markdown files
 * @returns The manifest object with files array, or null if generation failed
 */
export function generateBlogManifest(blogsDir: string): { files: string[] } | null {
  const manifestPath = join(blogsDir, "manifest.json");

  // Check if manifest already exists
  if (existsSync(manifestPath)) {
    try {
      // Verify it's valid JSON and return it
      const existingManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
      return existingManifest;
    } catch (error) {
      // If existing manifest is invalid, regenerate it
      console.warn("Existing manifest is invalid, regenerating:", error);
    }
  }

  try {
    const entries = readdirSync(blogsDir, { withFileTypes: true });
    const markdownFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort();

    const manifest = {
      files: markdownFiles,
    };

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
    chunkSizeWarningLimit: 1000, // 1 MB
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
      configureServer(server) {
        // Serve posts directory files during development
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
      configureServer(server) {
        // Serve index.html for all routes (SPA routing)
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
      transformIndexHtml: {
        order: "pre",
        handler(html) {
          // Inject base path as a global variable so client code can access it
          // Insert right after the opening <head> tag to ensure it's available before any module scripts
          return html.replace("<head>", `<head>${basePathScript(basePath)}`);
        },
      },
    },
    {
      name: "copy-blog-files",
      closeBundle() {
        // Copy blog post files to dist directory so they're available at runtime
        const srcBlogsDir = join(process.cwd(), "posts");
        const distBlogsDir = join(process.cwd(), "dist", "posts");

        try {
          copyDir(srcBlogsDir, distBlogsDir);
          console.debug("Blog files copied to dist directory");
        } catch (error) {
          console.warn("Failed to copy blog files:", error);
        }
      },
    },
    {
      name: "generate-blog-manifest",
      buildStart() {
        // Generate manifest in source directory for development
        generateBlogManifest(join(process.cwd(), "posts"));
      },
      closeBundle() {
        // Generate a manifest file listing all markdown files in the blogs directory
        const srcBlogsDir = join(process.cwd(), "posts");
        const distBlogsDir = join(process.cwd(), "dist", "posts");

        // Generate manifest from source directory
        const manifest = generateBlogManifest(srcBlogsDir);

        if (manifest) {
          // Write manifest to dist directory
          mkdirSync(distBlogsDir, { recursive: true });

          const manifestPath = join(distBlogsDir, "manifest.json");
          writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

          console.debug("Blog manifest generated");
        }
      },
    },
    {
      name: "process-404",
      closeBundle() {
        // Process 404.html to inject base path for GitHub Pages SPA routing
        // When GitHub Pages serves 404.html, the URL is still the original path
        // So we make 404.html load the SPA, which will read the pathname and route accordingly
        const src404 = join(process.cwd(), "404.html");
        const dist404 = join(process.cwd(), "dist", "404.html");

        try {
          process404Html(src404, dist404, basePath);
        } catch (error) {
          console.warn("Failed to process 404.html:", error);
        }
      },
    },
  ],
});
