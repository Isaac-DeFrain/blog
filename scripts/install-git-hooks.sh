#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$ROOT/.git/hooks"

if [[ ! -d "$HOOKS_DIR" ]]; then
  echo "error: $HOOKS_DIR not found; is this a git repository?" >&2
  exit 1
fi

install_hook() {
  local name="$1"
  cp "$ROOT/scripts/hooks/$name" "$HOOKS_DIR/$name"
  chmod +x "$HOOKS_DIR/$name"
  echo "Installed .git/hooks/$name"
}

install_hook pre-commit
