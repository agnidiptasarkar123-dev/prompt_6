#!/usr/bin/env bash
set -euo pipefail

echo "Executing single-branch safeguard check (Branch MUST be 'main')..."

# Check current working branch
CURRENT_BRANCH=$(git branch --show-current || echo "DETACHED")

if [ "${CURRENT_BRANCH}" != "main" ]; then
  echo "FAIL: Current branch is '${CURRENT_BRANCH}'. The project allows exactly one branch: 'main'."
  exit 1
fi

# Check all local branches
LOCAL_BRANCH_COUNT=$(git branch | wc -l | tr -d ' ')
if [ "${LOCAL_BRANCH_COUNT}" -gt 1 ]; then
  echo "FAIL: Multiple local branches detected (${LOCAL_BRANCH_COUNT}). Only 'main' is permitted."
  git branch
  exit 1
fi

# Check remote tracking branches if remote exists
if git remote | grep -q 'origin'; then
  REMOTE_OTHER_BRANCHES=$(git branch -r | grep -v 'origin/main' | grep -v 'origin/HEAD' || true)
  if [ -n "${REMOTE_OTHER_BRANCHES}" ]; then
    echo "FAIL: Unauthorized remote branches detected: ${REMOTE_OTHER_BRANCHES}"
    exit 1
  fi
fi

echo "SUCCESS: Single-branch policy strictly satisfied (exactly one branch: 'main')."
exit 0
