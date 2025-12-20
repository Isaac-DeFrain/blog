/**
 * Test fixtures - sample markdown and frontmatter data
 */

/**
 * Sample valid frontmatter
 */
export const validFrontmatter = `---
name: Test Blog Post
date: 2024-01-15
topics:
  - testing
  - development
---`;

/**
 * Sample markdown content
 */
export const sampleMarkdown = `# Test Blog Post

This is a test blog post with some content.

## Section 1

Here's some text with \`inline code\`.

\`\`\`typescript
function test() {
  return "hello";
}
\`\`\`

## Section 2

More content here.`;

/**
 * Sample markdown with frontmatter
 */
export const sampleMarkdownWithFrontmatter = `${validFrontmatter}

${sampleMarkdown}`;

/**
 * Sample markdown with MathJax
 */
export const sampleMarkdownWithMath = `${validFrontmatter}

# Math Post

Inline math: $E = mc^2$

Display math:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$`;

/**
 * Sample markdown with code blocks
 */
export const sampleMarkdownWithCodeBlocks = `${validFrontmatter}

# Code Post

\`\`\`typescript
interface User {
  name: string;
  age: number;
}
\`\`\`

\`\`\`python
def hello():
    print("world")
\`\`\`

\`\`\`javascript
const x = 42;
\`\`\``;

/**
 * Sample markdown with links
 */
export const sampleMarkdownWithLinks = `${validFrontmatter}

# Links Post

[Internal link](./other-post.md)
[External link](https://example.com)
[Section link](#section-1)

## Section 1

Content here.`;

/**
 * Invalid frontmatter examples
 */
export const invalidFrontmatterExamples = {
  missingDelimiters: `name: Test
date: 2024-01-15`,
  malformedYaml: `---
name: Test
date: 2024-01-15
topics:
  - item1
    - item2
---`,
  empty: ``,
  noNewline: `---name: Test---`,
};

