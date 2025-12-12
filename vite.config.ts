import { defineConfig } from "vite";
import { readFileSync } from "fs";
import { join } from "path";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1000, // Adjust warning threshold to 1000 kB (1 MB)
  },
  plugins: [
    {
      name: "spa-fallback",
      configureServer(server) {
        // Serve index.html for all routes (SPA routing)
        return () => {
          server.middlewares.use((req, res, next) => {
            const url = req.url || "";

            // Skip static assets and files with extensions (let Vite handle them)
            if (
              url.startsWith("/src/") ||
              url.startsWith("/styling/") ||
              url.startsWith("/assets/") ||
              url.startsWith("/node_modules/") ||
              (url.includes(".") && !url.endsWith(".html"))
            ) {
              return next();
            }

            // For all other routes (including root and blog post routes), serve index.html
            const indexHtml = readFileSync(
              join(process.cwd(), "index.html"),
              "utf-8",
            );
            res.setHeader("Content-Type", "text/html");
            res.end(indexHtml);
          });
        };
      },
    },
  ],
});
