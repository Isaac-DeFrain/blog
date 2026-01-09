/**
 * @module utils/html
 *
 * HTML element creation and escaping utilities.
 */

import { THRESHOLDS } from "../blog/constants";

/**
 * Creates an HTML div element string with a class and content.
 *
 * @param className - CSS class name(s) for the div
 * @param content - HTML content for the div
 * @returns HTML string for the div element
 */
export function createDivElement(className: string, content: string): string {
  return `<div class="${className}">${content}</div>`;
}

/**
 * Creates an HTML li element string with a class and content.
 *
 * @param className - CSS class name(s) for the li
 * @param content - HTML content for the li
 * @returns HTML string for the li element
 */
export function createListItemElement(className: string, content: string): string {
  return `<li class="${className}">${content}</li>`;
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
 * Unescapes HTML entities and strips HTML tags from text.
 *
 * Handles HTML entities including named entities (&lt;, &gt;, &amp;, &quot;, etc.)
 * and numeric entities (&#x27;, &#39;, etc.). Uses the browser's DOM API to decode
 * all entities correctly, including entities that would result in HTML tags.
 * Performs multiple passes to handle nested encoding (e.g. &amp;lt; becomes &lt; then <).
 * After decoding entities, strips all HTML tags to extract only the text content.
 *
 * For very large strings (e.g. in test environments with string length limits),
 * falls back to a regex-based decoder.
 *
 * @param text - The HTML-escaped string or HTML string with tags
 * @returns Unescaped string with HTML entities converted to their characters and HTML tags removed
 */
export function unescapeHtml(text: string): string {
  // For very large strings, use regex-based decoder to avoid string length limits
  // (e.g. in happy-dom test environment)
  const LARGE_STRING_THRESHOLD = 100000; // ~100KB
  if (text.length > LARGE_STRING_THRESHOLD) {
    return unescapeHtmlRegex(text);
  }

  // Use the browser's DOM API to decode HTML entities
  // This handles all named entities (&lt;, &gt;, &amp;, &quot;, etc.) and numeric entities
  // Fallback to regex-based decoder if DOM API fails (e.g. string length limits)
  try {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    let decoded = textarea.value;

    // Handle nested encoding by decoding multiple times until no more changes occur
    let previousDecoded: string;
    let iterations = 0;

    do {
      previousDecoded = decoded;
      // Check if decoded string is getting too large
      if (decoded.length > LARGE_STRING_THRESHOLD) {
        return unescapeHtmlRegex(text);
      }

      textarea.innerHTML = decoded;
      decoded = textarea.value;
      iterations++;
    } while (decoded !== previousDecoded && iterations < THRESHOLDS.MAX_DECODE_ITERATIONS);

    // Strip HTML tags by extracting text content
    const div = document.createElement("div");
    div.innerHTML = decoded;
    return div.textContent || div.innerText || "";
  } catch (error) {
    if (error instanceof RangeError && error.message.includes("string length")) {
      return unescapeHtmlRegex(text);
    }

    throw error;
  }
}

/**
 * Regex-based HTML entity decoder (fallback for large strings).
 * Handles common named entities and numeric entities.
 *
 * @param text - The HTML-escaped string
 * @returns Unescaped string with HTML entities converted to their characters
 */
function unescapeHtmlRegex(text: string): string {
  // Handle numeric entities first (hex and decimal)
  let decoded = text.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  decoded = decoded.replace(/&#(\d+);/g, (_, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });

  // Handle named entities (common ones)
  const entityMap: Record<string, string> = {
    "&lt;": "<",
    "&gt;": ">",
    "&amp;": "&",
    "&quot;": '"',
    "&#x27;": "'",
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };

  // Handle nested encoding by decoding multiple times
  let previousDecoded: string;
  let iterations = 0;
  const MAX_ITERATIONS = 10;
  do {
    previousDecoded = decoded;
    for (const [entity, char] of Object.entries(entityMap)) {
      decoded = decoded.replace(new RegExp(entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), char);
    }
    iterations++;
  } while (decoded !== previousDecoded && iterations < MAX_ITERATIONS);

  // Strip HTML tags
  return decoded.replace(/<[^>]*>/g, "");
}
