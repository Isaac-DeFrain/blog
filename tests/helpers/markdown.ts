/**
 * @module Markdown Helpers
 * @description Utilities for parsing and finding code blocks in markdown content
 */

/**
 * Regex pattern to match 3-backtick code blocks.
 */
export const CODE_BLOCK_REGEX = /```(\w+)?\n([\s\S]*?)```/g;

/**
 * Regex pattern to match 4-backtick plaintext code blocks.
 */
export const FOUR_TICK_PLAINTEXT_REGEX = /````[plaintext|txt]\n([\s\S]*?)````/g;

/**
 * Represents a code block found in markdown with its position and content.
 */
export interface CodeBlock {
  lang: string | null;
  code: string;
  start: number;
  end: number;
}

/**
 * Finds all 3-backtick code blocks in markdown, excluding those nested inside 4-backtick plaintext blocks.
 * @param markdown - The markdown content to search
 * @returns Array of code block matches with their positions
 */
export function findUnnestedCodeBlocks(markdown: string): CodeBlock[] {
  // First, find all 4-backtick plaintext blocks
  const fourTickBlocks: { start: number; end: number }[] = [];
  FOUR_TICK_PLAINTEXT_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null = null;
  while ((match = FOUR_TICK_PLAINTEXT_REGEX.exec(markdown)) !== null) {
    fourTickBlocks.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Then, find all 3-backtick code blocks
  const codeBlocks: CodeBlock[] = [];
  CODE_BLOCK_REGEX.lastIndex = 0;

  while ((match = CODE_BLOCK_REGEX.exec(markdown)) !== null) {
    const blockStart = match.index;
    const blockEnd = match.index + match[0].length;

    // Reject blocks that are nested inside 4-backtick markdown blocks
    const isNestedInMarkdown = fourTickBlocks.some(
      (markdownBlock) => blockStart > markdownBlock.start && blockEnd < markdownBlock.end,
    );

    if (!isNestedInMarkdown) {
      codeBlocks.push({
        lang: match[1] || null,
        code: match[2],
        start: blockStart,
        end: blockEnd,
      });
    }
  }

  return codeBlocks;
}
