/**
 * @module content-features
 *
 * Content feature detection for markdown content.
 * Detects presence of MathJax, Mermaid, Graphviz, and TypeScript executable blocks.
 */

import { REGEX_PATTERNS } from "../blog/constants";
import { FOUR_TICK_PLAINTEXT_REGEX } from "../../tests/helpers/markdown";

/**
 * Detects which content features are present in markdown content.
 */
export class ContentFeatureDetector {
  /**
   * Checks if the markdown content contains Mermaid diagrams.
   *
   * @param markdown - The markdown content to check
   * @returns True if Mermaid diagrams are present
   */
  static needsMermaid(markdown: string): boolean {
    return REGEX_PATTERNS.MERMAID_BLOCK.test(markdown);
  }

  /**
   * Checks if the markdown content contains Graphviz diagrams.
   *
   * @param markdown - The markdown content to check
   * @returns True if Graphviz diagrams are present
   */
  static needsGraphviz(markdown: string): boolean {
    return REGEX_PATTERNS.GRAPHVIZ_BLOCK.test(markdown);
  }

  /**
   * Checks if the markdown content contains MathJax expressions.
   *
   * Excludes code blocks to avoid false positives (e.g. $ in code).
   *
   * @param markdown - The markdown content to check
   * @returns True if MathJax expressions are present
   */
  static needsMathJax(markdown: string): boolean {
    // Exclude code blocks to avoid false positives (e.g. $ in code)
    const markdownWithoutCodeBlocks = markdown.replace(REGEX_PATTERNS.CODE_BLOCK, "");

    // Check for display math: $$...$$
    if (REGEX_PATTERNS.DISPLAY_MATH.test(markdownWithoutCodeBlocks)) {
      return true;
    }

    // Check for inline math: $...$ (single $, not $$)
    if (REGEX_PATTERNS.INLINE_MATH.test(markdownWithoutCodeBlocks)) {
      return true;
    }

    // Check for LaTeX delimiters: \(...\) or \[...\]
    if (REGEX_PATTERNS.LATEX_DELIMITERS.test(markdownWithoutCodeBlocks)) {
      return true;
    }

    return false;
  }

  /**
   * Checks if the markdown content contains TypeScript executable blocks.
   * Only counts blocks that are not nested inside 4-tick plaintext blocks.
   *
   * @param markdown - The markdown content to check
   * @returns True if TypeScript executable blocks are present
   */
  static needsTypeScriptRunner(markdown: string): boolean {
    // First, find all 4-tick plaintext blocks to exclude nested code blocks
    const fourTickBlocks: { start: number; end: number }[] = [];
    FOUR_TICK_PLAINTEXT_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null = null;
    while ((match = FOUR_TICK_PLAINTEXT_REGEX.exec(markdown)) !== null) {
      fourTickBlocks.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // Then, find all typescript:run code blocks using a regex that matches the full block
    const typescriptRunBlockRegex = REGEX_PATTERNS.TYPESCRIPT_RUN_BLOCK;
    typescriptRunBlockRegex.lastIndex = 0;

    while ((match = typescriptRunBlockRegex.exec(markdown)) !== null) {
      const blockStart = match.index;
      const blockEnd = match.index + match[0].length;

      // Check if this block is nested inside a 4-tick plaintext block
      const isNestedInPlaintext = fourTickBlocks.some(
        (plaintextBlock) => blockStart > plaintextBlock.start && blockEnd < plaintextBlock.end,
      );

      if (!isNestedInPlaintext) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detects all content features present in the markdown.
   *
   * @param markdown - The markdown content to analyze
   * @returns Object indicating which features are needed
   */
  static detectFeatures(markdown: string): {
    needsMath: boolean;
    needsMermaid: boolean;
    needsGraphviz: boolean;
    needsTypeScript: boolean;
  } {
    return {
      needsMath: this.needsMathJax(markdown),
      needsMermaid: this.needsMermaid(markdown),
      needsGraphviz: this.needsGraphviz(markdown),
      needsTypeScript: this.needsTypeScriptRunner(markdown),
    };
  }
}
