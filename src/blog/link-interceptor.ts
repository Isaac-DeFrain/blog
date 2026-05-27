/**
 * @module blog/link-interceptor
 *
 * Handles SPA routing by intercepting internal blog post links
 * and using client-side navigation instead of full page reloads.
 */

import type { BlogPost, PostClickCallback } from "./types";
import { PathResolver } from "../utils/path-resolver";
import { querySelectorSafe } from "../utils/dom";
import { CSS_CLASSES } from "./constants";

export type HomeClickCallback = (hash?: string) => Promise<void>;

/**
 * Intercepts clicks on internal links within blog content for SPA routing.
 */
export class LinkInterceptor {
  /**
   * Sets up click interception for internal links within blog content.
   * Intercepts clicks on internal blog post links and uses SPA routing instead of full page navigation.
   * Handles both links to other posts and section links (hash fragments) within the current post.
   * Uses event delegation on the blog content container for efficiency.
   *
   * @param blogContent - The blog content container element
   * @param basePath - The base path for the application
   * @param allPosts - Array of all blog posts (for link validation)
   * @param currentPostId - The ID of the currently displayed post
   * @param onPostClick - Callback to handle post clicks
   * @param onHomeClick - Callback to handle navigation to the home page
   */
  setup(
    blogContent: HTMLElement,
    basePath: string,
    allPosts: BlogPost[],
    currentPostId: string | null,
    onPostClick: PostClickCallback,
    onHomeClick: HomeClickCallback,
  ): void {
    if (!blogContent) return;

    // Use event delegation - attach listener once to the container
    blogContent.addEventListener("click", async (e) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (!link || !link.href) return;

      // Only intercept links within the blog content area
      const contentElement = querySelectorSafe<HTMLElement>(blogContent, `.${CSS_CLASSES.BLOG_CONTENT}`);
      if (!contentElement || !contentElement.contains(link)) return;

      // Get the URL from the link
      const url = new URL(link.href, window.location.href);
      const linkPathname = url.pathname;
      const linkHash = url.hash;

      // Check if this is an external link (different origin)
      if (PathResolver.isExternalLink(url)) {
        // External link, allow normal navigation
        return;
      }

      const currentPathname = window.location.pathname;

      // Handle links to the home page
      if (PathResolver.isHomePath(linkPathname, basePath)) {
        e.preventDefault();
        e.stopPropagation();

        if (PathResolver.isHomePath(currentPathname, basePath)) {
          if (linkHash) {
            window.history.pushState({ postId: null }, "", `${currentPathname}${linkHash}`);
            this.scrollToHash(linkHash);
          }
        } else {
          await onHomeClick(linkHash);
        }

        return;
      }

      // Handle hash-only links (section links within the current post)
      if (PathResolver.isHashOnlyLink(linkPathname, currentPathname, basePath)) {
        if (linkHash) {
          // This is a section link within the current post
          e.preventDefault();
          e.stopPropagation();

          // Update URL with hash without reloading
          window.history.pushState({ postId: currentPostId }, "", `${currentPathname}${linkHash}`);
          this.scrollToHash(linkHash);
        }

        return;
      }

      // Extract potential post ID from the pathname
      const potentialPostId = PathResolver.parseLinkPath(linkPathname, basePath);

      // Check if this post ID exists in our blog posts
      if (potentialPostId && allPosts.some((post) => post.id === potentialPostId)) {
        // Internal blog post link, use SPA routing
        e.preventDefault();
        e.stopPropagation();
        await onPostClick(potentialPostId, linkHash);
      }
    });
  }

  /**
   * Scrolls to an element with the given hash fragment.
   *
   * @param hash - The hash fragment (e.g. `#this-blogs-tech-choices`)
   */
  private scrollToHash(hash: string): void {
    if (!hash) return;

    // Remove the leading # from the hash (if present)
    const id = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!id) return;

    // Find the element by ID
    const element = document.getElementById(id);
    if (element) {
      // Scroll to the element with smooth behavior
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // If element not found, try to find it by name attribute (for anchors)
      const anchor = document.querySelector(`a[name="${id}"]`);
      if (anchor) {
        anchor.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }
}
