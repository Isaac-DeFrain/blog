/**
 * @module constants
 *
 * Centralized constants for the blog application.
 * Contains timeouts, CSS classes, DOM selectors, and regex patterns.
 */

/**
 * Timeout values in milliseconds
 */
export const TIMEOUTS = {
  /** Delay for scrolling after content renders (ms) */
  SCROLL_DELAY: 100,
  /** Maximum execution time for TypeScript code blocks (ms) */
  CODE_EXECUTION: 10000,
  /** Idle delay before hiding mobile header (ms) */
  IDLE_DELAY: 2000,
} as const;

/**
 * Threshold values
 */
export const THRESHOLDS = {
  /** Number of scroll ups required to show hidden header on mobile */
  SCROLL_UP_COUNT: 100,
  /** Large string threshold for HTML unescaping fallback (~100KB) */
  LARGE_STRING: 100000,
  /** Maximum iterations for nested HTML entity decoding */
  MAX_DECODE_ITERATIONS: 10,
} as const;

/**
 * Viewport breakpoints
 */
export const BREAKPOINTS = {
  /** Mobile viewport maximum width (px) */
  MOBILE: 768,
} as const;

/**
 * CSS class names used throughout the application
 */
export const CSS_CLASSES = {
  ACTIVE: "active",
  LOADING: "loading",
  ERROR: "error",
  BLOG_CONTENT: "blog-content",
  BLOG_LIST: "blog-list",
  BLOG_LIST_ITEM: "blog-list-item",
  BLOG_META: "blog-meta",
  TOPICS_BAR: "topics-bar",
  TOPIC_BUTTON: "topic-button",
  THEME_TOGGLE: "theme-toggle",
  HEADER: "header",
  HEADER_HIDDEN: "header-hidden",
  TOPICS_CONTAINER: "topics-container",
  TOPICS_HIDDEN: "topics-hidden",
  SIDEBAR: "sidebar",
  SIDEBAR_CARD: "sidebar-card",
  MERMAID: "mermaid",
  GRAPHVIZ: "graphviz",
  DOT: "dot",
  TYPESCRIPT: "typescript",
  TS_EXECUTABLE_BLOCK: "ts-executable-block",
  TS_CODE_DISPLAY: "ts-code-display",
  TS_CONTROLS: "ts-controls",
  TS_RUN_BUTTON: "ts-run-button",
  TS_OUTPUT_CONTAINER: "ts-output-container",
  TS_OUTPUT_CONTENT: "ts-output-content",
  TS_OUTPUT_ITEM: "ts-output-item",
  TS_ERROR: "ts-error",
  GRAPHVIZ_CONTAINER: "graphviz-container",
  GRAPHVIZ_ERROR: "graphviz-error",
  DARK_MODE: "dark-mode",
  DATE: "date",
} as const;

/**
 * DOM element IDs
 */
export const ELEMENT_IDS = {
  BLOG_CONTENT: "blog-content",
  BLOG_LIST: "blog-list",
  TOPICS_BAR: "topics-bar",
  THEME_TOGGLE: "theme-toggle",
} as const;

/**
 * DOM selectors
 */
export const SELECTORS = {
  HEADER: ".header",
  TOPICS_CONTAINER: ".topics-container",
  SIDEBAR: ".sidebar",
  SIDEBAR_CARD: ".sidebar-card",
  BLOG_CONTENT: "#blog-content",
  BLOG_LIST: "#blog-list",
  TOPICS_BAR: "#topics-bar",
  ACTIVE_ITEM: ".blog-list-item.active",
  MERMAID: ".mermaid",
  GRAPHVIZ: ".graphviz, .dot",
  TS_EXECUTABLE_BLOCK: ".ts-executable-block",
  TS_RUN_BUTTON: (blockId: string) => `.ts-run-button[data-block-id="${blockId}"]`,
  TS_OUTPUT_CONTAINER: (blockId: string) => `.ts-output-container[data-block-id="${blockId}"]`,
  TS_OUTPUT_CONTENT: ".ts-output-content",
  TS_CODE_SCRIPT: (blockId: string) => `script[data-ts-code="${blockId}"]`,
} as const;

/**
 * Regex patterns for content detection and parsing
 */
export const REGEX_PATTERNS = {
  /** Matches Mermaid code blocks */
  MERMAID_BLOCK: /```mermaid/,
  /** Matches Graphviz/DOT code blocks */
  GRAPHVIZ_BLOCK: /```(?:dot|graphviz)/,
  /** Matches code blocks (for exclusion) */
  CODE_BLOCK: /```[\s\S]*?```/g,
  /** Matches display math: $$...$$ */
  DISPLAY_MATH: /\$\$[\s\S]*?\$\$/,
  /** Matches inline math: $...$ (not $$) */
  INLINE_MATH: /(?<!\$)\$(?!\$)[^$\n]+\$(?!\$)/,
  /** Matches LaTeX delimiters: \(...\) or \[...\] */
  LATEX_DELIMITERS: /\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/,
  /** Matches TypeScript executable code blocks */
  TYPESCRIPT_RUN_BLOCK: /```typescript:run\s*\n([\s\S]*?)```/g,
  /** Matches markdown file extension */
  MARKDOWN_EXTENSION: /\.md$/,
  /** Matches leading and trailing slashes */
  LEADING_TRAILING_SLASHES: /^\/|\/$/g,
  /** Matches frontmatter block */
  FRONTMATTER: /^---\s*\n([\s\S]*?)\n---\s*\n/,
  /** Matches frontmatter name field */
  FRONTMATTER_NAME: /^name:\s*(.+)$/m,
  /** Matches frontmatter date field */
  FRONTMATTER_DATE: /^date:\s*(.+)$/m,
  /** Matches frontmatter topics header */
  FRONTMATTER_TOPICS: /^topics:\s*(?:\n|$)/m,
  /** Matches nested markdown code blocks in plaintext */
  NESTED_CODE_BLOCKS: /```\w+/,
} as const;

/**
 * Language identifiers for code highlighting
 */
export const CODE_LANGUAGES = {
  MARKDOWN: "markdown",
  PLAINTEXT: "plaintext",
  TXT: "txt",
  TYPESCRIPT: "typescript",
  TYPESCRIPT_RUN: "typescript:run",
  MERMAID: "mermaid",
  DOT: "dot",
  GRAPHVIZ: "graphviz",
} as const;

/**
 * Button text labels
 */
export const BUTTON_LABELS = {
  RUN: "Run",
  RUNNING: "Running...",
  EXECUTED: "Executed",
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  NO_POSTS: "No posts available",
  POST_NOT_FOUND: "Blog post not found",
  FAILED_LOAD_POSTS: "Failed to load blog posts. Please try again later.",
  FAILED_LOAD_POST: "Failed to load blog post. Please try again.",
  FAILED_LOAD_CONTENT: "Failed to load blog post content. Please try again.",
  FAILED_LOAD_MANIFEST: "Failed to load blog manifest",
  BLOG_CONTENT_NULL: "Blog post content is is null",
  BLOG_CONTENT_NOT_FOUND: "blogContent element not found",
  EXECUTION_TIMEOUT: "Execution timeout: Code took too long to execute",
  INVALID_WRAPPED_CODE: "Invalid wrapped JavaScript code: missing run() function",
} as const;

/**
 * Loading messages
 */
export const LOADING_MESSAGES = {
  LOADING_POST: "Loading post...",
} as const;
