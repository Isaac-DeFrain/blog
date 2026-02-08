/**
 * @module utils/paths
 *
 * Base path utilities for GitHub Pages deployments.
 */

/**
 * Gets the base path for the application.
 * This is injected by the build process for GitHub Pages deployments.
 *
 * @returns The base path (e.g. "/blog/" or "/")
 */
export function getBasePath(): string {
  return window.__BASE_PATH__ || "/";
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
