---
name: Building This Blog (part 3) - Routing for GitHub Pages (part 2)
date: 2025-12-30
topics:
  - ai
  - debugging
  - building this blog
---

# Building this Blog (part 3) - Routing for GitHub Pages (part 2)

This post covers two related internal linking issues that emerged after deploying to GitHub Pages:

- post-to-post linking
- section linking

It turns out these stem from the same root cause:

> Our routing system wasn't handling internal links correctly!

How annoying... but, this is the path we've chosen!

## The post link bug

### The post link problem

> Post links, e.g. `./building-this-blog-04-testing.md`, were triggering _default browser navigation_ instead of our client-side routing.

Unfortunately, this simply does not work on GitHub Pages.

When a user clicked a link to one blog post from within another post's rendered markdown content, the browser attempted a full page navigation. This worked locally because Vite's dev server handles the routing. However, GitHub Pages does not.

This, of course, critically affected navigation to a post from its URL, linking from one post to another, and simple refreshes. The only way to get to a post was by cliking on it in the sidebar.

### The post link solution

Our solution:

> Intercept link clicks and use the existing routing instead of default browser navigation.

Our implementation uses event delegation on the blog content container to intercept link clicks:

```typescript
private setupLinkInterception(): void {
  this.blogContent.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a");
    if (!link || !link.href) return;

    const url = new URL(link.href, window.location.href);

    // Only intercept same-origin links
    if (url.origin !== window.location.origin) {
      return; // Allow external links to navigate normally
    }

    const linkPathname = url.pathname;
    const linkHash = url.hash;
    const currentPathname = window.location.pathname;

    // Handle hash-only links (section links within current post)
    if (!linkPathname || linkPathname === currentPathname) {
      if (linkHash) {
        e.preventDefault();
        window.history.pushState(
          { postId: this.currentPostId },
          "",
          `${currentPathname}${linkHash}`
        );
        this.scrollToHash(linkHash);
      }
      return;
    }

    // Extract post ID from pathname, accounting for base path
    let potentialPostId: string | null = null;
    if (this.basePath !== "/" && linkPathname.startsWith(this.basePath)) {
      const path = linkPathname.slice(this.basePath.length - 1);
      potentialPostId = path.replace(/^\/|\/$/g, "");
    } else {
      potentialPostId = linkPathname.replace(/^\/|\/$/g, "");
    }

    // Remove .md extension if present
    if (potentialPostId) {
      potentialPostId = potentialPostId.replace(/\.md$/, "");
    }

    // If it's a valid blog post, use SPA routing
    if (potentialPostId && this.allPosts.some((post) => post.id === potentialPostId)) {
      e.preventDefault();
      await this.handlePostClick(potentialPostId, linkHash);
    }
  });
}
```

This implementation:

1. Uses event delegation for efficiency (one listener on the container)
2. Detects clicks on internal blog post links within rendered content
3. Extracts the post ID from the link URL, accounting for the base path
4. Prevents default navigation and uses SPA routing for valid blog posts
5. Handles both relative and absolute paths, and strips `.md` extensions
6. Preserves hash fragments for cross-post section links
7. Allows external links to navigate normally

## The section link bug

> Section links (hash fragments like `#this-blogs-tech-choices`) within blog posts weren't being indexed at all, thus didn't work locally or on GitHub Pages.

### Discovering the Problem

After fixing post-to-post linking, we noticed that section links within posts were completely broken. Clicking a link like `[See the tech choices section](#this-blogs-tech-choices)` did nothing—no scrolling, no navigation, nothing.

Initial investigation revealed two separate issues:

1. **No heading IDs**: When the markdown was converted to HTML, headings weren't getting `id` attributes. Without IDs, there's nothing for hash fragments to link to. The browser couldn't find the target element.

2. **Hash fragments were being ignored**: Even if headings had IDs, the SPA routing system was ignoring hash fragments. When a user clicked a section link or navigated to a URL with a hash fragment, the application would:
   - For _same-post_ section links, load the post but ignore the hash (not scrolling to the section)
   - For _cross-post_ section links, trigger a full page navigation (defeating our SPA routing)

### The Debugging Process

- **Iteration 1: Adding Heading IDs**

  The first fix was straightforward—we needed to generate IDs for headings. We configured Marked.js with a custom renderer to automatically generate IDs from heading text:

  ```typescript
  marked.use({
    renderer: {
      heading({ text, depth }) {
        const plainText = text.replace(/<[^>]*>/g, "");
        const id = plainText
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim();
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      },
    },
  });
  ```

  This worked! Section links could now find their targets. But clicking them still didn't scroll properly.

- **Iteration 2: Handling Hash Fragments in Link Interception**

  We extended the existing link interception to handle hash-only links (section links within the current post). This was a natural extension of the post-to-post link interception we'd already implemented.

- **Iteration 3: The Scrolling Problem**

  Even with IDs and link interception working, we discovered a new issue: when scrolling to a section, the heading would be positioned at the very top of the viewport, but our fixed header and topic bar were covering it!

  The problem was that `scrollIntoView({ block: "start" })` scrolls the element to the top of the viewport, but doesn't account for fixed elements. Users would click a section link, the page would scroll, but the heading would be hidden behind the fixed navigation.

- **Iteration 4: Accounting for Fixed Elements**

  We tried a few approaches:
  1. **JavaScript offset calculation**: Calculate the combined height of header and topic bar, then manually adjust the scroll position. This worked but felt fragile and required hardcoding values.

  2. **CSS `scroll-margin-top`**: A cleaner solution! We added `scroll-margin-top` to headings in the content area, which tells the browser to leave space when scrolling to that element. This automatically accounts for fixed elements:

  ```css
  .blog-card h1,
  .blog-card h2,
  .blog-card h3,
  .blog-card h4,
  .blog-card h5,
  .blog-card h6 {
    scroll-margin-top: calc(var(--sidebar-top-offset) + var(--topics-bar-height));
  }
  ```

  This CSS property ensures that when `scrollIntoView()` is called, the browser automatically accounts for the fixed header and topic bar, positioning the heading just below them.

- **Iteration 5: Waiting for MathJax**

  One more subtle issue: when loading a post with a hash fragment in the URL (e.g., from a direct link or page refresh), we needed to wait for MathJax to finish rendering before scrolling. MathJax can change the height of content, so scrolling too early would result in incorrect positioning.

  We added a small delay after rendering:

  ```typescript
  const hash = window.location.hash;
  if (hash) {
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for MathJax
    this.scrollToHash(hash);
  }
  ```

  This ensures all content is fully rendered before attempting to scroll.

### The Complete Solution

After working through the iterations above, the final solution required:

- A single [_renderer extension_](https://marked.js.org/using_pro#renderer) to generate heading IDs
- Extending link interception to handle hash fragments
- CSS `scroll-margin-top` to account for fixed header and topic bar
- A small delay to wait for MathJax rendering before scrolling
- Preserving hash fragments when navigating between posts

The solution leveraged existing infrastructure:

- **Event delegation**: [Link interception](#the-post-link-solution) was already in place for post-to-post links; we just extended it to handle hash fragments too
- **History API**: [Our routing was already using `pushState`](./building-this-blog-02-routing-for-github-pages-01.md); adding hash fragments was a natural extension
- **Marked.js extensibility**: The renderer API makes it easy to customize heading output

No new dependencies, no complex state management, no architectural changes. Here's what we implemented:

#### 1. Generate heading IDs

We configure marked.js to automatically generate IDs for all headings using a custom renderer:

```typescript
marked.use({
  renderer: {
    heading({ text, depth }) {
      // Strip HTML tags and generate ID (similar to GitHub)
      const plainText = text.replace(/<[^>]*>/g, "");
      const id = plainText
        .toLowerCase()
        .replace(/[^\w\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-") // Replace multiple hyphens with a single hyphen
        .trim();

      const tag = `h${depth}`;
      return `<${tag} id="${id}">${text}</${tag}>\n`;
    },
  },
});
```

This generates IDs that match the format used in markdown section links (e.g. "This blog's tech choices" → `this-blogs-tech-choices`).

#### 2. Handle hash fragments in link interception

We extend the existing link interception to handle hash-only links (section links within the current post):

```typescript
// Handle hash-only links (section links within the current post)
if (!linkPathname || linkPathname === currentPathname) {
  if (linkHash) {
    e.preventDefault();
    window.history.pushState({ postId: this.currentPostId }, "", `${currentPathname}${linkHash}`);
    this.scrollToHash(linkHash);
  }

  return;
}
```

#### 3. Scroll to hash after rendering

We update the post rendering logic to check for hash fragments in the URL and scroll to them after the content is rendered. The delay ensures MathJax has finished rendering, which can affect content height:

```typescript
// Check if there's a hash fragment in the URL and scroll to it
const hash = window.location.hash;
if (hash) {
  await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for MathJax
  this.scrollToHash(hash);
}
```

The `scrollToHash()` method uses `scrollIntoView()`, which works in conjunction with the CSS `scroll-margin-top` we added to headings:

```typescript
private scrollToHash(hash: string): void {
  if (!hash) return;
  const id = hash.slice(1);
  if (!id) return;

  const element = document.getElementById(id);
  if (element) {
    // scroll-margin-top in CSS handles the fixed header/topic bar offset
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
```

#### 4. Preserve hash fragments when navigating

We modify `handlePostClick()` to accept and preserve hash fragments when navigating between posts, so cross-post section links also work correctly:

```typescript
private async handlePostClick(postId: string, hash?: string): Promise<void> {
  // ... load post ...
  const url = `${this.basePath}${postId}${hash || ""}`;
  window.history.pushState({ postId }, "", url);
  // ... render content ...
  if (hash) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.scrollToHash(hash);
  }
}
```

This allows links like `[See the testing section](./building-this-blog-04-testing.md#the-missing-manifest)` to navigate to a different post and automatically scroll to the specified section.

### The Final Result

Post links now work in all scenarios:

- ✅ When loading a post directly from URL
- ✅ When navigating from one post to another
- ✅ Both locally and on GitHub Pages

Section links now work in all scenarios:

- ✅ When loading a post directly with a hash fragment in the URL
- ✅ When navigating from one post to another with a section link
- ✅ Within the same post (e.g. `#this-blogs-tech-choices`)
- ✅ Both locally and on GitHub Pages

The implementation automatically handles all section links, including any future ones added, without requiring any special configuration or maintenance.

[Part 4: Testing](./building-this-blog-04-testing.md)
