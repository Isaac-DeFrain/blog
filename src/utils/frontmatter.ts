/**
 * @module utils/frontmatter
 *
 * YAML frontmatter parsing utilities for markdown files.
 */

/**
 * Parses YAML frontmatter from markdown files.
 *
 * Extracts metadata from a frontmatter block at the beginning of the markdown file.
 * The frontmatter should be in the format:
 *
 * ```markdown
 * ---
 * name: Post Name
 * date: 2024-01-15
 * topics:
 *   - Topic 1
 *   - Topic 2
 * ---
 * ```
 *
 * @param markdown - The markdown content with optional frontmatter
 * @returns Object with parsed frontmatter fields (name, date, topics)
 */
export function parseFrontmatter(markdown: string): {
  name?: string;
  date?: string;
  topics?: string[];
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return {};
  }

  const frontmatter = match[1];
  const result: { name?: string; date?: string; topics?: string[] } = {};

  // Parse name
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  if (nameMatch) {
    result.name = nameMatch[1].trim();
  }

  // Parse date
  const dateMatch = frontmatter.match(/^date:\s*(.+)$/m);
  if (dateMatch) {
    result.date = dateMatch[1].trim();
  }

  // Parse topics
  const topicsHeaderMatch = frontmatter.match(/^topics:\s*(?:\n|$)/m);
  if (topicsHeaderMatch) {
    // topics: exists, extract everything after it until next field or end
    const afterTopics = frontmatter.substring(topicsHeaderMatch.index! + topicsHeaderMatch[0].length);
    // Extract lines until next field (starts with word:) or end of frontmatter
    const topicsLines = afterTopics.split(/\n(?=\w+:)/)[0];
    const topicsList = topicsLines || "";
    result.topics = topicsList
      .split("\n")
      .map((line) =>
        line
          .replace(/^\s*-\s*/, "")
          .trim()
          .toLowerCase(),
      )
      .filter((topic) => topic.length > 0);
  }

  return result;
}

