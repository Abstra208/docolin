#!/usr/bin/env bash
# PreToolUse hook: blocks AI tool access to .env files.
# Allows .env.example and .env.test (committed safe placeholders) and write-only
# redirects (>> / > .env). Reads the tool input as JSON on stdin and emits a
# deny JSON envelope on stdout when the call should be blocked.

set -euo pipefail

input=$(cat)

deny() {
  jq -nc --arg r "$1" '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: $r}}'
  exit 0
}

tool=$(printf '%s' "$input" | jq -r '.tool_name // ""')

case "$tool" in
  Read | Edit | Write | NotebookEdit)
    path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')
    [[ -z "$path" ]] && exit 0
    base=$(basename "$path")
    case "$base" in
      .env.example | .env.test) exit 0 ;;
      .env | .env.*) deny ".env files are blocked by project policy (see SECURITY.md / memory rules). Use .env.example for documentation." ;;
    esac
    ;;
  Bash)
    cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""')
    [[ -z "$cmd" ]] && exit 0
    # Mask safe .env paths so they don't trigger the regex below.
    clean=$(printf '%s' "$cmd" | sed -E 's/\.env\.(example|test)([^[:alnum:].]|$)/.SAFE\2/g')
    # Read-style command immediately referencing .env (no > between cmd and .env => not a write redirect).
    if printf '%s' "$clean" | grep -qE '\b(cat|head|tail|grep|egrep|fgrep|less|more|sed|awk|bat|tac|nl|wc|fold|file|xxd|hexdump|od|cut|paste|sort|uniq|tr|rev|jq|yq|dd)\b[^>]*\.env(\b|$)'; then
      deny "Bash command appears to read .env content (blocked). Append via >> is still allowed."
    fi
    # Stdin redirect from .env (single < followed by .env).
    if printf '%s' "$clean" | grep -qE '(^|[^<])<[[:space:]]*\.env(\b|$)'; then
      deny "Bash command reads .env via stdin redirect (blocked)."
    fi
    # Git inspection commands exposing .env content.
    if printf '%s' "$clean" | grep -qE '\bgit[[:space:]]+(diff|show|log|cat-file|blame)\b[^>]*\.env(\b|$)'; then
      deny "Git command exposing .env content (blocked)."
    fi
    ;;
esac

exit 0
