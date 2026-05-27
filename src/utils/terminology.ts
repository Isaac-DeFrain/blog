/**
 * @module utils/terminology
 *
 * Terminology glossary identification, link resolution, and definition parsing.
 */

import type { BlogPost } from "../blog/types";
import { REGEX_PATTERNS } from "../blog/constants";
import { PathResolver } from "./path-resolver";
import { extractHeadingTitle, generateHeadingId } from "./headings";

/** Topic value that marks a post as a terminology glossary */
export const TERMINOLOGY_TOPIC = "terminology";

/** Shown when a glossary section body is empty or marked TODO */
export const TERMINOLOGY_PLACEHOLDER = "Definition coming soon.";

/**
 * A single term definition extracted from glossary markdown.
 */
export interface TermDefinition {
  title: string;
  bodyMarkdown: string;
}

/**
 * Resolved target of a terminology term link.
 */
export interface TerminologyLinkTarget {
  postId: string;
  termId: string;
}

/**
 * Returns true if the post is a terminology glossary (topics includes `terminology`).
 */
export function isTerminologyPost(post: BlogPost): boolean {
  return post.topics.some((topic) => topic.toLowerCase() === TERMINOLOGY_TOPIC);
}

/**
 * Builds a set of post IDs for all terminology glossaries.
 */
export function collectTerminologyPostIds(posts: BlogPost[]): Set<string> {
  return new Set(posts.filter(isTerminologyPost).map((post) => post.id));
}

/**
 * Resolves a relative post path against the current post's directory.
 *
 * @param relativePath - Path such as `./zk-terminology` or `zk-terminology.md`
 * @param currentPostId - ID of the post containing the link
 * @returns Resolved post ID, or null if it cannot be resolved
 */
export function resolveRelativePostId(relativePath: string, currentPostId: string): string | null {
  let path = relativePath.trim();
  if (!path || path.includes("://")) {
    return null;
  }

  if (path.startsWith("./")) {
    path = path.slice(2);
  }

  if (path.startsWith("../")) {
    const dirParts = currentPostId.includes("/") ? currentPostId.split("/").slice(0, -1) : [];
    const relParts = path.split("/");

    for (const part of relParts) {
      if (part === "..") {
        dirParts.pop();
      } else if (part !== "." && part.length > 0) {
        dirParts.push(part);
      }
    }

    path = dirParts.join("/");
  } else if (currentPostId.includes("/") && !path.includes("/")) {
    const dir = currentPostId.slice(0, currentPostId.lastIndexOf("/") + 1);
    path = `${dir}${path}`;
  }

  path = path.replace(REGEX_PATTERNS.MARKDOWN_EXTENSION, "").replace(REGEX_PATTERNS.LEADING_TRAILING_SLASHES, "");
  return path || null;
}

/**
 * Builds an SPA URL for an internal post ID with optional hash.
 */
export function buildPostUrl(basePath: string, postId: string, hash?: string): string {
  const base = basePath.replace(/\/$/, "") || "";
  const url = base ? `${base}/${postId}` : `/${postId}`;
  return hash ? `${url}#${hash}` : url;
}

/**
 * Rewrites internal blog post links to base-path SPA URLs.
 * Handles posts/, @posts/, /posts/, and same-directory relative links.
 *
 * @param href - Raw link href from markdown
 * @param basePath - Application base path
 * @param currentPostId - Post ID where the link appears
 * @returns Rewritten href, or null if not an internal post link
 */
export function rewriteInternalPostLink(href: string, basePath: string, currentPostId: string | null): string | null {
  if (!href || href.startsWith("http://") || href.startsWith("https://") || href.startsWith("#")) {
    return null;
  }

  const postsRewrite = rewritePostsLinkToRoot(href, basePath);
  if (postsRewrite) {
    return postsRewrite;
  }

  const [pathPart, hashPart] = href.split("#", 2);
  if (!pathPart || pathPart.startsWith("/") || !currentPostId) {
    return null;
  }

  const postId = resolveRelativePostId(pathPart, currentPostId);
  if (!postId) {
    return null;
  }

  return buildPostUrl(basePath, postId, hashPart);
}

/**
 * Rewrites links that reference the posts directory to root-relative SPA URLs.
 */
export function rewritePostsLinkToRoot(href: string, basePath: string): string | null {
  if (!href || href.startsWith("http://") || href.startsWith("https://") || href.startsWith("#")) {
    return null;
  }

  const [pathPart, hashPart] = href.split("#", 2);
  if (!/^(?:@?posts\/|\/posts\/)/.test(pathPart)) return null;

  const afterPrefix = pathPart
    .replace(/^(?:@?posts\/|\/posts\/)/, "")
    .replace(REGEX_PATTERNS.MARKDOWN_EXTENSION, "")
    .replace(REGEX_PATTERNS.LEADING_TRAILING_SLASHES, "");

  const postId = afterPrefix.trim();
  if (!postId) return null;

  return buildPostUrl(basePath, postId, hashPart);
}

/**
 * Parses glossary markdown into term definitions keyed by heading slug.
 */
export function parseTerminologyDefinitions(markdown: string): Map<string, TermDefinition> {
  const withoutFrontmatter = markdown.replace(REGEX_PATTERNS.FRONTMATTER, "");
  const sections = withoutFrontmatter.split(/^## /m).slice(1);
  const definitions = new Map<string, TermDefinition>();

  for (const section of sections) {
    const newlineIndex = section.indexOf("\n");
    if (newlineIndex === -1) {
      continue;
    }

    const headingLine = section.slice(0, newlineIndex);
    const title = extractHeadingTitle(headingLine);
    const termId = generateHeadingId(title);

    if (!termId) {
      continue;
    }

    let bodyMarkdown = section.slice(newlineIndex + 1).trim();
    if (!bodyMarkdown || bodyMarkdown.toUpperCase() === "TODO") {
      bodyMarkdown = TERMINOLOGY_PLACEHOLDER;
    }

    definitions.set(termId, { title, bodyMarkdown });
  }

  return definitions;
}

/**
 * Resolves a link href to a terminology post and term ID, if applicable.
 */
export function resolveTerminologyLink(
  href: string,
  basePath: string,
  currentPostId: string | null,
  terminologyPostIds: Set<string>,
): TerminologyLinkTarget | null {
  if (!href.includes("#")) {
    return null;
  }

  const hashIndex = href.indexOf("#");
  const pathPart = href.slice(0, hashIndex);
  const termId = href.slice(hashIndex + 1);

  if (!termId || !pathPart) {
    return null;
  }

  let postId: string | null = null;

  if (pathPart.startsWith("http://") || pathPart.startsWith("https://")) {
    try {
      postId = PathResolver.parseLinkPath(new URL(pathPart).pathname, basePath);
    } catch {
      return null;
    }
  } else if (pathPart.startsWith("./") || (!pathPart.startsWith("/") && !pathPart.includes("://"))) {
    if (!currentPostId) {
      return null;
    }

    postId = resolveRelativePostId(pathPart, currentPostId);
  } else {
    postId = PathResolver.parseLinkPath(pathPart, basePath);
  }

  if (!postId || !terminologyPostIds.has(postId)) {
    return null;
  }

  return { postId, termId };
}
