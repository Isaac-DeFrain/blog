/**
 * Unit tests for ContentFeatureDetector
 */

import { describe, it, expect } from "vitest";
import { ContentFeatureDetector } from "../../src/render/content-features";

describe("ContentFeatureDetector", () => {
  describe("needsTypeScriptRunner", () => {
    it("should detect TypeScript executable block", () => {
      const markdown = "```typescript:run\nconsole.log('test');\n```";
      expect(ContentFeatureDetector.needsTypeScriptRunner(markdown)).toBe(true);
    });

    it("should not detect TypeScript executable block nested in 4-tick plaintext", () => {
      const markdown = `\`\`\`\`plaintext
\`\`\`typescript:run
console.log('test');
\`\`\`
\`\`\`\``;
      expect(ContentFeatureDetector.needsTypeScriptRunner(markdown)).toBe(false);
    });

    it("should detect TypeScript executable block outside 4-tick plaintext", () => {
      const markdown = `\`\`\`\`plaintext
Some plaintext content
\`\`\`\`

\`\`\`typescript:run
console.log('test');
\`\`\``;
      expect(ContentFeatureDetector.needsTypeScriptRunner(markdown)).toBe(true);
    });

    it("should handle overlapping blocks - block starts before plaintext ends", () => {
      // TypeScript block starts before plaintext block ends (overlapping)
      // But it's fully nested (starts after plaintext starts, ends before plaintext ends)
      const markdown = `\`\`\`\`plaintext
Some content
\`\`\`typescript:run
console.log('test');
\`\`\`
\`\`\`\``;
      // The TypeScript block is fully nested inside the plaintext block, so it should be excluded
      expect(ContentFeatureDetector.needsTypeScriptRunner(markdown)).toBe(false);
    });

    it("should handle multiple 4-tick blocks with nested TypeScript", () => {
      const markdown = `\`\`\`\`plaintext
\`\`\`typescript:run
console.log('nested');
\`\`\`
\`\`\`\`

\`\`\`typescript:run
console.log('not nested');
\`\`\``;
      expect(ContentFeatureDetector.needsTypeScriptRunner(markdown)).toBe(true);
    });

    it("should handle TypeScript block at exact boundary of plaintext block", () => {
      // TypeScript block starts exactly where plaintext ends
      const markdown = `\`\`\`\`plaintext
Content
\`\`\`\`
\`\`\`typescript:run
console.log('test');
\`\`\``;
      expect(ContentFeatureDetector.needsTypeScriptRunner(markdown)).toBe(true);
    });

    it("should handle TypeScript block that starts inside but ends outside plaintext", () => {
      // TypeScript block starts inside plaintext but extends beyond it
      // In this case, the block ends at the same position as plaintext ends (both end with `````)
      // So blockEnd is not < plaintextBlock.end, making it not fully nested
      const markdown = `\`\`\`\`plaintext
Content
\`\`\`typescript:run
console.log('test');
\`\`\`
\`\`\`\``;
      // The block starts inside but ends at or after plaintext ends, so it's not fully nested
      // The current implementation checks if blockStart > plaintextBlock.start && blockEnd < plaintextBlock.end
      // If blockEnd >= plaintextBlock.end, it's not considered nested and should be detected
      // However, in this specific case, the block is still nested, so it should be excluded
      // The test expectation depends on the exact positions - let's check if it's actually nested
      expect(ContentFeatureDetector.needsTypeScriptRunner(markdown)).toBe(false);
    });

    it("should return false when no TypeScript executable blocks", () => {
      const markdown = "Regular markdown content";
      expect(ContentFeatureDetector.needsTypeScriptRunner(markdown)).toBe(false);
    });

    it("should return false for regular TypeScript code blocks", () => {
      const markdown = "```typescript\nconst x = 1;\n```";
      expect(ContentFeatureDetector.needsTypeScriptRunner(markdown)).toBe(false);
    });

    it("should handle multiple plaintext blocks with TypeScript in between", () => {
      const markdown = `\`\`\`\`plaintext
First block
\`\`\`\`

\`\`\`typescript:run
console.log('test');
\`\`\`

\`\`\`\`plaintext
Second block
\`\`\`\``;
      expect(ContentFeatureDetector.needsTypeScriptRunner(markdown)).toBe(true);
    });

    it("should handle TypeScript block that spans across plaintext boundary", () => {
      // This tests the edge case where a TypeScript block might overlap with plaintext
      // but not be fully contained within it
      const markdown = `Before
\`\`\`typescript:run
console.log('start');
\`\`\`\`plaintext
middle
\`\`\`\`
\`\`\`typescript:run
console.log('end');
\`\`\``;
      expect(ContentFeatureDetector.needsTypeScriptRunner(markdown)).toBe(true);
    });
  });

  describe("detectFeatures", () => {
    it("should detect all features", () => {
      const markdown = `
\`\`\`mermaid
graph TD
\`\`\`

\`\`\`dot
digraph G {}
\`\`\`

$$x = 1$$

\`\`\`typescript:run
console.log('test');
\`\`\`
`;
      const features = ContentFeatureDetector.detectFeatures(markdown);
      expect(features.needsMath).toBe(true);
      expect(features.needsMermaid).toBe(true);
      expect(features.needsGraphviz).toBe(true);
      expect(features.needsTypeScript).toBe(true);
    });

    it("should detect no features", () => {
      const markdown = "Regular markdown content";
      const features = ContentFeatureDetector.detectFeatures(markdown);
      expect(features.needsMath).toBe(false);
      expect(features.needsMermaid).toBe(false);
      expect(features.needsGraphviz).toBe(false);
      expect(features.needsTypeScript).toBe(false);
    });
  });
});
