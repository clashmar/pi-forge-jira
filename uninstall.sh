#!/usr/bin/env bash
set -euo pipefail

EXTENSION_DIR="$HOME/.pi/agent/extensions"
rm -f "$EXTENSION_DIR/jira"
echo "✓ Unlinked extension — restart pi to deactivate"
