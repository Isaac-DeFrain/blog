# Blog Reader

A beautiful TypeScript blog reader with Markdown support and MathJax rendering.

## Features

- Dark mode support
- Markdown rendering with syntax highlighting
- MathJax support for mathematical equations
- **External markdown posts** - Add posts from any URL
- Responsive design
- Built with Vite for fast development
- TypeScript strict mode
- Theme persistence with `localStorage`
- Local storage for external posts

## Setup

Install dependencies:

```bash
npm install
```

## Development

Start the dev server:

```bash
npm run dev
```

The site will open at `http://localhost:5173`.

## Build

Create a production build:

```bash
npm run build
```

Output will be in the `dist/` folder.

## Preview

Preview the production build locally:

```bash
npm run preview
```

## Adding New Blog Posts

### Method 1: Local Posts (Traditional)

1. Create a new markdown file in `src/blogs/` (e.g., `my-post.md`)
2. Add an entry to `src/blogs/index.json`:

```json
{
  "id": "my-post",
  "title": "My Awesome Post",
  "date": "2024-01-20",
  "file": "my-post.md"
}
```

### Method 2: External Posts (New!)

1. Click the **"📎 Add Link"** button in the blog sidebar
2. Enter the URL to any publicly accessible markdown file
3. Click **"Add Post"**

The post will be fetched, stored in local storage, and appear in your
Recent Posts list!

**Example URLs to try:**

- `http://localhost:5173/test-external.md` (local test file)
- `https://raw.githubusercontent.com/github/docs/main/README.md` (GitHub README)

External posts are marked with "• External" and stored in your browser's local storage.

Posts are automatically sorted by date in reverse chronological order.

## Markdown Features

- **Headers**: `#`, `##`, `###`
- **Code blocks**: Fenced with triple backticks
- **Inline code**: Wrapped in single backticks
- **Links**: `[text](url)`
- **Lists**: Ordered and unordered
- **Blockquotes**: `> text`
- **Inline math**: `$equation$`
- **Display math**: `$$equation$$`

## Project Structure

```txt
blog/
├── index.html          # Landing page
├── blog.html           # Blog reader page
├── src/
│   ├── main.ts         # Landing page controller
│   ├── blog.ts         # Blog reader logic
│   └── blogs/          # Blog posts directory
│       ├── index.json  # Blog post index
│       └── *.md        # Markdown blog posts
├── package.json
├── tsconfig.json
└── README.md
```

## Technologies

- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **Marked**: Markdown parser
- **MathJax**: Mathematical equation rendering
- **CSS Custom Properties**: For theming
