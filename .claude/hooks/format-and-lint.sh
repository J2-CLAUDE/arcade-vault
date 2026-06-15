#!/usr/bin/env bash
# PostToolUse hook: formatea con Prettier y arregla con ESLint el archivo escrito.
set -uo pipefail

input=$(cat)
file=$(printf '%s' "$input" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const j=JSON.parse(d);process.stdout.write((j.tool_input&&j.tool_input.file_path)||"")}catch(e){process.stdout.write("")}})')

[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

# Saltar carpetas que no son fuente del proyecto
case "$file" in
  *"/node_modules/"*|*"/.next/"*|*"/references/"*) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
ext="${file##*.}"

# Prettier para todo lo soportado (respeta .prettierignore / --ignore-unknown)
case "$ext" in
  js|jsx|ts|tsx|mjs|cjs|json|md|mdx|css)
    npx --no-install prettier --write --ignore-unknown "$file" >/dev/null 2>&1 || true
    ;;
esac

# ESLint --fix solo para JS/TS
case "$ext" in
  js|jsx|ts|tsx|mjs|cjs)
    npx --no-install eslint --fix "$file" >/dev/null 2>&1 || true
    ;;
esac

exit 0
