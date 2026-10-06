#!/usr/bin/env bash
# Local mirror of .github/workflows/build-deploy.yml build-test job.
# Skips CI-only steps: artifact upload, coverage badge commit/push, GitHub Pages deploy.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

run_in_dev_shell() {
  if [[ -f flake.nix ]]; then
    nix develop -c "$@"
  else
    "$@"
  fi
}

resolve_base_path() {
  # Keep in sync with "Resolve base path" in build-deploy.yml and resolveBuildBasePath() in src/utils/paths.ts
  if [[ -f CNAME ]]; then
    export VITE_BASE_PATH="/"
    printf 'Custom domain detected: %s → base path /\n' "$(cat CNAME)"
    return
  fi

  local origin repo
  origin="$(git config --get remote.origin.url 2>/dev/null || true)"
  repo="$(basename "${origin%.git}")"
  if [[ -z "$repo" || "$repo" == "origin" ]]; then
    echo "error: could not resolve repository name from remote.origin.url" >&2
    exit 1
  fi

  export VITE_BASE_PATH="/${repo}/"
  printf 'Project Pages → base path /%s/\n' "$repo"
}

echo "==> Install dependencies (npm ci)"
run_in_dev_shell npm ci

echo "==> Run lint"
lint_diff_before="$(mktemp)"
lint_diff_after="$(mktemp)"
trap 'rm -f "$lint_diff_before" "$lint_diff_after"' EXIT
git diff >"$lint_diff_before"
run_in_dev_shell npm run lint
git diff >"$lint_diff_after"
if ! cmp -s "$lint_diff_before" "$lint_diff_after"; then
  echo "error: lint modified files; review, stage, and commit again" >&2
  exit 1
fi

echo "==> Run audit"
run_in_dev_shell npm run audit

echo "==> Resolve base path"
resolve_base_path

echo "==> Run build"
run_in_dev_shell npm run build

echo "==> Run test coverage"
run_in_dev_shell npm run coverage

echo "==> Generate coverage badge"
run_in_dev_shell npm run generate-coverage-badge
if ! git diff --quiet -- assets/coverage-badge.svg; then
  git add assets/coverage-badge.svg
  echo "Staged updated assets/coverage-badge.svg for this commit"
fi

echo "build-deploy local checks passed"
