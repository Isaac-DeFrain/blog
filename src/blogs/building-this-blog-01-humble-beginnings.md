---
name: Building this Blog (part 1) - Humble Beginnings
date: 2025-12-14
topics:
  - blog
  - ci/cd
---

# Humble Beginnings

This is the humble beginning of a [blog](https://isaac-defrain.github.io/blog/) and subsequent series of posts about building said [blog](https://github.com/Isaac-DeFrain/blog).

First, a quick introduction.

## A little about me

I've been a software developer for over 7 years (as of writing). Somehow I had managed to keep myself far away from any AI tools. Perhaps I viewed them as more of a crutch than anything, but even a crutch is a tool. However, in my extremely limited exposure, I had not found them terribly helpful. Most likely because I didn't know how to use them.

Throughout my career, I had also managed to keep myself far away from web/frontend development and TypeScript. This did not make me cool... or a well-rounded developer, for that matter.

It was high time I change _my_ status quo, start working with AI tools and stop hiding from the frontend. I decided to build my first web app, a simple blog.

I'm certainly no frontend or AI expert, and I think, that's _exactly_ why my experience here is particulary valuable to share. I hope you enjoy and maybe even learn something along the way.

## A little about this blog

The was simple:

> Build a basic web app for a blog

But, of course, that couldn't be the whole goal... I also felt strongly compelled to use [Nix flakes](https://nixos.wiki/wiki/Flakes), vanilla (framework-free) [TypeScript](https://www.typescriptlang.org/), CI/CD best practices, and copious AI assistance. My aim was specifically to get (more) familiar with [Cursor](https://cursor.sh/) and TypeScript, while using the former to bootstrap and accelerate my learning of the latter.

This post will highlight:

- [tech choices](#the-blogs-tech-choices)
- [design decisions](#the-blogs-design)
- [CI/CD best practices](#cicd-best-practices)
- [deploying to GitHub Pages](#deploying-to-github-pages)

### The blog's tech choices

As mentioned above, we use:

- [Nix flakes](#why-nix-flakes)
- [TypeScript](#why-typescript)
- [Vite](#why-vite)
- [Cursor](#why-cursor)
- [GitHub Actions/Pages](#why-github-actionspages)

We now address the reasoning for each choice.

### Why Nix flakes

Nix flakes handles our development and deployment environments. Instead of manually installing dev tools (or hoping they're already installed), [`flake.nix`](../../flake.nix) declares exactly what's needed for the project.

For the blog, we only need [Node.js](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs). The `nodejs_24` Nix package provides the Node.js runtime and [`npm` package manager](https://www.npmjs.com/). Node.js is required to run [Vite](https://vite.dev/), TypeScript, and all the `npm` scripts. After the flake gives us `npm`, we use it to install the remaining project dependencies from `package.json`.

#### Nix flakes offer

- **Reproducibility**: Every clone of the repo gets the exact same versions of Node.js, `npm`, and other tools, regardless of the underlying system
- **Version pinning**: Flakes lock dependencies, ensuring builds are reproducible across time and machines
- **Lighter than Docker**: No container overhead, direct access to your system, and faster startup times

The flake ensures that anyone can run `nix develop` and immediately have the correct Node.js version, without any manual setup or version conflicts.

> Using Nix flakes for development and CI/CD pipelines is a best practice

### Why TypeScript

TypeScript is widely used across many industries (and has static type checking like the functional programming languages I'm more familiar with).

### Why Vite

Vite serves as both the development server and build tool for the blog. It delivers a delightful developer experience with instant dev server startup and hot module replacement (HMR), while also handling TypeScript compilation, code bundling, and asset optimization for production. It can also be configured with TypeScript code.

#### Vite offers

- **Fast dev server**: Uses native ES modules in the browser during development, eliminating the need for bundling and providing near-instant server startup
- **Hot Module Replacement**: Changes to code are reflected immediately in the browser without a full page reload
- **TypeScript support**: Built-in TypeScript compilation without additional configuration
- **Build tool**: Bundles and optimizes code for production, including minification and code splitting
- **Plugin system**: Extensible architecture allows custom build steps which we use to copy blog files, generate manifests, and process 404.html for GitHub Pages
- **Modern tooling**: Works seamlessly with modern JavaScript features and ES modules

For the blog, Vite handles the entire _build pipeline_: serving the SPA during development, compiling TypeScript code, copying markdown files to the `/dist` directory, generating the blog manifest, and configuring the base path for GitHub Pages deployment.

### Why Cursor

Cursor is an AI-powered IDE built on VS Code which has become an almost essential tool for software developers.

#### Cursor offers

- **Context-aware assistance**: Unlike generic AI chatbots, Cursor understands your entire codebase, making suggestions that fit your project's architecture and coding style
- **Learning accelerator**: When working with unfamiliar technologies (TypeScript, frontend development in my case), Cursor provides real-time explanations and helps you understand best practices
- **Code generation and refactoring**: Quickly generate boilerplate code, refactor existing code, and implement features while maintaining consistency with your project's patterns
- **Error resolution**: Cursor helps mediagnose and fix errors faster by understanding the context of your code and suggesting targeted solutions

For the blog, Cursor has helped me navigate and understand TypeScript syntax, Vite's build system, implementing client-side routing, and solving deployment challenges with GitHub Pages much more easily. It transformed what would have easily been several hard weeks of learning and trial-and-error into a productive 3-day push. It turns out that writing blog posts takes much longer than writing code...

### Why GitHub Actions/Pages

Since the code is already hosted on [GitHub](https://github.com/), it makes sense to keep workflows local. To that end, we use [GitHub Actions](https://github.com/features/actions) to automate code quality checks, testing, and deployment. Deploying to [GitHub Pages](https://docs.github.com/en/pages) allows us to host a static site while avoiding the need for an external hosting service.

Our deployment to GitHub Pages posed several unexpected challenges which will be discussed in detail later.

## The blog's design

The blog is a [single-page application (SPA)](https://en.wikipedia.org/wiki/Single-page_application) built with TypeScript and Vite. It renders markdown blog posts with client-side routing, topic filtering, and light/dark theme switching.

### Architecture

The blog's architecture is as simple as possible while supporting deployment to [GitHub Pages](https://docs.github.com/en/pages).

- **Framework**: Vanilla TypeScript with Vite
- **Blog Content**: Markdown files with YAML frontmatter (name, date, topics)
- **Rendering**: Marked.js for markdown → HTML, Highlight.js for code syntax highlighting, MathJax for math
- **Routing**: Client-side routing with browser history API
- **Caching**: LocalStorage for user-viewed blog post HTML
- **Deployment**: GitHub Pages with base path support

### Layout

The layout of the single page is simple:

```txt
┌──────────────────────────────────────────────────────────────┐
│ HEADER (sticky)                                              │
│ ┌─────────────────────────────────────┐ ┌──────────────────┐ │
│ │ TITLE                               │ │  [Theme Toggle]  │ │
│ └─────────────────────────────────────┘ └──────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ TOPICS BAR (sticky)                                          │
│ [all] [blog] [best practices] [cursor] [cicd] ...            │
│ (horizontal scrollable filter buttons)                       │
├──────────────────────────────────────────────────────────────┤
│ MAIN CONTAINER                                               │
│ ┌──────────────────┐  ┌───────────────────────────────────┐  │
│ │ SIDEBAR          │  │ CONTENT AREA                      │  │
│ │ (sticky)         │  │                                   │  │
│ │                  │  │ ┌───────────────────────────────┐ │  │
│ │ Recent Posts     │  │ │ Blog Post Card                │ │  │
│ │ ─────────────    │  │ │                               │ │  │
│ │ • Post 1         │  │ │ Date: January 15, 2024        │ │  │
│ │   Jan 15, 2024   │  │ │ ───────────────────────────── │ │  │
│ │                  │  │ │                               │ │  │
│ │ • Post 2         │  │ │ # Post Title                  │ │  │
│ │   Jan 10, 2024   │  │ │                               │ │  │
│ │                  │  │ │ Blog content (markdown)       │ │  │
│ │ • Post 3         │  │ │ rendered as HTML with         │ │  │
│ │   Jan 5, 2024    │  │ │ code highlightling and        │ │  │
│ │                  │  │ │ MathJax support               │ │  │
│ │ (scrollable)     │  │ │                               │ │  │
│ │ (topic-filtered) │  │ └───────────────────────────────┘ │  │
│ └──────────────────┘  └───────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## CI/CD best practices

Since I am attempting to use some notion of _best practices_, I should define what I mean. This is a non-exhaustive list of best practices:

- reproducible dev environments/builds/deploys (e.g. Nix flakes)
- automated formatting, linting, testing, and deployment
- fully embrace [CI/CD](https://semaphore.io/cicd)

We use GitHub Actions to

- format
- lint
- test
- build
- deploy

_every_ push to the [`main` branch](https://github.com/Isaac-DeFrain/blog/tree/main). Successful builds are immediately deployed into [production on GitHub Pages](https://isaac-defrain.github.io/blog/).

## Deploying to GitHub Pages

Deploying an SPA to GitHub Pages presented several unexpected challenges. While the application worked initially in local development, production deployment failures revealed platform limitations that needed to be addressed.

I was not familiar with _any_ of the following concepts (except build-time processing) so Cursor was especially helpful in implementing these solutions.

### Main challenges

- [SPA routing](#spa-routing)
- [base path configuration](#base-path-configuration)
- [script injection timing](#script-injection-timing)
- [build-time processing](#build-time-processing)

#### SPA routing

_Problem_: The most significant challenge was that **GitHub Pages doesn't natively support SPA routing**. When a user navigated directly to a route like `/welcome` or refreshed the page, GitHub Pages would return a 404 error because it was looking for an actual file at that path, not understanding that this was a client-side route handled by JavaScript.

_Solution_: We leveraged GitHub Pages' special behavior of serving `404.html` when a file isn't found. By creating a `404.html` file that mirrors the main `index.html` structure and processes it during build to inject the base path, we ensure that any "missing" route loads the SPA, which then reads the original pathname from the URL and routes accordingly. This solution is detailed in [part 2 of this series](./building-this-blog-02-spa-routing).

#### Base path configuration

_Problem_: GitHub Pages serves project repositories from `/repo-name/` rather than the root `/`. This means all asset paths, API calls, and routing logic needed to account for this base path. Without proper handling, assets wouldn't load and routing would break.

_Solution_: The build process detects the repository name from the `GITHUB_REPOSITORY` environment variable and injects `window.__BASE_PATH__` as a global variable into both `index.html` and `404.html`. The application code then uses this base path when constructing fetch URLs and managing navigation. Vite's `base` configuration is also set to ensure asset paths are correctly prefixed.

#### Script injection timing

_Problem_: A subtle yet critical bug emerged where blog posts failed to load because `window.__BASE_PATH__` wasn't available when the application code executed. The base path injection script was initially placed just before the closing `</head>` tag, but Vite's module scripts were loading earlier, causing the application to run before the base path was defined.

_Solution_: The script injection point was moved to immediately after the opening `<head>` tag, ensuring the base path variable is defined before any module scripts execute. This fix was applied to both `index.html` and `404.html` processing. The details of this debugging process are covered in [part 3 of this series](./building-this-blog-03-script-injection).

#### Build-time processing

_Problem_: Multiple build-time transformations were needed:

- Injecting base path into HTML files
- Processing `404.html` with path rewriting for assets
- Copying blog markdown files to the dist directory
- Generating a manifest file listing all blog posts

_Solution_: [Custom Vite plugins](../../vite.config.ts) handle all necessary transformations during the build process. The plugins run at different stages (`buildStart`, `transformIndexHtml`, `closeBundle`) to ensure proper ordering and availability of files. This approach keeps the source code clean while generating production-ready artifacts. The details of this process are covered in [part 4 of this series](./building-this-blog-04-build-time-processing).

### Conclusion (part 1)

The challenges encountered while building and deploying the blog demonstrate that even when using best practices, local development and production environments can still differ significantly. What works locally on a dev server may require special handling for deployment platforms like GitHub Pages.

The solutions we implemented demonstrate several important principles:

1. **Platform-specific features can be leveraged creatively**: The 404.html fallback is a GitHub Pages quirk that became a feature
2. **Build-time configuration is powerful**: Injecting environment-specific values at build time allows the same codebase to work in multiple contexts
3. **Script execution order matters**: When dealing with build-time code injection and module loading, careful attention to execution order is essential

The transformation from initial design to production-ready deployment shows how iterative development through CI/CD best practices, combined with persistant debugging and creative problem-solving, can create robust applications.

[Go to part 2 - SPA routing](./building-this-blog-02-spa-routing)
