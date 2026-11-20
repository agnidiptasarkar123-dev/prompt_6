#!/usr/bin/env bash
set -euo pipefail

# Maximum allowed repository size in Kilobytes (10 MB = 10,240 KB)
MAX_SIZE_KB=10240

echo "Executing repository size check (limit: ${MAX_SIZE_KB} KB)..."

# Measure size of git pack files and loose objects
PACK_SIZE_KB=$(git count-objects -v | grep 'size-pack' | awk '{print $2}' || echo "0")
LOOSE_SIZE_KB=$(git count-objects -v | grep 'size:' | awk '{print $2}' || echo "0")
TOTAL_SIZE_KB=$((PACK_SIZE_KB + LOOSE_SIZE_KB))

# Also measure working tree size (excluding git directory)
TREE_SIZE_KB=$(du -sk . | awk '{print $1}')

echo "Git internal size: ${TOTAL_SIZE_KB} KB"
echo "Working directory size: ${TREE_SIZE_KB} KB"

if [ "${TOTAL_SIZE_KB}" -gt "${MAX_SIZE_KB}" ]; then
  echo "FAIL: Git repository internal size (${TOTAL_SIZE_KB} KB) exceeds the strict 10 MB limit (${MAX_SIZE_KB} KB)!"
  exit 1
fi

if [ "${TREE_SIZE_KB}" -gt "${MAX_SIZE_KB}" ]; then
  echo "FAIL: Working tree size (${TREE_SIZE_KB} KB) exceeds the strict 10 MB limit (${MAX_SIZE_KB} KB)!"
  exit 1
fi

echo "SUCCESS: Repository size is strictly within limits (${TOTAL_SIZE_KB} KB git / ${TREE_SIZE_KB} KB working tree < ${MAX_SIZE_KB} KB)."
exit 0
