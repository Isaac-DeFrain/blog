import { defineConfig } from "vite";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";

/** Determine base path for GitHub Pages deployment
 *
 * For project repositories, GitHub Pages serves from /repo-name/
 * Extract repo name from GITHUB_REPOSITORY (format: owner/repo-name)
 *
 * @returns The base path for GitHub Pages deployment or root for local development
 */
function getBasePath(): string {
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo) {
    const repoName = repo.split("/")[1];
    return `/${repoName}/`;
  }

  return "/";
}

const basePath = getBasePath();

/**
 * Generates a manifest file listing all markdown files in the blogs directory
 *
 * @param blogsDir - The directory containing blog markdown files
 * @returns The manifest object with files array
 */
function generateBlogManifest(blogsDir: string): { files: string[] } | null {
  const manifestPath = join(blogsDir, "manifest.json");

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
  plugins: [
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
    {
      name: "inject-base-path",
      transformIndexHtml: {
        order: "pre",
        handler(html) {
          // Inject base path as a global variable so client code can access it
          // Insert right after the opening <head> tag to ensure it's available before any module scripts
          const basePathScript = `<script>window.__BASE_PATH__ = ${JSON.stringify(basePath)};</script>`;
          return html.replace("<head>", `<head>${basePathScript}`);
        },
      },
    },
    {
      name: "copy-blog-files",
      closeBundle() {
        // Copy blog post files to dist directory so they're available at runtime
        const srcBlogsDir = join(process.cwd(), "src", "blogs");
        const distBlogsDir = join(process.cwd(), "dist", "src", "blogs");

        try {
          // Recursively copy directory
          function copyDir(src: string, dest: string) {
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

          copyDir(srcBlogsDir, distBlogsDir);
          console.log("Blog files copied to dist directory");
        } catch (error) {
          console.warn("Failed to copy blog files:", error);
        }
      },
    },
    {
      name: "generate-blog-manifest",
      buildStart() {
        // Generate manifest in source directory for development
        generateBlogManifest(join(process.cwd(), "src", "blogs"));
      },
      closeBundle() {
        // Generate a manifest file listing all markdown files in the blogs directory
        const srcBlogsDir = join(process.cwd(), "src", "blogs");
        const distBlogsDir = join(process.cwd(), "dist", "src", "blogs");

        // Generate manifest from source directory
        const manifest = generateBlogManifest(srcBlogsDir);
        if (manifest) {
          // Write manifest to dist directory
          mkdirSync(distBlogsDir, { recursive: true });
          const manifestPath = join(distBlogsDir, "manifest.json");
          writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
          console.log("Blog manifest generated");
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
          let html = readFileSync(src404, "utf-8");

          // Inject base path as a global variable right after opening <head> tag
          const basePathScript = `<script>window.__BASE_PATH__ = ${JSON.stringify(basePath)};</script>`;
          html = html.replace("<head>", `<head>${basePathScript}`);

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
        } catch (error) {
          console.warn("Failed to process 404.html:", error);
        }
      },
    },
  ],
});
