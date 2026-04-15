#!/bin/bash

# ===============================
# CONFIG
# ===============================
REPO_DIR="$HOME/Desktop/diem_sac_uploads"
GIT_NAME="cskh-htms"
GIT_EMAIL="cskh.htms.vn@gmail.com"
BRANCH="main"   # đổi thành master nếu repo của bạn dùng master

# ===============================
# SET GIT USER (GLOBAL)
# ===============================
git config --global user.name "$GIT_NAME"
git config --global user.email "$GIT_EMAIL"

# ===============================
# CHECK DIR
# ===============================
if [ ! -d "$REPO_DIR" ]; then
  echo "❌ Không tìm thấy thư mục: $REPO_DIR"
  exit 1
fi

cd "$REPO_DIR" || exit 1

echo "📂 Repo: $(pwd)"

# ===============================
# TIME FORMAT
# ===============================
CURRENT_DATE=$(date "+%Y-%m-%d %H:%M")

# ===============================
# GIT ACTIONS
# ===============================
echo "➕ git add ."
git add .

echo "📝 git commit"
git commit -m "update $CURRENT_DATE" || echo "ℹ️ Không có thay đổi để commit"

echo "🚀 git push (SSH)"
git push origin "$BRANCH"

if [ $? -ne 0 ]; then
  echo "❌ Push thất bại"
  exit 1
fi

echo "✅ Push thành công!"
