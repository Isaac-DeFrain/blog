/**
 * @module utils/paths
 *
 * Base path utilities for GitHub Pages deployments.
 */

export type ResolveBuildBasePathOptions = {
  cnameExists?: boolean;
  githubRepository?: string;
  override?: string;
};

/**
 * Normalizes a base path to always start with / and end with / (except root).
 *
 * @param basePath - Raw base path string
 * @returns Normalized base path (e.g. "/blog/" or "/")
 */
export function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath === "/") {
    return "/";
  }

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

/**
 * Resolves the base path at build time for GitHub Pages deployments.
 *
 * Priority: explicit override → CNAME (custom domain) → GITHUB_REPOSITORY (project Pages) → root.
 *
 * @param options - Build environment signals
 * @returns The resolved base path (e.g. "/blog/" or "/")
 */
export function resolveBuildBasePath(options: ResolveBuildBasePathOptions = {}): string {
  const { cnameExists = false, githubRepository, override } = options;

  if (override) {
    return normalizeBasePath(override);
  }

  if (cnameExists) {
    return "/";
  }

  if (githubRepository) {
    const repoName = githubRepository.split("/")[1];
    if (repoName) {
      return `/${repoName}/`;
    }
  }

  return "/";
}

/**
 * Gets the number of path segments to keep for GitHub Pages SPA 404 redirects from a base path.
 *
 * @param basePath - The resolved base path (e.g. "/blog/" or "/")
 * @returns The number of path segments to keep
 */
export function getPathSegmentsToKeepFromBasePath(basePath: string): number {
  return basePath.split("/").filter((segment) => segment.length > 0).length;
}

/**
 * Detects the base path from the current location.
 *
 * GitHub project Pages are served from /repo-name/ on github.io hosts.
 * Custom domains and local development are served from root.
 *
 * @param hostname - The hostname to inspect
 * @param pathname - The pathname to inspect
 * @returns The base path (e.g. "/blog/" or "/")
 */
export function detectBasePath(hostname: string, pathname: string): string {
  if (hostname?.endsWith(".github.io")) {
    const firstSegment = pathname.split("/").filter((segment) => segment.length > 0)[0];
    return firstSegment ? `/${firstSegment}/` : "/";
  }

  return "/";
}

/**
 * Gets the number of path segments to keep for GitHub Pages SPA 404 redirects.
 *
 * @param hostname - The hostname to inspect
 * @returns The number of path segments to keep
 */
export function getPathSegmentsToKeep(hostname: string): number {
  if (hostname?.endsWith(".github.io")) {
    return 1;
  }

  return 0;
}

/**
 * Gets the base path for the application.
 * Uses the injected global when available, otherwise detects from the location.
 *
 * @returns The base path (e.g. "/blog/" or "/")
 */
export function getBasePath(): string {
  if (typeof window !== "undefined" && window.__BASE_PATH__) {
    return window.__BASE_PATH__;
  }

  if (typeof window !== "undefined") {
    const hostname = window.location?.hostname ?? "";
    const pathname = window.location?.pathname ?? "/";
    return detectBasePath(hostname, pathname);
  }

  return "/";
}

/**
 * Creates a script tag to inject the base path as a global variable and favicon link.
 *
 * Uses JSON.stringify to properly escape the base path string and prevent
 * XSS vulnerabilities if the base path contains special characters.
 *
 * @param basePath - The base path to inject
 * @returns Script tag string
 */
export function basePathScript(basePath: string): string {
  return `<script>(function(){var b=${JSON.stringify(basePath)};window.__BASE_PATH__=b;var l=document.createElement("link");l.rel="icon";l.type="image/x-icon";l.href=b+"assets/favicon.ico";document.head.appendChild(l);})();</script>`;
}
