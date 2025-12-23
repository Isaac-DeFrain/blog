// Utility functions for creating HTML elements

export const div = <T>(className: T, content: T): string => {
  return `<div class="${className}">${content}</div>`;
};

export const li = <T>(className: T, content: T): string => {
  return `<li class="${className}">${content}</li>`;
};

/**
 * Parses a date string (YYYY-MM-DD) and interprets it as Pacific Time.
 *
 * Creates a Date object representing noon Pacific Time for the given date.
 * Using noon ensures that when the date is formatted in Pacific Time, it will
 * always display the correct day, regardless of timezone conversions.
 * This ensures dates are consistently interpreted in the Pacific timezone,
 * accounting for both PST (UTC-8) and PDT (UTC-7) based on daylight saving time.
 *
 * @param dateString - ISO format date string (YYYY-MM-DD)
 * @returns Date object representing noon Pacific Time for the given date
 */
export function parseDateAsPacificTime(dateString: string): Date {
  // Parse the date components
  const parts = dateString.split("-");
  if (parts.length !== 3) {
    // Invalid format, return invalid date
    return new Date(NaN);
  }

  const [year, month, day] = parts.map(Number);

  // Validate that we got valid numbers
  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return new Date(NaN);
  }

  // Create a date at noon UTC on the target date to determine DST
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  // Check if the date is invalid
  if (isNaN(noonUtc.getTime())) {
    return noonUtc;
  }

  // Format this UTC time in Pacific Time to determine the offset
  const pacificFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    hour12: false,
  });

  try {
    const pacificHour = parseInt(pacificFormatter.format(noonUtc));

    // Calculate the offset: Pacific Time is UTC-8 (PST) or UTC-7 (PDT)
    // At noon UTC, Pacific Time is typically 4am (PST) or 5am (PDT)
    // Calculate the offset: if noon UTC = 4am Pacific, then Pacific = UTC - 8
    // So noon Pacific = 8pm UTC (PST)
    // If noon UTC = 5am Pacific, then Pacific = UTC - 7
    // So noon Pacific = 7pm UTC (PDT)
    const offsetHours = pacificHour <= 4 ? -8 : -7;

    // Noon Pacific Time corresponds to 8pm UTC (PST) or 7pm UTC (PDT)
    // We create a UTC date at the time that represents noon Pacific
    // Using noon ensures the date will always be on the correct day when formatted
    const utcHourForNoonPacific = 12 - offsetHours; // 20 for PST, 19 for PDT

    return new Date(Date.UTC(year, month - 1, day, utcHourForNoonPacific, 0, 0));
  } catch {
    // If formatting fails, return invalid date
    return new Date(NaN);
  }
}

/**
 * Formats a date string into a human-readable format.
 *
 * Converts ISO date strings (e.g. "2024-01-15") into a localized format
 * like "January 15, 2024" using US English locale. The date is interpreted
 * as Pacific Time.
 *
 * @param dateString - ISO format date string (YYYY-MM-DD)
 * @returns Formatted date string in "Month Day, Year" format
 */
export function formatDateAsPacificTime(dateString: string): string {
  const date = parseDateAsPacificTime(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Los_Angeles",
  });
}

/**
 * Escapes HTML special characters in text to prevent XSS attacks.
 *
 * Uses the browser's built-in DOM API to safely escape characters like
 * <, >, &, ", and ' by setting textContent and reading back innerHTML,
 * then manually escaping quotes which are not escaped by textContent.
 *
 * @param text - The raw text string that may contain HTML characters
 * @returns HTML-escaped string safe for insertion into the DOM
 */
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  // textContent escapes <, >, and &, but not quotes
  // We need to manually escape quotes for attribute safety
  return div.innerHTML.replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

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
