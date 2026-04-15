#!/bin/bash
set -e

# ==============================
# Resolve paths (QUAN TRỌNG)
# ==============================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ==============================
# Config
# ==============================
IMAGE_NAME="cskhhtms/diem_sac_uploads"

UPLOAD_DIR="$ROOT_DIR"
DOCKERFILE="$UPLOAD_DIR/Dockerfile"

DATE_TAG=$(date +"%Y%m%d_%H%M")
LATEST_TAG="deploy_latest"
TIME_TAG="deploy_${DATE_TAG}"

# ==============================
# Validate paths
# ==============================
if [ ! -f "$DOCKERFILE" ]; then
  echo "❌ Không tìm thấy Dockerfile: $DOCKERFILE"
  exit 1
fi

# ==============================
# Build image
# ==============================
echo "👉 Build service pdf"
docker build \
  -f "$DOCKERFILE" \
  -t "${IMAGE_NAME}:${LATEST_TAG}" \
  "$UPLOAD_DIR"

# ==============================
# Tag image theo thời gian
# ==============================
echo "👉 Tag image theo thời gian"
docker tag "${IMAGE_NAME}:${LATEST_TAG}" "${IMAGE_NAME}:${TIME_TAG}"

# ==============================
# Push Docker Hub
# ==============================
echo "👉 Push image lên Docker Hub"
docker push "${IMAGE_NAME}:${LATEST_TAG}"
docker push "${IMAGE_NAME}:${TIME_TAG}"

# ==============================
# Done
# ==============================
echo "✅ DONE:"
echo " - ${IMAGE_NAME}:${LATEST_TAG}"
echo " - ${IMAGE_NAME}:${TIME_TAG}"
