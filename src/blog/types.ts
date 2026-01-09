/**
 * @module types
 *
 * Shared type definitions for the blog application.
 */

/**
 * Represents a blog post with metadata
 */
export interface BlogPost {
  id: string;
  name: string;
  date: string;
  file: string;
  topics: string[];
}

/**
 * Callback function type for post click events
 */
export type PostClickCallback = (postId: string, hash?: string) => Promise<void>;

/**
 * Callback function type for topic filter changes
 */
export type TopicFilterCallback = (filteredPosts: BlogPost[]) => void;

/**
 * Type alias for nullable DOM elements
 */
export type MaybeElement<T extends HTMLElement = HTMLElement> = T | null;

/**
 * Frontmatter metadata parsed from markdown files
 */
export interface Frontmatter {
  name?: string;
  date?: string;
  topics?: string[];
}

/**
 * Manifest file structure for blog posts
 */
export interface BlogManifest {
  files: string[];
}

/**
 * Configuration for highlight.js
 */
export interface HighlightConfig {
  langPrefix: string;
  highlight: (code: string, lang: string) => string;
}

/**
 * Type declaration for window.__BASE_PATH__ injected by build process
 */
declare global {
  interface Window {
    __BASE_PATH__?: string;
  }
}

export {};
