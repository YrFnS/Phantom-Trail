#!/bin/bash

# Read hook event from stdin
read -r hook_event

# Extract file path from tool input if it's a write operation
file_path=$(echo "$hook_event" | jq -r '.tool_input.path // empty' 2>/dev/null)

# Check if it's a TypeScript/JavaScript file
if [[ "$file_path" =~ \.(ts|tsx|js|jsx)$ ]]; then
    echo "Formatting and linting $file_path..." >&2
    
    # Run prettier on the specific file
    if pnpm exec prettier --write "$file_path" 2>/dev/null; then
        echo "✓ Formatting completed" >&2
    else
        echo "⚠ Formatting had issues" >&2
    fi
    
    # Run lint with fix on the specific file
    if pnpm exec eslint --fix "$file_path" 2>/dev/null; then
        echo "✓ Linting completed" >&2
    else
        echo "⚠ Linting had issues" >&2
    fi
fi

exit 0
