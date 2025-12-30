---
name: Building This Blog (part 4) - Testing
date: 2025-12-30
topics:
  - building this blog
  - testing
---

# Testing

Despite all the careful architecture and validation, a subtle issue emerged: **blog posts weren't loading during local development**. The application would start, but no posts would appear in the sidebar, and attempting to load a post would fail _silently_.

## The Missing Manifest

**The Problem**:

The `BlogReader` loads posts by first fetching a `manifest.json` file that lists all available markdown files. This manifest was being generated during the build process (in the `closeBundle` hook of the Vite plugin), which worked perfectly for production deployments. However, during local development with `vite dev`, the manifest file didn't exist in the source directory, causing all fetch requests to fail.

The `loadBlogList()` method in `blog.ts` would attempt to fetch `${this.basePath}posts/manifest.json`, but since the file only existed in the `dist` directory after a build, development mode couldn't find it.

**The Solution**:

The fix involved extending the manifest generation to run during development as well. The Vite plugin was updated to:

1. **Extract manifest generation logic** into a reusable `generateBlogManifest()` function that could be called from multiple hooks
2. **Add a `buildStart` hook** that generates the manifest in the source directory (`posts/manifest.json`) when the dev server starts
3. **Keep the `closeBundle` hook** to generate the manifest in the dist directory during builds

This ensures the manifest is always available, whether running in development mode or production. The same function generates the manifest in both contexts, maintaining consistency and reducing code duplication.

## The Implementation

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

## Validating Blog Post Loading

As the blog grew and more posts were added, a critical concern emerged:
**how can we ensure all blog posts actually load correctly when deployed?** A
broken post might go unnoticed until a user tries to access it, creating a
poor experience.

### The Solution: Automated Post Validation

A comprehensive test was added (`test-loading.ts`) that validates all blog
posts before deployment. This test runs automatically in the CI/CD pipeline,
ensuring no broken posts make it to production.

### What the Test Validates

The test performs several critical checks:

1. **Manifest Integrity**: Verifies that all markdown files in `posts/`
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
  run: nix develop --command npm test
- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
```

This placement is strategic: the test runs after the build (so it can check
the `dist` directory) but before uploading artifacts. If any post fails
validation, the entire deployment fails, preventing broken content from going
live.

### Local Testing

Developers can also run the test locally:

- `npm run test:loading` - Runs the post loading test (requires a build first)
- `npm test` - Builds the project and then runs the test

**Summary of `npm run test:loading`**: This command executes `test-loading.ts`,
which validates all blog posts by validating

- manifest integrity (all markdown files are listed and no non-existent files are referenced)
- verifying file availability in both `/posts` and `/dist` directories
- validating frontmatter (name, date format, topics)
- each post has content

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

<!--
Cursor says:

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

[Part 5: CI/CD Pipeline](./building-this-blog-05-cicd-pipeline.md)
