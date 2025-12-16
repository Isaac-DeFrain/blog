# Blog Reader

TypeScript blog reader with Markdown support and MathJax rendering.

## Features

- Responsive design
- Dark mode support
- TypeScript strict mode
- Built with Vite for fast development
- Markdown rendering with syntax highlighting
- MathJax support for mathematical equations

## Setup

Install dependencies

```bash
npm install
```

## Development

Start the dev server

```bash
npm run dev
```

The site will open at `http://localhost:5173`

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

## Adding New Blog Posts

1. Create a new markdown file in `src/blogs/` (e.g., `my-post.md`)
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

The post ID is automatically generated from the filename (e.g., `my-post.md`
becomes `my-post`). Posts are automatically sorted by date in reverse
chronological order.

## Markdown Features

- **Headers**: `#`, `##`, `###`
- **Code blocks**: Fenced with triple backticks
- **Inline code**: Wrapped in single backticks
- **Links**: `[text](url)`
- **Lists**: Ordered and unordered
- **Blockquotes**: `> text`
- **Inline math**: `$equation$`
- **Display math**: `$$equation$$`

## Tools

- **Nix**: Determinate dependencies
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **Marked**: Markdown parser
- **MathJax**: Mathematical equation rendering
