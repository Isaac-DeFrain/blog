/**
 * @module utils/paths
 *
 * Base path utilities for GitHub Pages deployments.
 */

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
 * Creates a script tag to inject the base path as a global variable.
 *
 * Uses JSON.stringify to properly escape the base path string and prevent
 * XSS vulnerabilities if the base path contains special characters.
 *
 * @param basePath - The base path to inject
 * @returns Script tag string
 */
export function basePathScript(basePath: string): string {
  return `<script>window.__BASE_PATH__ = ${JSON.stringify(basePath)};</script>`;
}

/**
 * Creates a script tag that detects and injects the base path at runtime.
 *
 * Supports both github.io project Pages and custom-domain root deployments
 * from a single build artifact.
 *
 * @returns Script tag string
 */
export function basePathDetectionScript(): string {
  return `<script>(function(){var b="/";if(location.hostname.endsWith(".github.io")){var s=location.pathname.split("/").filter(Boolean)[0];if(s)b="/"+s+"/";}window.__BASE_PATH__=b;var l=document.createElement("link");l.rel="icon";l.type="image/x-icon";l.href=b+"assets/favicon.ico";document.head.appendChild(l);})();</script>`;
}

/**
 * Creates a script snippet that sets pathSegmentsToKeep based on hostname.
 *
 * @returns JavaScript statement string
 */
export function pathSegmentsToKeepScript(): string {
  return `var pathSegmentsToKeep = location.hostname.endsWith(".github.io") ? 1 : 0;`;
}
