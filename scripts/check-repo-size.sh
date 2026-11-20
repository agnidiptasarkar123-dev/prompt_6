#!/usr/bin/env bash
set -euo pipefail

# Maximum allowed repository size in Kilobytes (10 MB = 10,240 KB)
MAX_SIZE_KB=10240

echo "Executing repository size check (limit: ${MAX_SIZE_KB} KB)..."

# Measure size of git pack files and loose objects
PACK_SIZE_KB=$(git count-objects -v | grep 'size-pack' | awk '{print $2}' || echo "0")
LOOSE_SIZE_KB=$(git count-objects -v | grep 'size:' | awk '{print $2}' || echo "0")
TOTAL_GIT_SIZE_KB=$((PACK_SIZE_KB + LOOSE_SIZE_KB))

# Measure size of tracked working tree files (excluding ignored node_modules, build outputs, and .git)
TRACKED_FILES_SIZE_KB=$(git ls-files -z | xargs -0 -n 1 stat -f %z 2>/dev/null | awk '{sum+=$1} END {print int(sum/1024)}' || echo "0")

echo "Git internal object database: ${TOTAL_GIT_SIZE_KB} KB"
echo "Tracked working tree files: ${TRACKED_FILES_SIZE_KB} KB"

if [ "${TOTAL_GIT_SIZE_KB}" -gt "${MAX_SIZE_KB}" ]; then
  echo "FAIL: Git repository internal size (${TOTAL_GIT_SIZE_KB} KB) exceeds the strict 10 MB limit (${MAX_SIZE_KB} KB)!"
  exit 1
fi

if [ "${TRACKED_FILES_SIZE_KB}" -gt "${MAX_SIZE_KB}" ]; then
  echo "FAIL: Tracked working tree size (${TRACKED_FILES_SIZE_KB} KB) exceeds the strict 10 MB limit (${MAX_SIZE_KB} KB)!"
  exit 1
fi

echo "SUCCESS: Repository size is strictly within limits (${TOTAL_GIT_SIZE_KB} KB git / ${TRACKED_FILES_SIZE_KB} KB tracked < ${MAX_SIZE_KB} KB)."
exit 0
