---
name: Building this Blog
date: 2025-12-14
topics:
  - blog
---

# Building this Blog: A Story from Git History

## Humble Beginning

The journey started with a simple idea: build a personal blog. The initial
commit ([`8d0ac5a`](https://github.com/Isaac-DeFrain/blog/commit/8d0ac5a)) laid
the foundation, and soon after came the project setup
([`74e3ef2`](https://github.com/Isaac-DeFrain/blog/commit/74e3ef2)) that would
become the backbone of this modern, client-side blog application.

## Building the Foundation

The early commits show a thoughtful approach to architecture:

- **Extracting CSS**
  ([`3a390aa`](https://github.com/Isaac-DeFrain/blog/commit/3a390aa)): Moving
  styles to external files, following best practices
- **Consolidating to SPA**
  ([`4ddd3c2`](https://github.com/Isaac-DeFrain/blog/commit/4ddd3c2)):
  Transforming from multiple pages into a single-page application
- **Adding Topics Filtering**
  ([`909b333`](https://github.com/Isaac-DeFrain/blog/commit/909b333)): Enhancing
  user experience with content filtering
- **Modularizing MathJax**
  ([`6a1f260`](https://github.com/Isaac-DeFrain/blog/commit/6a1f260)): Extracting
  MathJax logic into a separate module for better code organization

## The SPA Routing Challenge

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
`404.html` instead. The solution leveraged this by:

1. **Creating a 404.html file** that mirrors the main `index.html` structure
2. **Processing 404.html during build** to inject the base path and ensure all
   assets load correctly
3. **Making 404.html load the SPA**, which then reads the original pathname
   from the URL and routes accordingly

### Base Path Injection

The solution also addressed another GitHub Pages quirk:

> project repositories are served from `/repo-name/` rather than the root.

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

## Refining the Solution

Commit [`5a40dd0`](https://github.com/Isaac-DeFrain/blog/commit/5a40dd0)
further refined the routing by updating `BlogReader` to:

- Utilize the injected base path for fetching blog posts
- Correctly extract post IDs from paths considering the base path
- Ensure all URL management respects the base path

This ensured that whether the app was running locally (at `/`) or on GitHub
Pages (at `/blog/`), routing worked seamlessly.

## The Script Injection Timing Issue

A subtle but critical bug emerged where blog posts failed to load properly.
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

## The CI/CD Deployment Pipeline

The deployment process is orchestrated through GitHub Actions, defined in
`.github/workflows/deploy.yml`. This workflow ensures that every push to the
`main` branch automatically builds and deploys the blog to GitHub Pages.

### Workflow Triggers

The workflow activates in two scenarios:

- **Automatic**: On every push to the `main` branch
- **Manual**: Via `workflow_dispatch`, allowing manual triggers from the
  GitHub Actions UI

### Build Job: From Source to Artifact

The build job runs on `ubuntu-latest` and follows a carefully orchestrated sequence:

1. **Checkout** (`actions/checkout@v4`): Clones the repository into the GitHub
   Actions runner

2. **Install Nix** (`DeterminateSystems/nix-installer-action@main`): Sets up
   the Nix package manager, which provides a reproducible development
   environment defined in `flake.nix`. This ensures the exact same Node.js
   version (24) and tools are used in CI as in local development.

3. **Setup Pages** (`actions/configure-pages@v5`): Configures the GitHub Pages
   environment, preparing it to receive the deployment artifact.

4. **Restore Cache** (`actions/cache@v4`): Implements an intelligent caching
   strategy:
   - Caches both `.vite/cache` (Vite's build cache) and `node_modules`
     (dependencies)
   - Cache key includes the OS, package lock file hash, and source file
     hashes
   - If packages haven't changed but source files have, restores from a
     partial cache
   - This dramatically speeds up builds when only code changes, not
     dependencies

5. **Install Dependencies**: Runs `nix develop --command npm ci` to install
   dependencies within the Nix shell. The `npm ci` command ensures a clean,
   reproducible install based on `package-lock.json`.

6. **Build with Vite**: Executes `nix develop --command npm run build`, which:
   - Runs TypeScript type checking (`tsc`)
   - Builds the application with Vite (`vite build`)
   - During this step, Vite's custom plugins execute:
     - Base path detection from `GITHUB_REPOSITORY` environment variable
     - HTML injection of `window.__BASE_PATH__`
     - Processing of `404.html` with path rewriting
     - Copying blog markdown files to the dist directory
   - Outputs the production-ready static files to the `./dist` directory

7. **Upload Artifact** (`actions/upload-pages-artifact@v3`): Packages the
   entire `./dist` directory as a GitHub Actions artifact. This artifact
   contains:
   - `index.html` with injected base path
   - `404.html` processed for SPA routing
   - All bundled JavaScript and CSS assets
   - Blog markdown files in `src/blogs/`
   - Any other static assets

### Deployment Job: From Artifact to Production

The deployment job is separate from the build job, following GitHub's
recommended pattern:

1. **Environment Configuration**: Uses the `github-pages` environment, which
   provides:
   - The deployment URL (accessible via
     `${{ steps.deployment.outputs.page_url }}`)
   - Environment-specific secrets and settings
   - Deployment history and rollback capabilities

2. **Job Dependencies**: The `needs: build` directive ensures the deployment
   only runs after a successful build, preventing failed builds from being
   deployed.

3. **Deploy to GitHub Pages** (`actions/deploy-pages@v4`): This action:
   - Retrieves the artifact uploaded by the build job
   - Deploys it to GitHub Pages infrastructure
   - Makes the site live at the configured GitHub Pages URL
   - Provides deployment status and URL as outputs

### Concurrency and Safety

The workflow includes important safety measures:

- **Concurrency Control**: The `concurrency` group ensures only one
  deployment runs at a time per repository.
- **No Cancellation**: `cancel-in-progress: false` means if a new deployment
  starts while one is in progress, the new one waits rather than canceling
  the in-progress deployment. This prevents interrupting production
  deployments.

### Permissions

The workflow requires specific permissions:

- `contents: read` - To read the repository code
- `pages: write` - To deploy to GitHub Pages
- `id-token: write` - For OIDC authentication with GitHub Pages

### The Complete Flow

When a developer pushes to `main`:

1. GitHub Actions triggers the workflow.
2. **Build**: checks out code, sets up Nix environment, restores cache,
   installs dependencies, builds the application with all SPA routing.
3. Build artifacts are uploaded (including processed `404.html` and base
   path-injected HTML).
4. Deployment job retrieves the artifact and deploys to GitHub Pages.
5. The site goes live with full SPA routing support, handling direct
   navigation and refreshes correctly.

This automated pipeline ensures that every code change is immediately tested
in a production-like environment and deployed consistently, with the SPA
routing solution automatically applied during the build process.

## Validating Blog Post Loading

As the blog grew and more posts were added, a critical concern emerged:
**how can we ensure all blog posts actually load correctly when deployed?** A
broken post might go unnoticed until a user tries to access it, creating a
poor experience.

### The Solution: Automated Post Validation

A comprehensive test was added (`test-blog-posts.ts`) that validates all blog
posts before deployment. This test runs automatically in the CI/CD pipeline,
ensuring no broken posts make it to production.

### What the Test Validates

The test performs several critical checks:

1. **Manifest Integrity**: Verifies that all markdown files in `src/blogs/`
   are included in the generated `manifest.json`, and that the manifest
   doesn't reference non-existent files.

2. **File Availability**: Confirms that each post file exists in both the
   source directory and the built `dist` directory, ensuring the build process
   correctly copied all blog files.

3. **Frontmatter Validation**: Parses each post's frontmatter (using the same
   logic as the blog reader) and validates:
   - **Name**: Each post has a title
   - **Date**: Each post has a valid date in YYYY-MM-DD format
   - **Topics**: Each post has at least one topic (warns if missing)

4. **Content Validation**: Ensures each post has actual content beyond the
   frontmatter, preventing empty or malformed posts.

### Integration with CI/CD

The test is integrated into the deployment workflow as a step that runs
immediately after the build:

```yaml
- name: Build with Vite
  run: nix develop --command npm run build
- name: Test blog posts
  run: nix develop --command npm run test:posts
- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
```

This placement is strategic: the test runs after the build (so it can check
the `dist` directory) but before uploading artifacts. If any post fails
validation, the entire deployment fails, preventing broken content from going
live.

### Local Testing

Developers can also run the test locally:

- `npm run test:posts` - Runs the test (requires a build first)
- `npm run test` - Builds the project and then runs the test

**Summary of `npm run test:posts`**: This command executes `test-blog-posts.ts`,
which validates all blog posts by checking manifest integrity (ensuring all
markdown files are listed and no non-existent files are referenced), verifying
file availability in both `/src/blogs` and `/dist` directories, validating
frontmatter (name, date format, topics), and ensuring each post has content.
The test uses the same frontmatter parsing logic as the blog reader, ensuring
consistency between test and runtime behavior. If any validation fails, the
command exits with an error code, preventing broken posts from being deployed.

This allows catching issues before pushing to the repository, maintaining code
quality and preventing broken deployments.

### Benefits

This validation provides several key benefits:

- **Early Detection**: Catches broken posts before they reach production
- **Consistency**: Ensures all posts follow the same structure and format
- **Automation**: No manual checking required - the CI pipeline handles it
- **Developer Confidence**: Developers can add new posts knowing they'll be
  validated automatically

The test uses the same frontmatter parsing logic as the blog reader itself,
ensuring that if a post passes the test, it will load correctly in the
deployed application. This alignment between test and runtime behavior is
crucial for reliability.

## The Missing Manifest in Development

Despite all the careful architecture and validation, a subtle issue emerged:
**blog posts weren't loading during local development**. The application would
start, but no posts would appear in the sidebar, and attempting to load a
post would fail _silently_.

**The Problem**:

The blog reader loads posts by first fetching a `manifest.json` file that
lists all available markdown files. This manifest was being generated during
the build process (in the `closeBundle` hook of the Vite plugin), which
worked perfectly for production deployments. However, during local
development with `vite dev`, the manifest file didn't exist in the source
directory, causing all fetch requests to fail.

The `loadBlogList()` method in `blog.ts` would attempt to fetch
`${this.basePath}src/blogs/manifest.json`, but since the file only existed in
the `dist` directory after a build, development mode couldn't find it.

**The Solution**:

The fix involved extending the manifest generation to run during development
as well. The Vite plugin was updated to:

1. **Extract manifest generation logic** into a reusable
   `generateBlogManifest()` function that could be called from multiple hooks
2. **Add a `buildStart` hook** that generates the manifest in the source
   directory (`src/blogs/manifest.json`) when the dev server starts
3. **Keep the `closeBundle` hook** to generate the manifest in the dist
   directory during builds

This ensures the manifest is always available, whether running in development
mode or production. The same function generates the manifest in both contexts,
maintaining consistency and reducing code duplication.

### The Implementation

The solution refactored the plugin to use a shared function:

```typescript
function generateBlogManifest(blogsDir: string): { files: string[] } | null {
  // Scans the directory for .md files and generates manifest.json
}

// In the plugin:
{
  name: "generate-blog-manifest",
  buildStart() {
    // Generate for development
    generateBlogManifest(join(process.cwd(), "src", "blogs"));
  },
  closeBundle() {
    // Generate for production
    const manifest = generateBlogManifest(srcBlogsDir);
    // Also copy to dist directory
  }
}
```

This fix highlights an important principle: **build-time and runtime
environments need different considerations**. What works in production (where
files are pre-generated) may not work in development (where files are served
dynamically). The solution ensures both environments have the resources they
need.

## Cursor's Self-Configuration

An interesting meta-moment occurred in commit
[`abc9e17`](https://github.com/Isaac-DeFrain/blog/commit/abc9e17) - "chore(vscode):
format on save". This commit added comprehensive VSCode settings that
configured:

- Format on save for TypeScript, JavaScript, JSON, CSS, HTML, and Markdown
- Prettier as the default formatter across all these file types

This represents Cursor (the AI assistant) helping to configure its own
development environment - setting up the editor settings that would ensure
consistent code formatting going forward. The settings file
(`/.vscode/settings.json`) became a permanent part of the project, ensuring
that anyone working on the codebase would benefit from automatic formatting.

## The Final Architecture

Today, the blog is a fully functional SPA that:

- Works seamlessly in local development
- Deploys correctly to GitHub Pages with proper routing
- Handles direct navigation and page refreshes without 404 errors
- Supports both root and subdirectory deployments
- Maintains clean, modular code with proper separation of concerns
- Validates all blog posts automatically before deployment

## Lessons Learned

This journey demonstrates several important principles:

1. **Local development and production can differ significantly** - What works
   locally may need special handling for deployment platforms
2. **Platform-specific features can be leveraged creatively** - The 404.html
   fallback is a GitHub Pages quirk that became a feature
3. **Build-time configuration is powerful** - Injecting environment-specific
   values at build time allows the same codebase to work in multiple contexts
4. **Tooling should be configured early** - The VSCode settings ensure code
   quality from the start

The evolution from initial commit to production-ready deployment shows how
iterative development, combined with creative problem-solving, can overcome
platform limitations and create robust solutions.
