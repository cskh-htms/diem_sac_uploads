#!/bin/bash
set -e

# ===============================
# Config
# ===============================
REPO_DIR="$HOME/Desktop/diem_sac_uploads"
GIT_NAME="cskh-htms"
GIT_EMAIL="cskh.htms.vn@gmail.com"
BRANCH="main"
AVERSIONS_DIR="$REPO_DIR/.aversions"
LATEST_AVERSION_FILE=""

# ===============================
# Set git user
# ===============================
git config --global user.name "$GIT_NAME"
git config --global user.email "$GIT_EMAIL"

# ===============================
# Check dir
# ===============================
if [ ! -d "$REPO_DIR" ]; then
  echo "Khong tim thay thu muc: $REPO_DIR"
  exit 1
fi

cd "$REPO_DIR" || exit 1

echo "Repo: $(pwd)"

# ===============================
# Resolve aversion
# ===============================
if [ -d "$AVERSIONS_DIR" ]; then
  LATEST_AVERSION_FILE="$(find "$AVERSIONS_DIR" -maxdepth 1 -type f -printf '%T@ %f\n' | sort -nr | head -n 1 | cut -d' ' -f2-)"
fi

# ===============================
# Time format
# ===============================
CURRENT_DATE=$(date "+%Y-%m-%d %H:%M")
COMMIT_PREFIX="update"

if [ -n "$LATEST_AVERSION_FILE" ]; then
  COMMIT_PREFIX="update ${LATEST_AVERSION_FILE}"
fi

COMMIT_MESSAGE="${COMMIT_PREFIX} ${CURRENT_DATE}"

# ===============================
# Git actions
# ===============================
echo "git add ."
git add .

echo "git commit"
git commit -m "$COMMIT_MESSAGE" || echo "Khong co thay doi de commit"

echo "git push (SSH)"
git push origin "$BRANCH"

if [ $? -ne 0 ]; then
  echo "Push that bai"
  exit 1
fi

echo "Push thanh cong!"
