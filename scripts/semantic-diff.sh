#!/bin/bash

TAG=$1

# Get initial commit hash
FIRST_COMMIT=$(git rev-list --max-parents=0 HEAD)

# Determine range
if [ -z "$TAG" ]; then
  RANGE="$FIRST_COMMIT..HEAD"
else
  if git rev-parse "$TAG" >/dev/null 2>&1; then
    RANGE="$TAG..HEAD"
  else
    RANGE="$FIRST_COMMIT..HEAD"
  fi
fi

# Output semantic commits
git log $RANGE --pretty=format:"%s"