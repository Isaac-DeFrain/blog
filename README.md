# [blog](https://isaac-defrain.github.io/blog/)

Vanilla TypeScript blog SPA with Markdown support, MathJax rendering, and Mermaid diagrams.

[![Build and deploy](https://github.com/Isaac-DeFrain/blog/actions/workflows/build-deploy.yml/badge.svg)](https://github.com/Isaac-DeFrain/blog/actions/workflows/build-deploy.yml)

## Features

- Dark mode support
- Single Page Application (SPA)
- Custom routing for GitHub Pages
- Markdown rendering with syntax highlighting
- MathJax support for mathematical equations
- Mermaid diagram support
- Executable TypeScript code blocks with live execution

## Setup

Install [Nix](https://nixos.org/) and enable [flakes](https://nixos.wiki/wiki/Flakes)

```bash
nix develop
```

Once in the dev shell, install Node.js dependencies

```bash
npm install
```

## Development

Start the dev server

```bash
npm run dev
```

The site will open at `http://localhost:5173` and reload automatically when files change.

## Build

Create a production build

```bash
npm run build
```

Output will be in the `dist/` folder.

## Preview

Preview the production build locally

```bash
npm run preview
```

## Testing

Run all tests

```bash
npm test
```

## Adding New Blog Posts

1. Create a new markdown file in `posts/` (e.g. `my-post.md`)
2. Add frontmatter to the markdown file with metadata:

```markdown
---
name: My Awesome Post
date: 2024-01-20
topics:
  - Technology
  - Programming
---

# My Awesome Post

Your content here...
```

The post ID is automatically generated from the filename (e.g. `my-post.md` becomes `my-post`). Posts are automatically sorted by date in reverse chronological order.

## Markdown Features

- **Headers**: `#`, `##`, `###`
- **Code blocks**: Fenced with triple backticks
- **Inline code**: Wrapped in single backticks
- **Links**: `[text](url)` (external/internal)
- **Lists**: Ordered and unordered
- **Blockquotes**: `> text`
- **Inline math**: `$equation$`
- **Display math**: `$$equation$$`
- **Mermaid diagrams**: Fenced code blocks with `mermaid` language identifier
- **Executable TypeScript**: Fenced code blocks with `typescript:run` language identifier

### Executable TypeScript Code Blocks

You can create interactive, executable TypeScript code blocks in your blog posts. These blocks compile and execute TypeScript code in a sandboxed Web Worker environment.

**Usage:**

````markdown
```typescript:run
const add = (x: number, y: number) => x + y;
const x = 19;
const y = 23;
console.log(`${x} + ${y} = ${add(x, y)}`);
```
````

**Features:**

- Compiles TypeScript to JavaScript using the TypeScript compiler (loaded from CDN)
- Executes code in a Web Worker for sandboxing and isolation
- Captures `console.log`, `console.error`, `console.warn`, and `console.info` output
- Shows compilation diagnostics (errors and warnings)
- Provides a `render()` function for HTML output
- Automatically filters false-positive errors for DOM globals (`console`, `window`, `document`, etc.) that exist at runtime
- 10-second execution timeout for safety

**Compiler Options:**

- Target: ES2020
- Module: ES2020
- Libraries: ES2020, DOM
- Strict mode: disabled
- Skip lib check: enabled

## Tools

- **Nix flakes**: Reproducible dependencies
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **Marked**: Markdown parser
- **MathJax**: Mathematical equation rendering
- **Mermaid**: Diagram and flowchart rendering
- **TypeScript Compiler (CDN)**: Runtime TypeScript compilation for executable code blocks

## License

[MIT LICENSE](./LICENSE)
