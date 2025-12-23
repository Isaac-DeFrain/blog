---
name: Building This Blog (part 2) - Routing for GitHub Pages (part 1)
date: 2025-12-19
topics:
  - building this blog
  - debugging
---

# Building This Blog (part 2) - Routing for GitHub Pages (part 1)

## Overview

This blog evolved from a static, multi-page site with no client-side routing into a dynamic single-page application (SPA) with routing support for GitHub Pages. The implementation required solving several challenges:

1. **Development Server Routing**: Making all routes serve `index.html` during development
2. **GitHub Pages Base Path**: Handling the `/repo-name/` base path for project repositories
3. **Internal Link Interception**: Converting internal links to SPA navigation
4. **Direct URL Navigation**: Supporting direct navigation to blog post URLs, including section links
5. **Page Refresh Handling**: Ensuring page refreshes work correctly on GitHub Pages

We will discuss the first two points in this post. The last three points are discussed in [Building This Blog (part 2) - Routing for GitHub Pages (part 2)](./building-this-blog-03-routing-for-github-pages-02.md)

## Beginnings as a static multi-page app

This blog started with a simple structure:

> each blog post, its own page.

During local development, this meant navigating to different HTML files or markdown files that were rendered separately. The setup was intentionally minimal — just enough to get content displaying in the browser at `localhost:5173/`.

The multi-page architecture worked locally since Vite's dev server can handle individual files. _Ah, these were simpler times. There was no need for complex routing logic._

Each post was its own page. This made the initial implementation simple - but limited.

## Consolidating to a SPA with client-side routing

I found out quickly that GitHub Pages doesn't support non-hash server-side routing for multi-page applications. We needed an SPA.

The consolidation involved:

- **Single entry point**: All blog content would load into a single `index.html` page
- **Dynamic content loading**: Blog posts would be fetched and rendered dynamically using JavaScript
- **State management**: The sidebar, topic filters, and current post selection would persist across navigation
- **Client-side rendering**: Markdown files would be parsed and converted to HTML on the client side using libraries like Marked.js

This architectural change solved the GitHub Pages deployment constraint, and as a bonus, it also eliminated full-page reloads and enabled state persistence across navigation.

However, it introduced a new challenges.

### SPA Routing for GitHub Pages

When the initial GitHub Actions workflow was created ([`fc25fb6`](https://github.com/Isaac-DeFrain/blog/commit/fc25fb6)), it seemed so straightforward. All we needed to do:

- build the project
- deploy to GitHub Pages

However, it was not so strightforward because:

> GitHub Pages doesn't natively support SPA routing!

When a user navigated directly to a URL like `isaac-defrain.github.io/blog/welcome` or refreshed the page, GitHub Pages would return a 404 error because it was looking for an _actual file at that path_ - but this was a _client-side route_.

It turns out:

> When GitHub Pages can't find a file, it serves `404.html` instead.

#### [The 404 Fallback Strategy](https://github.com/Isaac-DeFrain/blog/commit/5471c3d)

We exploited this peculiarity by:

1. Creating a `404.html` file that mirrors the main `index.html` structure.
2. Processing `404.html` during build to inject the base path and ensure all assets load correctly.
3. Making `404.html` load the SPA, which then reads the original pathname from the URL and routes accordingly.

This almost worked! One tiny problem - assets were not loading properly.

### Base Path Injection for GitHub Pages

GitHub Pages stores assets differently than Vite's dev server:

> Project repositories are served from `/repo-name/` rather than the root `/`.

We needed to make this base path available while fetching our blog posts. In order to achieve this, we needed to modify the build process to:

- Detect the repository name from the `GITHUB_REPOSITORY` environment variable available
- Inject a global base path variable into both `index.html` and `404.html`
- Update all asset paths to include the base path when needed

<!-- TODO refreshes and direct URL routing -->

### Vite Plugin Architecture

The implementation used custom Vite plugins:

- **`spa-fallback`**: Handles SPA routing in development
- **`copy-blog-files`**: Ensures blog markdown files are available at runtime
- **`process-404`**: Processes `404.html` with base path injection and asset path rewriting

<!--
### Challenge 1: SPA Routing Not Supported

The most significant challenge was that **GitHub Pages doesn't natively support SPA routing**. When users navigated directly to a route like `/welcome` or refreshed the page, GitHub Pages would return a 404 error because it was looking for an actual file at that path, not understanding that this was a client-side route handled by JavaScript.

**Solution**: We leveraged GitHub Pages' special behavior where it serves
`404.html` when a file isn't found. By creating a `404.html` file that mirrors
the main `index.html` structure and processes it during build to inject the
base path, we ensure that any "missing" route loads the SPA, which then reads
the original pathname from the URL and routes accordingly. This solution is
detailed in [part 2 of this series](building-this-blog-02-routing-for-github-pages.md).

### Challenge 2: Base Path Configuration

GitHub Pages serves project repositories from `/repo-name/` rather than the
root `/`. This means all asset paths, API calls, and routing logic needed to
account for this base path. Without proper handling, assets wouldn't load and
routing would break.

**Solution**: The build process detects the repository name from the
`GITHUB_REPOSITORY` environment variable and injects `window.__BASE_PATH__` as a
global variable into both `index.html` and `404.html`. The application code
then uses this base path when constructing fetch URLs and managing navigation.
Vite's `base` configuration is also set to ensure asset paths are correctly
prefixed.

### Challenge 3: Script Injection Timing

A subtle but critical bug emerged where blog posts failed to load because
`window.__BASE_PATH__` wasn't available when the application code executed.
The base path injection script was initially placed just before the closing
`</head>` tag, but Vite's module scripts were loading earlier, causing the
application to run before the base path was defined.

**Solution**: The script injection point was moved to immediately after the
opening `<head>` tag, ensuring the base path variable is defined before any
module scripts execute. This fix was applied to both `index.html` and
`404.html` processing. The details of this debugging process are covered in
[part 3 of this series](building-this-blog-03-script-injection.md).

### Challenge 4: Build-Time Processing

Multiple build-time transformations were needed:

- Injecting base path into HTML files
- Processing `404.html` with path rewriting for assets
- Copying blog markdown files to the dist directory
- Generating a manifest file listing all blog posts

**Solution**: Custom Vite plugins handle all these transformations during the
build process. The plugins run at different stages (buildStart, transformIndexHtml,
closeBundle) to ensure proper ordering and availability of files. This approach
keeps the source code clean while generating production-ready artifacts.
-->

<!--
# SPA Routing for GitHub Pages: Complete Implementation Analysis

This document provides a comprehensive analysis of all iterations and changes made to implement Single Page Application (SPA) routing support for GitHub Pages deployment.

## Overview

The blog application evolved from a basic static site to a fully functional SPA with proper routing support for GitHub Pages. The implementation required solving several challenges:

1. **Development Server Routing**: Making all routes serve `index.html` during development
2. **GitHub Pages Base Path**: Handling the `/repo-name/` base path for project repositories
3. **Internal Link Interception**: Converting internal links to SPA navigation
4. **Direct URL Navigation**: Supporting direct navigation to blog post URLs
5. **Page Refresh Handling**: Ensuring page refreshes work correctly on GitHub Pages

## Iteration Timeline

### Iteration 1: Initial SPA Routing Support (Commit `ee1762b`)

**Objective**: Enable basic SPA routing in the development environment.

**Changes**:

- Created `vite.config.ts` with a custom `spa-fallback` plugin
- Configured Vite dev server middleware to serve `index.html` for all routes
- Added logic to skip static assets (files with extensions, `/src/`, `/styling/`, `/assets/`, `/node_modules/`)
- Updated `blog.ts` to handle browser navigation events (`popstate`)

**Key Implementation**:

///typescript
// vite.config.ts - spa-fallback plugin
configureServer(server) {
  return () => {
    server.middlewares.use((req, res, next) => {
      const url = req.url || "";
      // Skip static assets
      if (url.startsWith("/src/") || url.startsWith("/styling/") || ...) {
        return next();
      }
      // Serve index.html for all other routes
      const indexHtml = readFileSync(join(process.cwd(), "index.html"), "utf-8");
      res.setHeader("Content-Type", "text/html");
      res.end(indexHtml);
    });
  };
}
///

**Limitations**:

- Only worked in development (Vite dev server)
- No support for GitHub Pages base path
- No handling for direct URL navigation on GitHub Pages
- No 404.html fallback mechanism

---

### Iteration 2: GitHub Pages Base Path Support (Commit `5471c3d`)

**Objective**: Add support for GitHub Pages base path and production deployment.

**Changes**:

- Added `getBasePath()` function to extract repository name from `GITHUB_REPOSITORY` environment variable
- Configured Vite `base` option to use the calculated base path
- Created `404.html` as a fallback page (initially a full blog page)
- Added `copy-blog-files` plugin to copy blog markdown files to `dist/` directory
- Added `process-404` plugin to inject base path into `404.html` during build
- Updated CI workflow to remove static site generator configuration

**Key Implementation**:

///typescript
// Base path detection
function getBasePath(): string {
  const repo = process.env.GITHUB_REPOSITORY;
  if (repo) {
    const repoName = repo.split("/")[1];
    return `/${repoName}/`;
  }
  return "/";
}

// Base path injection into 404.html
if (basePath !== "/") {
  html = html.replace(/(href|src)="\/([^"]*)"/g, (match, attr, path) => {
    if (path.startsWith("/") || path.startsWith("http")) {
      return match;
    }
    return `${attr}="${basePath}${path}"`;
  });
}
///

**Improvements**:

- ✅ Base path support for GitHub Pages project repositories
- ✅ Blog files copied to dist directory
- ✅ 404.html created as fallback

**Remaining Issues**:

- 404.html was a full page copy, not a redirect mechanism
- Base path not accessible to client-side JavaScript
- No handling of direct URL navigation on GitHub Pages

---

### Iteration 3: Base Path Injection for Client-Side Routing (Commit `5a40dd0`)

**Objective**: Make base path available to client-side code and update routing logic.

**Changes**:

- Added `inject-base-path` plugin to inject `window.__BASE_PATH__` global variable
- Updated `BlogReader` class to use base path for:
  - Fetching blog posts (`/posts/index.json`, `/posts/${post.file}`)
  - Extracting post IDs from URL pathnames
  - Updating URLs with `pushState`
- Modified `getPostIdFromPath()` to strip base path from pathname before extracting post ID

**Key Implementation**:

///typescript
// Base path injection
transformIndexHtml(html) {
  const basePathScript = `<script>window.__BASE_PATH__ = ${JSON.stringify(basePath)};</script>`;
  return html.replace("</head>", `${basePathScript}</head>`);
}

// Client-side base path usage
function getBasePath(): string {
  // @ts-expect-error - Injected by build process
  return window.__BASE_PATH__ || "/";
}

// Path extraction with base path awareness
private getPostIdFromPath(): string | null {
  const pathname = window.location.pathname;
  let path = pathname;
  if (this.basePath !== "/" && pathname.startsWith(this.basePath)) {
    path = pathname.slice(this.basePath.length - 1);
  }
  const postId = path.replace(/^\/|\/$/g, "");
  return postId || null;
}
///

**Improvements**:

- ✅ Client-side code can access base path
- ✅ All fetch requests use base path
- ✅ URL pathname parsing accounts for base path
- ✅ History API updates include base path

**Remaining Issues**:

- Direct navigation to blog post URLs on GitHub Pages still returns 404
- Page refresh on blog post URLs doesn't work
- Internal links in blog posts still cause full page reloads

---

### Iteration 4: Internal Link Interception (Commit `2f751ef`)

**Objective**: Intercept internal blog post links and use SPA routing instead of full page navigation.

**Changes**:

- Added `setupLinkInterception()` method to `BlogReader` class
- Implemented event delegation on blog content container
- Added logic to:
  - Detect clicks on internal links (same origin)
  - Extract post ID from link pathname (accounting for base path)
  - Remove `.md` extension if present
  - Verify post ID exists in blog posts list
  - Prevent default navigation and use SPA routing instead

**Key Implementation**:

///typescript
private setupLinkInterception(): void {
  this.blogContent.addEventListener("click", async (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a");
    if (!link || !link.href) return;

    const url = new URL(link.href, window.location.href);

    // Only intercept same-origin links
    if (url.origin !== window.location.origin) {
      return;
    }

    // Extract post ID from pathname
    let potentialPostId: string | null = null;
    if (this.basePath !== "/" && linkPathname.startsWith(this.basePath)) {
      const path = linkPathname.slice(this.basePath.length - 1);
      potentialPostId = path.replace(/^\/|\/$/g, "");
    }

    // Remove .md extension if present
    if (potentialPostId) {
      potentialPostId = potentialPostId.replace(/\.md$/, "");
    }

    // Check if post exists and use SPA routing
    if (potentialPostId && this.allPosts.some((post) => post.id === potentialPostId)) {
      e.preventDefault();
      e.stopPropagation();
      await this.handlePostClick(potentialPostId);
    }
  });
}
///

**Improvements**:

- ✅ Internal links use SPA routing (no page reload)
- ✅ External links work normally
- ✅ Base path-aware link parsing
- ✅ Handles `.md` extension in links

**Remaining Issues**:

- Direct URL navigation on GitHub Pages still returns 404
- Page refresh on blog post URLs doesn't work
- 404.html is still a full page, not a redirect mechanism

---

### Iteration 5: [spa-github-pages](https://github.com/rafgraph/spa-github-pages) Pattern Implementation (Commit `044b7e8`)

**Objective**: Implement the spa-github-pages pattern to handle direct URL navigation and page refreshes.

**Changes**:

- Replaced full-page `404.html` with minimal redirect script
- Implemented spa-github-pages redirect pattern in `404.html`:
  - Converts pathname to query string format (`/?/path`)
  - Redirects to `index.html` with path in query string
- Added URL restoration script in `index.html`:
  - Detects redirect in query string
  - Restores original pathname using `history.replaceState`
  - Handles base path correctly

**Key Implementation**:

///html
// 404.html - Redirect script
<script>
  var pathSegmentsToKeep = 0;
  var l = window.location;
  l.replace(
    l.protocol + '//' + l.hostname + ... +
    '/?/' + l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
    (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
    l.hash
  );
</script>

// index.html - Restoration script
<script>
  (function (l) {
    if (l.search[1] === "/") {
      var decoded = l.search
        .slice(1)
        .split("&")
        .map(function (s) {
          return s.replace(/~and~/g, "&");
        })
        .join("?");
      window.history.replaceState(null, "/" + decoded + l.hash);
    }
  })(window.location);
</script>
///

**Improvements**:

- ✅ Direct URL navigation works on GitHub Pages
- ✅ Page refresh works on blog post URLs
- ✅ Minimal 404.html (just redirect script)

**Remaining Issues**:

- Base path not properly handled in redirect/restoration scripts
- `pathSegmentsToKeep` hardcoded to 0 (should account for base path)

---

### Iteration 6: Base Path-Aware Redirect Fix (Commit `e2edee1`)

**Objective**: Fix base path handling in redirect and restoration scripts.

**Changes**:

- Updated `process-404` plugin to:
  - Inject base path into `404.html` before processing
  - Calculate `pathSegmentsToKeep` based on base path segments
  - Update redirect script with correct `pathSegmentsToKeep` value
- Enhanced restoration script in `index.html` to:
  - Use `window.__BASE_PATH__` if available
  - Handle base path in decoded path
  - Remove duplicate base path segments if present
  - Normalize path construction with proper slash handling
- Improved `getPostIdFromPath()` with better base path normalization
- Fixed base path injection format (use string instead of JSON.stringify for script tag)

**Key Implementation**:

///typescript
// Calculate pathSegmentsToKeep from base path
const pathSegmentsToKeep = basePath.split("/").filter((segment) => segment.length > 0).length;
html = html.replace(/var pathSegmentsToKeep = \d+;/, `var pathSegmentsToKeep = ${pathSegmentsToKeep};`);

// Enhanced restoration script
var basePath = (typeof window !== "undefined" && window.__BASE_PATH__) || "/";
var path = decoded.startsWith("/") ? decoded.slice(1) : decoded;

// Remove base path segments if already present
if (basePath !== "/") {
  var basePathSegments = basePath.split("/").filter((s) => s.length > 0);
  var pathSegments = path.split("/").filter((s) => s.length > 0);

  var startsWithBasePath =
    basePathSegments.length > 0 &&
    pathSegments.length >= basePathSegments.length &&
    basePathSegments.every((segment, i) => segment === pathSegments[i]);

  if (startsWithBasePath) {
    path = pathSegments.slice(basePathSegments.length).join("/");
  }
}

// Construct restored path with proper normalization
var restoredPath;
if (basePath === "/") {
  restoredPath = "/" + path;
} else {
  var normalizedBasePath = basePath.replace(/\/$/, "");
  restoredPath = normalizedBasePath + "/" + path;
}
restoredPath = restoredPath.replace(/\/+/g, "/");
///

**Improvements**:

- ✅ Base path correctly handled in redirect mechanism
- ✅ Path restoration accounts for base path
- ✅ Handles edge cases (empty paths, duplicate base paths)
- ✅ Proper path normalization

---

## Final Architecture

### Build-Time Processing

1. **Base Path Detection**: Extracted from `GITHUB_REPOSITORY` environment variable
2. **Vite Base Configuration**: Set via `base` option for asset paths
3. **Base Path Injection**: Injected as `window.__BASE_PATH__` in both `index.html` and `404.html`
4. **404.html Processing**:
   - Base path injected
   - `pathSegmentsToKeep` calculated and injected
   - Asset paths updated if base path is not root
5. **Blog Files Copying**: Blog markdown files copied to `dist/posts/`

### Runtime Behavior

1. **Direct URL Navigation**:
   - GitHub Pages serves `404.html` for unknown routes
   - `404.html` redirects to `/?/path` format
   - `index.html` restoration script converts query string back to pathname
   - `BlogReader` reads pathname and loads appropriate post

2. **SPA Navigation**:
   - Internal link clicks intercepted
   - Post ID extracted from link pathname
   - `handlePostClick()` called with SPA routing
   - URL updated via `history.pushState()`

3. **Browser Navigation**:
   - Back/forward buttons trigger `popstate` event
   - `BlogReader` reads pathname and loads post
   - No page reload occurs

### Key Components

- **`vite.config.ts`**: Build configuration with 5 custom plugins
- **`404.html`**: Minimal redirect page for GitHub Pages
- **`index.html`**: Main SPA entry point with restoration script
- **`src/blog.ts`**: Client-side routing logic with base path awareness

## Testing Scenarios Covered

- ✅ Direct navigation to blog post URLs
- ✅ Page refresh on blog post URLs
- ✅ Browser back/forward navigation
- ✅ Internal link clicks in blog content
- ✅ External link clicks (should work normally)
- ✅ Root path navigation
- ✅ Base path handling (for project repositories)
- ✅ Development server routing

## Conclusion

The implementation evolved through 6 major iterations, each addressing specific challenges:

1. **Development routing** → Basic SPA support
2. **Base path support** → GitHub Pages compatibility
3. **Client-side base path** → Dynamic routing
4. **Link interception** → Seamless navigation for post and sections links
5. **Redirect pattern** → Direct URL support
6. **Base path fixes** → Complete solution
-->

<!--
Commit [`5a40dd0`](https://github.com/Isaac-DeFrain/blog/commit/5a40dd0)
further refined the routing by updating `BlogReader` to:

- Utilize the injected base path for fetching blog posts
- Correctly extract post IDs from paths considering the base path
- Ensure all URL management respects the base path

This ensured that whether the app was running locally (at `/`) or on GitHub
Pages (at `/blog/`), routing worked seamlessly.

## The Script Injection Timing Bug

A subtle but critical bug emerged causing blog posts to fail to load properly.
The issue was with the timing of when `window.__BASE_PATH__` was made
available to the application code.

**The Problem**:

The base path injection plugin was inserting the script tag just before the
closing `</head>` tag. However, Vite's build process was adding module script
tags earlier in the head, which meant the module scripts could execute before
`window.__BASE_PATH__` was defined. When the blog application code ran, it
would try to access `window.__BASE_PATH__` to construct fetch paths for blog
posts, but the variable was `undefined`, causing all fetch requests to fail.

**The Solution**:

The fix involved two key changes:

1. **Moving the script injection point**: Instead of inserting the base path
   script before `</head>`, it's now injected immediately after the opening
   `<head>` tag. This ensures the script executes before any module scripts,
   guaranteeing that `window.__BASE_PATH__` is available when the application
   code runs.

2. **Updating the Vite plugin API**: The plugin was updated to use the
   current Vite 6 API (`order: "pre"` and `handler` instead of the deprecated
   `enforce` and `transform` options), ensuring compatibility and removing
   deprecation warnings.

This fix was applied to both the main `index.html` and the `404.html`
processing, ensuring consistent behavior across all entry points. The lesson
here is that script execution order matters, especially when dealing with
build-time code injection and module loading.
-->

<!-- # Building This Blog (part 2) - SPA Routing

With the application consolidated into an SPA, the next logical step was
adding proper routing. Commit
[`ee1762b`](https://github.com/Isaac-DeFrain/blog/commit/ee1762b) introduced
SPA routing support:

- Added `vite.config.ts` with an SPA fallback plugin
- Configured the dev server to serve `index.html` for all routes
- Updated `blog.ts` to handle browser navigation (popstate events)
- Enabled URL-based post navigation (e.g., `/welcome`)

This worked beautifully in local development. But then came the deployment challenge.

## The GitHub Pages Deployment Puzzle

When the initial GitHub Actions workflow was created
([`fc25fb6`](https://github.com/Isaac-DeFrain/blog/commit/fc25fb6)), it seemed
straightforward: build the project and deploy to GitHub Pages. However, a
critical issue emerged: **GitHub Pages doesn't natively support SPA routing**.

When users navigated directly to a route like `/welcome` or refreshed the
page, GitHub Pages would return a 404 error because it was looking for an
actual file at that path, not understanding that this was a client-side route.

## The Solution: A 404 Fallback

The breakthrough came in commit
[`5471c3d`](https://github.com/Isaac-DeFrain/blog/commit/5471c3d) - "ci: support
SPA routing". This commit implemented a sophisticated solution:

### The 404.html Strategy

GitHub Pages has a special feature: when it can't find a file, it serves
`404.html` instead. We exploit this by:

1. **Creating a 404.html file** that mirrors the main `index.html` structure.
2. **Processing 404.html during build** to inject the base path and ensure all
   assets load correctly.
3. **Making 404.html load the SPA**, which then reads the original pathname
   from the URL and routes accordingly.

### Base Path Injection

The solution also addressed another GitHub Pages quirk:

> Project repositories are served from `/repo-name/` rather than the root `/`.

The build process:

- Detects the repository name from `GITHUB_REPOSITORY` environment variable
- Injects `window.__BASE_PATH__` as a global variable into both `index.html`
  and `404.html`
- Updates all asset paths to include the base path when needed

### Vite Plugin Architecture

The implementation used custom Vite plugins:

- **`spa-fallback`**: Handles SPA routing in development
- **`inject-base-path`**: Injects the base path into the HTML
- **`copy-blog-files`**: Ensures blog markdown files are available at runtime
- **`process-404`**: Processes `404.html` with base path injection and asset
  path rewriting

<!--
TODO discuss `/posts/manifest.json` for static hosting - cursor says:

The blog reader:

- Fetches manifest.json to get the list of markdown files
- Uses that list to load and parse each blog post

Is it Strictly Necessary?

Not strictly necessary, but it provides:

- Single source of truth for available posts
- Build-time validation (tests verify all posts are included)
- Consistent ordering (files are sorted alphabetically)
- Works in static hosting environments where directory listing isn't available

The manifest is auto-generated by the Vite plugin (in both dev and build modes), so you don't need to maintain it manually. The plugin scans the posts/ directory and generates the manifest automatically.
-->

<!--
### Challenge 1: SPA Routing Not Supported

The most significant challenge was that **GitHub Pages doesn't natively support SPA routing**. When users navigated directly to a route like `/welcome` or refreshed the page, GitHub Pages would return a 404 error because it was looking for an actual file at that path, not understanding that this was a client-side route handled by JavaScript.

**Solution**: We leveraged GitHub Pages' special behavior where it serves
`404.html` when a file isn't found. By creating a `404.html` file that mirrors
the main `index.html` structure and processes it during build to inject the
base path, we ensure that any "missing" route loads the SPA, which then reads
the original pathname from the URL and routes accordingly. This solution is
detailed in [part 2 of this series](building-this-blog-02-routing-for-github-pages.md).

### Challenge 2: Base Path Configuration

GitHub Pages serves project repositories from `/repo-name/` rather than the
root `/`. This means all asset paths, API calls, and routing logic needed to
account for this base path. Without proper handling, assets wouldn't load and
routing would break.

**Solution**: The build process detects the repository name from the
`GITHUB_REPOSITORY` environment variable and injects `window.__BASE_PATH__` as a
global variable into both `index.html` and `404.html`. The application code
then uses this base path when constructing fetch URLs and managing navigation.
Vite's `base` configuration is also set to ensure asset paths are correctly
prefixed.

### Challenge 3: Script Injection Timing

A subtle but critical bug emerged where blog posts failed to load because
`window.__BASE_PATH__` wasn't available when the application code executed.
The base path injection script was initially placed just before the closing
`</head>` tag, but Vite's module scripts were loading earlier, causing the
application to run before the base path was defined.

**Solution**: The script injection point was moved to immediately after the
opening `<head>` tag, ensuring the base path variable is defined before any
module scripts execute. This fix was applied to both `index.html` and
`404.html` processing. The details of this debugging process are covered in
[part 3 of this series](building-this-blog-03-script-injection.md).

### Challenge 4: Build-Time Processing

Multiple build-time transformations were needed:

- Injecting base path into HTML files
- Processing `404.html` with path rewriting for assets
- Copying blog markdown files to the dist directory
- Generating a manifest file listing all blog posts

**Solution**: Custom Vite plugins handle all these transformations during the
build process. The plugins run at different stages (buildStart, transformIndexHtml,
closeBundle) to ensure proper ordering and availability of files. This approach
keeps the source code clean while generating production-ready artifacts.
-->

The final iteration provides a robust SPA routing system that works in both development and production (GitHub Pages) environments, with proper handling of base paths, direct URL navigation, page refreshes, and internal link interception.

[Part 3: Routing for GitHub Pages (part 2)](./building-this-blog-03-routing-for-github-pages-02.md)
