#!/usr/bin/env bash
# Stage everything, commit as "update game", and push. Safe to run when there's
# nothing to commit (it just pushes whatever is already ahead).
set -e
cd "$(dirname "$0")"
git add -A
git commit -m "update game" || echo "nothing to commit"
git push
