/**
 * @module blog
 *
 * The main blog reader module which handles blog post loading, rendering, and navigation.
 *
 * This module provides the core functionality for a single-page application (SPA) blog reader.
 * It manages the lifecycle of blog posts from discovery through rendering, including:
 *
 * - **Blog Discovery**: Loads and parses blog post metadata from markdown files via `manifest.json`
 * - **Content Rendering**: Converts markdown to HTML with syntax highlighting, MathJax, Mermaid, and Graphviz diagram support
 * - **SPA Routing**: Handles client-side navigation for internal blog links without page reloads
 * - **Topic Filtering**: Integrates with [[`TopicsBar`]] for filtering posts by topic
 * - **Sidebar Navigation**: Manages post list display and active post highlighting
 * - **Browser Navigation**: Supports browser back/forward button navigation via History API
 */

// Re-export the refactored BlogReader and related utilities
export { BlogReader, createHighlightConfig } from "./blog/BlogReader";
export { PostLoader } from "./blog/PostLoader";
export { PostRenderer } from "./blog/PostRenderer";
export { LinkInterceptor } from "./blog/LinkInterceptor";
