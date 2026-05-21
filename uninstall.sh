#!/usr/bin/env bash
set -euo pipefail

EXTENSION_DIR="$HOME/.pi/agent/extensions"
rm -f "$EXTENSION_DIR/pi-forge-jira"
echo "✓ Unlinked extension — restart pi to deactivate"
