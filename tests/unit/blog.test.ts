/**
 * Unit tests for blog module functions including frontmatter parsing,
 * highlight configuration, and code highlighting functionality.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHighlightConfig } from "../../src/blog";
import { PostRenderer } from "../../src/blog/PostRenderer";
import { parseFrontmatter } from "../../src/utils";
import type { HLJSApi } from "highlight.js";

type KnownLanguage = "typescript" | "javascript" | "python" | "markdown" | "dot" | "graphviz";

const renderer = new PostRenderer();

describe("parseFrontmatter", () => {
  it("should parse valid frontmatter with all fields", () => {
    const markdown = `---
name: Test Post
date: 2024-01-15
topics:
  - testing
  - development
---

# Content`;
    const result = parseFrontmatter(markdown);
    expect(result.name).toBe("Test Post");
    expect(result.date).toBe("2024-01-15");
    expect(result.topics).toEqual(["testing", "development"]);
  });

  it("should parse frontmatter with only name", () => {
    const markdown = `---
name: Test Post
---

# Content`;
    const result = parseFrontmatter(markdown);
    expect(result.name).toBe("Test Post");
    expect(result.date).toBeUndefined();
    expect(result.topics).toBeUndefined();
  });

  it("should parse frontmatter with only date", () => {
    const markdown = `---
date: 2024-01-15
---

# Content`;
    const result = parseFrontmatter(markdown);
    expect(result.name).toBeUndefined();
    expect(result.date).toBe("2024-01-15");
    expect(result.topics).toBeUndefined();
  });

  it("should parse frontmatter with only topics", () => {
    const markdown = `---
topics:
  - testing
---

# Content`;
    const result = parseFrontmatter(markdown);
    expect(result.name).toBeUndefined();
    expect(result.date).toBeUndefined();
    expect(result.topics).toEqual(["testing"]);
  });

  it("should handle empty topics array", () => {
    const markdown = `---
name: Test Post
date: 2024-01-15
topics:
---

# Content`;
    const result = parseFrontmatter(markdown);
    expect(result.topics).toEqual([]);
  });

  it("should normalize topics to lowercase", () => {
    const markdown = `---
topics:
  - Testing
  - DEVELOPMENT
  - Mixed-Case
---

# Content`;
    const result = parseFrontmatter(markdown);
    expect(result.topics).toEqual(["testing", "development", "mixed-case"]);
  });

  it("should handle topics with whitespace", () => {
    const markdown = `---
topics:
  -  testing  
  -  development  
---

# Content`;
    const result = parseFrontmatter(markdown);
    expect(result.topics).toEqual(["testing", "development"]);
  });

  it("should filter out empty topic strings", () => {
    const markdown = `---
topics:
  - testing
  - 
  - development
  -   
---

# Content`;
    const result = parseFrontmatter(markdown);
    expect(result.topics).toEqual(["testing", "development"]);
  });

  it("should handle special characters in name", () => {
    const markdown = `---
name: Test "Post" & More
---

# Content`;
    const result = parseFrontmatter(markdown);
    expect(result.name).toBe('Test "Post" & More');
  });

  it("should handle multiline frontmatter", () => {
    const markdown = `---
name: Test Post
date: 2024-01-15
topics:
  - testing
  - development
  - another-topic
---

# Content`;
    const result = parseFrontmatter(markdown);
    expect(result.topics).toEqual(["testing", "development", "another-topic"]);
  });

  it("should return empty object for markdown without frontmatter", () => {
    const markdown = `# Content without frontmatter`;
    const result = parseFrontmatter(markdown);
    expect(result).toEqual({});
  });

  it("should return empty object for empty string", () => {
    const result = parseFrontmatter("");
    expect(result).toEqual({});
  });

  it("should handle frontmatter without closing delimiter", () => {
    const markdown = `---
name: Test Post
date: 2024-01-15

# Content`;
    const result = parseFrontmatter(markdown);
    // Should not parse as frontmatter is incomplete
    expect(result).toEqual({});
  });

  it("should handle frontmatter with extra whitespace", () => {
    const markdown = `---
name:   Test Post   
date:   2024-01-15   
topics:
  -   testing   
---

# Content`;
    const result = parseFrontmatter(markdown);
    expect(result.name).toBe("Test Post");
    expect(result.date).toBe("2024-01-15");
    expect(result.topics).toEqual(["testing"]);
  });

  it("should handle date with extra spaces", () => {
    const markdown = `---
date:  2024-01-15  
---

# Content`;
    const result = parseFrontmatter(markdown);
    expect(result.date).toBe("2024-01-15");
  });

  it("should handle name with colons", () => {
    const markdown = `---
name: Test: Post with colon
---

# Content`;
    const result = parseFrontmatter(markdown);
    expect(result.name).toBe("Test: Post with colon");
  });

  it("should handle topics with special characters", () => {
    const markdown = `---
topics:
  - test-topic
  - test_topic
  - test.topic
---

# Content`;
    const result = parseFrontmatter(markdown);
    expect(result.topics).toEqual(["test-topic", "test_topic", "test.topic"]);
  });
});

describe("createHighlightConfig", () => {
  let mockHljs: HLJSApi;

  beforeEach(() => {
    const knownLanguages: KnownLanguage[] = ["typescript", "javascript", "python", "markdown", "dot", "graphviz"];

    mockHljs = {
      getLanguage: vi.fn((lang: string) => {
        // Mock: return truthy for known languages
        return knownLanguages.includes(lang as KnownLanguage) ? { name: lang } : null;
      }),
      highlight: vi.fn((code: string, options: { language: string }) => {
        return {
          value: `<span class="hljs">${code}</span>`,
          language: options.language,
        };
      }),
    } as unknown as HLJSApi;
  });

  it("should create highlight config with correct lang prefix", () => {
    const config = createHighlightConfig(mockHljs);
    expect(config.langPrefix).toBe("hljs language-");
  });

  it("should highlight code with recognized language", () => {
    const config = createHighlightConfig(mockHljs);
    const result = config.highlight("const x = 1;", "typescript");
    expect(mockHljs.highlight).toHaveBeenCalledWith("const x = 1;", { language: "typescript" });
    expect(result).toBeDefined();
  });

  it("should fall back to plaintext for unrecognized language", () => {
    const config = createHighlightConfig(mockHljs);
    const result = config.highlight("some code", "unknown-lang");
    expect(mockHljs.highlight).toHaveBeenCalledWith("some code", { language: "plaintext" });
    expect(result).toBeDefined();
  });

  it("should handle empty code string", () => {
    const config = createHighlightConfig(mockHljs);
    const result = config.highlight("", "typescript");
    expect(mockHljs.highlight).toHaveBeenCalledWith("", { language: "typescript" });
    expect(result).toBeDefined();
  });

  it("should handle empty language string", () => {
    const config = createHighlightConfig(mockHljs);
    const result = config.highlight("code", "");
    expect(mockHljs.getLanguage).toHaveBeenCalledWith("");
    expect(mockHljs.highlight).toHaveBeenCalledWith("code", { language: "plaintext" });
    expect(result).toBeDefined();
  });

  it("should use recognized language when available", () => {
    const config = createHighlightConfig(mockHljs);
    config.highlight("print('hello')", "python");
    expect(mockHljs.highlight).toHaveBeenCalledWith("print('hello')", { language: "python" });
  });

  it("should handle null return from getLanguage", () => {
    const config = createHighlightConfig(mockHljs);
    const result = config.highlight("code", "unknown");
    expect(mockHljs.getLanguage).toHaveBeenCalledWith("unknown");
    expect(mockHljs.highlight).toHaveBeenCalledWith("code", { language: "plaintext" });
    expect(result).toBeDefined();
  });

  it("should skip highlighting for markdown code blocks with nested code block syntax", () => {
    const config = createHighlightConfig(mockHljs);
    const codeWithNestedBlock = "```typescript\nconst x = 1;\n```";

    // Clear any previous calls
    vi.clearAllMocks();
    const result = config.highlight(codeWithNestedBlock, "markdown");

    // Should not call highlight.js for markdown with nested code blocks
    expect(mockHljs.highlight).not.toHaveBeenCalled();

    // Should return escaped HTML (plain text) instead of highlighted HTML
    expect(result).not.toContain('<span class="hljs">');
    expect(result).toContain("typescript");
  });

  it("should still highlight markdown code blocks without nested code block syntax", () => {
    const config = createHighlightConfig(mockHljs);
    const plainMarkdown = "# Heading\n\nSome text";

    // Clear any previous calls
    vi.clearAllMocks();
    config.highlight(plainMarkdown, "markdown");

    // Should call highlight.js for markdown without nested code blocks
    expect(mockHljs.highlight).toHaveBeenCalledWith(plainMarkdown, { language: "markdown" });
  });

  it("should skip highlighting for plaintext code blocks with nested code block syntax", () => {
    const config = createHighlightConfig(mockHljs);
    const codeWithNestedBlock = "```typescript\nconst x = 1;\n```";

    vi.clearAllMocks();
    const result = config.highlight(codeWithNestedBlock, "plaintext");

    // Should not call highlight.js for plaintext with nested code blocks
    expect(mockHljs.highlight).not.toHaveBeenCalled();
    expect(result).toBe(codeWithNestedBlock);
  });

  it("should skip highlighting for txt code blocks with nested code block syntax", () => {
    const config = createHighlightConfig(mockHljs);
    const codeWithNestedBlock = "```typescript\nconst x = 1;\n```";

    vi.clearAllMocks();
    const result = config.highlight(codeWithNestedBlock, "txt");

    // Should not call highlight.js for txt with nested code blocks
    expect(mockHljs.highlight).not.toHaveBeenCalled();
    expect(result).toBe(codeWithNestedBlock);
  });
});

describe("createTypeScriptExecutableBlock", () => {
  let mockHljs: HLJSApi;
  let highlightConfig: ReturnType<typeof createHighlightConfig>;

  beforeEach(() => {
    const knownLanguages: KnownLanguage[] = ["typescript", "javascript", "python", "markdown", "dot", "graphviz"];

    mockHljs = {
      getLanguage: vi.fn((lang: string) => {
        return knownLanguages.includes(lang as KnownLanguage) ? { name: lang } : null;
      }),
      highlight: vi.fn((code: string, options: { language: string }) => {
        return {
          value: `<span class="hljs">${code}</span>`,
          language: options.language,
        };
      }),
    } as unknown as HLJSApi;

    highlightConfig = createHighlightConfig(mockHljs);
  });

  it("should create TypeScript executable block with correct structure", () => {
    const tsCode = "const x = 1;";
    const blockId = "test-block-1";
    const result = renderer.createTypeScriptExecutableBlock(tsCode, blockId, highlightConfig);

    expect(result).toContain(`data-block-id="${blockId}"`);
    expect(result).toContain('class="ts-executable-block"');
    expect(result).toContain('class="ts-run-button"');
    expect(result).toContain('class="ts-output-container"');
    expect(result).toContain('class="ts-code-display"');
    expect(result).toContain('class="typescript"');
    expect(result).toContain('type="application/json"');
    expect(result).toContain(`data-ts-code="${blockId}"`);
  });

  it("should include highlighted code in the output", () => {
    const tsCode = "const x = 1;";
    const blockId = "test-block-2";
    const result = renderer.createTypeScriptExecutableBlock(tsCode, blockId, highlightConfig);

    expect(mockHljs.highlight).toHaveBeenCalledWith(tsCode, { language: "typescript" });
    expect(result).toContain('<span class="hljs">');
  });

  it("should handle code with HTML entities", () => {
    const tsCode = "const x = 1 & 2;";
    const blockId = "test-block-3";
    const result = renderer.createTypeScriptExecutableBlock(tsCode, blockId, highlightConfig);

    expect(result).toContain(blockId);
    expect(mockHljs.highlight).toHaveBeenCalled();
  });

  it("should generate unique block IDs", () => {
    const tsCode = "const x = 1;";
    const blockId1 = "test-block-4";
    const blockId2 = "test-block-5";

    const result1 = renderer.createTypeScriptExecutableBlock(tsCode, blockId1, highlightConfig);
    const result2 = renderer.createTypeScriptExecutableBlock(tsCode, blockId2, highlightConfig);

    expect(result1).toContain(blockId1);
    expect(result2).toContain(blockId2);
    expect(result1).not.toContain(blockId2);
    expect(result2).not.toContain(blockId1);
  });

  it("should include processed code in script tag", () => {
    const tsCode = "const x: number = 1;";
    const blockId = "test-block-6";
    const result = renderer.createTypeScriptExecutableBlock(tsCode, blockId, highlightConfig);

    // The processed code should be in a JSON script tag
    expect(result).toContain('type="application/json"');
    expect(result).toContain('data-ts-code="test-block-6"');
    // The processed code should be JSON stringified
    expect(result).toMatch(/<script[^>]*>.*?<\/script>/s);
  });
});
