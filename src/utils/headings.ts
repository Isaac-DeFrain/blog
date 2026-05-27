/**
 * @module utils/headings
 *
 * Shared heading ID generation for blog posts and terminology glossaries.
 */

/**
 * Generates a URL-safe ID from plain heading text (GitHub-style slug).
 *
 * @param plainText - Heading text with HTML tags already stripped
 * @returns Slug used for hash anchors
 */
export function generateHeadingId(plainText: string): string {
  return plainText
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

/**
 * Extracts display title from a markdown ## heading line.
 * Handles linked headings like `[Title](url)`.
 *
 * @param headingLine - Raw heading text after the `##` prefix
 * @returns Plain-text title
 */
export function extractHeadingTitle(headingLine: string): string {
  const trimmed = headingLine.trim();
  const linkMatch = trimmed.match(/^\[(.+?)\]\([^)]*\)$/);
  if (linkMatch) {
    return linkMatch[1].trim();
  }

  return trimmed.replace(/<[^>]*>/g, "").trim();
}
