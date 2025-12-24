# [blog](https://isaac-defrain.github.io/blog/)

Vanilla TypeScript blog SPA with Markdown support and MathJax rendering.

[![Audit dependencies](https://github.com/Isaac-DeFrain/blog/actions/workflows/audit.yml/badge.svg)](https://github.com/Isaac-DeFrain/blog/actions/workflows/audit.yml)
[![Test coverage](https://github.com/Isaac-DeFrain/blog/actions/workflows/coverage.yml/badge.svg)](https://github.com/Isaac-DeFrain/blog/actions/workflows/coverage.yml)
[![Build and deploy to GitHub Pages](https://github.com/Isaac-DeFrain/blog/actions/workflows/build-deploy.yml/badge.svg)](https://github.com/Isaac-DeFrain/blog/actions/workflows/build-deploy.yml)

## Features

- Dark mode support
- Single Page Application (SPA)
- Custom routing for GitHub Pages
- Markdown rendering with syntax highlighting
- MathJax support for mathematical equations

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

## Tools

- **Nix flakes**: Reproducible dependencies
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **Marked**: Markdown parser
- **MathJax**: Mathematical equation rendering

## License

[MIT LICENSE](./LICENSE)
