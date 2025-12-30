---
name: Building This Blog (part 5) - CI/CD Deployment Pipeline
date: 2025-12-30
topics:
  - building this blog
  - ci/cd
---

# Building This Blog (part 5) - CI/CD Deployment Pipeline

## The CI/CD Deployment Pipeline

The deployment process is orchestrated through [GitHub Actions](https://github.com/features/actions), defined in `.github/workflows/build-deploy.yml`. This workflow ensures that every push to the `main` branch automatically

- lints the source code
- audits dependencies
- runs all tests
- builds artifacts
- uploads artifacts

_upon successful completion of all those steps, and only then_:

- retrieves artifacts
- deploys the new blog to GitHub Pages

The first sequence of steps constitutes the _build job_ and the second, the _deploy job_.

## Build Job

The `build` job takes us from source code to build artifacts.

We explain this code below:

```yaml
build:
  runs-on: ubuntu-latest
  steps:
    - name: Checkout
      uses: actions/checkout@v4
    - name: Install Nix
      uses: DeterminateSystems/nix-installer-action@main
    - name: Setup Pages
      uses: actions/configure-pages@v5
    - name: Restore cache
      uses: actions/cache@v4
      with:
        path: |
          node_modules
        # Generate a new cache whenever packages or source files change.
        key: ${{ runner.os }}-vite-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**.[jt]s', '**.[jt]sx') }}
        # If source files changed but packages didn't, rebuild from a prior cache.
        restore-keys: |
          ${{ runner.os }}-vite-${{ hashFiles('**/package-lock.json') }}-
    - name: Install dependencies
      run: nix develop --command npm ci
    - name: Run lint
      run: nix develop --command npm run lint
    - name: Run audit
      run: nix develop --command npm run audit
    - name: Build and run tests
      run: nix develop --command npm test
    - name: Upload artifact
      uses: actions/upload-pages-artifact@v3
      with:
        path: ./dist
```

The build job runs on `ubuntu-latest` and follows these steps:

1. **Checkout** (`actions/checkout@v4`)

   Clones the repository into the GitHub Actions runner.

2. **Install Nix** (`DeterminateSystems/nix-installer-action@main`)

   Sets up the Nix package manager, which provides a reproducible development environment defined in `flake.nix`. This ensures the exact same Node.js version and tools are used in CI/production as in local development. All commands run in the shell provided by the flake via [`nix develop --command <command>`](https://nix.dev/manual/nix/2.26/command-ref/new-cli/nix3-develop).

3. **Setup Pages** (`actions/configure-pages@v5`)

   Configures the GitHub Pages environment, preparing it to receive the deployment artifact.

4. **Restore Cache** (`actions/cache@v4`)

   Implements an intelligent caching strategy:
   - Caches `node_modules` (dependencies)
   - Cache key includes the OS, package lock file hash, and source file hashes
   - If packages haven't changed but source files have, restores from a partial cache
   - This dramatically speeds up builds when only code changes, not dependencies

5. **Install Dependencies**

   Runs `nix develop --command npm ci` to install dependencies within the Nix shell. The `npm ci` command ensures a clean, reproducible install based on `package-lock.json`.

6. **Run Lint**

   Executes `nix develop --command npm run lint`, which runs TypeScript type checking (`tsc --noEmit`) and formats code with Prettier.

7. **Run Audit**

   Executes `nix develop --command npm run audit`, which runs `npm audit` to check for security vulnerabilities and `depcheck` to identify unused dependencies.

8. **Run Tests**

   Executes `nix develop --command npm test`, which:
   - Runs the build process (`npm run build`):
     - TypeScript type checking (`tsc`)
     - Builds the application with Vite (`vite build`) during which Vite's custom plugins execute:
       - Base path detection from `GITHUB_REPOSITORY` environment variable
       - HTML injection of `window.__BASE_PATH__`
       - Processing of `404.html` with path rewriting
       - Copying blog markdown files to the `./dist` directory
     - Outputs the production-ready static files to the `./dist` directory
   - Runs all tests (`npm run test:all`) to ensure code quality and functionality

9. **Upload Artifact** (`actions/upload-pages-artifact@v3`)

   Packages the entire `./dist` directory as a GitHub Actions artifact. This artifact contains:
   - `index.html` with injected base path
   - `404.html` processed for SPA routing
   - All bundled JavaScript and CSS assets
   - building this blog markdown files in `posts/`
   - Any other static assets

## Deployment: From Artifact to Production

The `deploy` job is separate from and requires the `build` job, following GitHub's recommended pattern:

The code says it all:

```yaml
deploy:
  environment:
    name: github-pages
    url: ${{ steps.deployment.outputs.page_url }}
  runs-on: ubuntu-latest
  needs: build
  steps:
    - name: Deploy to GitHub Pages
      id: deployment
      uses: actions/deploy-pages@v4
```

In order for the `deploy` job to run, we must have had a successful `build` job.

1. **Environment Configuration**

   Uses the `github-pages` environment, which provides:
   - The deployment URL (accessible via `${{ steps.deployment.outputs.page_url }}`)
   - Environment-specific secrets and settings
   - Deployment history and rollback capabilities

2. **Job Dependencies**

   The `needs: build` directive ensures the deployment only runs after a successful build, preventing failed builds from being deployed.

3. **Deploy to GitHub Pages** (`actions/deploy-pages@v4`)
   - Retrieves the artifact uploaded by the build job
   - Deploys it to GitHub Pages infrastructure
   - Makes the site live at the configured GitHub Pages URL
   - Provides deployment status and URL as outputs

## Concurrency and Safety

The workflow includes important safety measures:

- **Concurrency Control**:
  The `concurrency` group ensures only one deployment runs at a time per repository.

- **No Cancellation**:
  `cancel-in-progress: false` means if a new deployment starts while one is in progress, the new one waits rather than canceling the in-progress deployment. This prevents interrupting production deployments.

## Permissions

The workflow requires specific permissions:

- `contents: read` - To clone the repository code
- `pages: write` - To deploy to GitHub Pages
- `id-token: write` - For [OIDC authentication with GitHub Pages](https://docs.github.com/en/actions/concepts/security/openid-connect)

## The Complete Flow

In summary, when a code owner pushes to the `main` branch:

GitHub Actions triggers the [build-deploy workflow](../../.github/workflows/build-deploy.yml):

- **Build Job**
  - checks out source code
  - sets up Nix environment
  - restores cache
  - installs dependencies
  - runs linting
  - audits dependencies
  - runs all tests
  - builds artifacts
  - uploads artifacts (including processed `404.html` and base path-injected HTML)

- **Deploy Job**
  - retrieves artifacts
  - deploys blog on GitHub Pages

This automated pipeline ensures that every code change is linted, audited, tested, built, and deployed consistently, ensuring that only code that passes our high level of scrutiny ever makes it to the [GitHub Pages site](https://isaac-defrain.github.io/blog/).
