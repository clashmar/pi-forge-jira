#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
EXTENSION_DIR="$HOME/.pi/agent/extensions"
PROMPTS_DIR="$HOME/.pi/agent/prompts"

mkdir -p "$EXTENSION_DIR"

# If an existing real directory is present (not a symlink), remove it first.
# ln -sfn won't replace a directory — it would create a symlink inside it.
if [[ -d "$EXTENSION_DIR/jira" && ! -L "$EXTENSION_DIR/jira" ]]; then
  rm -rf "$EXTENSION_DIR/jira"
  echo "✓ Removed existing jira directory"
fi

ln -sfn "$REPO_DIR" "$EXTENSION_DIR/jira"
echo "✓ Linked $EXTENSION_DIR/jira → $REPO_DIR"

for f in ship.md load-ticket.md; do
  if [[ -f "$PROMPTS_DIR/$f" ]]; then
    rm "$PROMPTS_DIR/$f"
    echo "✓ Removed $PROMPTS_DIR/$f (now handled by extension command)"
  fi
done

echo "✓ Install complete — restart pi to activate"
