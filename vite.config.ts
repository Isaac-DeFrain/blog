import { defineConfig } from "vite";
import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
  readdirSync,
} from "fs";
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
            const indexHtml = readFileSync(
              join(process.cwd(), "index.html"),
              "utf-8"
            );
            res.setHeader("Content-Type", "text/html");
            res.end(indexHtml);
          });
        };
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
      name: "process-404",
      closeBundle() {
        // Process 404.html to inject base path for GitHub Pages SPA routing
        // When GitHub Pages serves 404.html, the URL is still the original path
        // So we make 404.html load the SPA, which will read the pathname and route accordingly
        const src404 = join(process.cwd(), "404.html");
        const dist404 = join(process.cwd(), "dist", "404.html");
        try {
          let html = readFileSync(src404, "utf-8");

          // Only replace paths if base path is not root
          // Ensures assets load correctly with the base path
          if (basePath !== "/") {
            // Replace absolute internal paths (href="/path" or src="/path")
            // but skip external URLs (starting with // or http)
            html = html.replace(
              /(href|src)="\/([^"]*)"/g,
              (match, attr, path) => {
                // Don't modify external URLs (protocol-relative // or http/https)
                if (path.startsWith("/") || path.startsWith("http")) {
                  return match;
                }

                return `${attr}="${basePath}${path}"`;
              }
            );
          }

          writeFileSync(dist404, html);
        } catch (error) {
          console.warn("Failed to process 404.html:", error);
        }
      },
    },
  ],
});
