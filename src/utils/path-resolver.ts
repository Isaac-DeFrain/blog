/**
 * @module utils/path-resolver
 *
 * Utility functions for resolving and parsing paths in the blog application.
 */

import { REGEX_PATTERNS } from "../constants";

/**
 * Resolves blog post paths and extracts post IDs from URLs.
 */
export class PathResolver {
  /**
   * Gets the post ID from the current URL pathname.
   *
   * Extracts the post ID from the pathname, accounting for the base path.
   * For example, "/blog/welcome" -> "welcome" (when base path is "/blog/").
   *
   * @param basePath - The base path of the application (e.g., "/blog/" or "/")
   * @returns The post ID if found, or null if on the index page
   */
  static getPostIdFromPath(basePath: string): string | null {
    // Remove the base path from the beginning
    const pathname = window.location.pathname;
    let path = pathname;

    if (basePath !== "/") {
      // Normalize both paths for comparison (remove trailing slashes)
      const normalizedBasePath = basePath.replace(/\/$/, "");
      const normalizedPathname = pathname.replace(/\/$/, "");

      if (normalizedPathname.startsWith(normalizedBasePath)) {
        // Remove the base path, keeping one leading slash
        // If pathname is exactly the base path, path will be empty
        path = pathname.slice(normalizedBasePath.length);

        // Ensure path starts with / if it's not empty
        if (path && !path.startsWith("/")) {
          path = "/" + path;
        }
      } else {
        // Pathname doesn't start with base path, likely an error case
        // Return null to indicate we're on the index page
        return null;
      }
    } else {
      // For root base path, use pathname as-is
      path = pathname;
    }

    // Remove leading slash and any trailing slashes
    const postId = path.replace(REGEX_PATTERNS.LEADING_TRAILING_SLASHES, "");
    return postId || null;
  }

  /**
   * Parses a potential post ID from a link pathname.
   *
   * @param linkPathname - The pathname from a link
   * @param basePath - The base path of the application
   * @returns The potential post ID, or null if not found
   */
  static parseLinkPath(linkPathname: string, basePath: string): string | null {
    let potentialPostId: string | null = null;

    if (basePath !== "/" && linkPathname.startsWith(basePath)) {
      // Remove the base path, keeping one leading slash
      const path = linkPathname.slice(basePath.length - 1);
      potentialPostId = path.replace(REGEX_PATTERNS.LEADING_TRAILING_SLASHES, "");
    } else if (basePath === "/") {
      // For root base path, use pathname as-is
      potentialPostId = linkPathname.replace(REGEX_PATTERNS.LEADING_TRAILING_SLASHES, "");
    }

    // Remove .md extension if present (links might include it)
    if (potentialPostId) {
      potentialPostId = potentialPostId.replace(REGEX_PATTERNS.MARKDOWN_EXTENSION, "");
    }

    return potentialPostId || null;
  }

  /**
   * Checks if a link pathname represents a hash-only link (same post, different section).
   *
   * @param linkPathname - The pathname from a link
   * @param currentPathname - The current page pathname
   * @param basePath - The base path of the application
   * @returns True if this is a hash-only link
   */
  static isHashOnlyLink(linkPathname: string, currentPathname: string, basePath: string): boolean {
    return !linkPathname || linkPathname === "/" || linkPathname === basePath || linkPathname === currentPathname;
  }

  /**
   * Checks if a URL is an external link (different origin).
   *
   * @param url - The URL to check
   * @returns True if the URL is external
   */
  static isExternalLink(url: URL): boolean {
    return url.origin !== window.location.origin;
  }
}
