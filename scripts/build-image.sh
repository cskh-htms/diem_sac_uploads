#!/bin/bash
set -e

# ==============================
# Resolve paths
# ==============================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ==============================
# Config
# ==============================
IMAGE_NAME="cskhhtms/diem_sac_uploads"

UPLOAD_DIR="$ROOT_DIR"
DOCKERFILE="$UPLOAD_DIR/Dockerfile"
AVERSIONS_DIR="$ROOT_DIR/.aversions"

DATE_TAG=$(date +"%Y%m%d_%H%M")
LATEST_TAG="deploy_latest"
TIME_TAG="deploy_${DATE_TAG}"
LATEST_AVERSION_FILE=""
LATEST_AVERSION_NOTE=""

# ==============================
# Validate paths
# ==============================
if [ ! -f "$DOCKERFILE" ]; then
  echo "Khong tim thay Dockerfile: $DOCKERFILE"
  exit 1
fi

if [ -d "$AVERSIONS_DIR" ]; then
  LATEST_AVERSION_FILE="$(find "$AVERSIONS_DIR" -maxdepth 1 -type f -printf '%T@ %f\n' | sort -nr | head -n 1 | cut -d' ' -f2-)"

  if [ -n "$LATEST_AVERSION_FILE" ] && [ -f "$AVERSIONS_DIR/$LATEST_AVERSION_FILE" ]; then
    LATEST_AVERSION_NOTE="$(tr '\r\n' ' ' < "$AVERSIONS_DIR/$LATEST_AVERSION_FILE" | sed 's/[[:space:]]\+/ /g' | sed 's/^ //; s/ $//')"
  fi
fi

# ==============================
# Build image
# ==============================
echo "Build service upload"

BUILD_ARGS=(
  -f "$DOCKERFILE"
  -t "${IMAGE_NAME}:${LATEST_TAG}"
)

if [ -n "$LATEST_AVERSION_FILE" ]; then
  echo "using aversion file: ${LATEST_AVERSION_FILE}"
  BUILD_ARGS+=(
    --label "com.diemsac.aversion.file=${LATEST_AVERSION_FILE}"
    --label "org.opencontainers.image.version=${LATEST_AVERSION_FILE}"
  )
fi

if [ -n "$LATEST_AVERSION_NOTE" ]; then
  BUILD_ARGS+=(
    --label "com.diemsac.aversion.note=${LATEST_AVERSION_NOTE}"
    --label "org.opencontainers.image.description=${LATEST_AVERSION_NOTE}"
  )
fi

docker build \
  "${BUILD_ARGS[@]}" \
  "$UPLOAD_DIR"

# ==============================
# Tag image theo thoi gian
# ==============================
echo "Tag image theo thoi gian"
docker tag "${IMAGE_NAME}:${LATEST_TAG}" "${IMAGE_NAME}:${TIME_TAG}"

# ==============================
# Push Docker Hub
# ==============================
echo "Push image len Docker Hub"
docker push "${IMAGE_NAME}:${LATEST_TAG}"
docker push "${IMAGE_NAME}:${TIME_TAG}"

# ==============================
# Done
# ==============================
echo "DONE:"
echo " - ${IMAGE_NAME}:${LATEST_TAG}"
echo " - ${IMAGE_NAME}:${TIME_TAG}"

if [ -n "$LATEST_AVERSION_FILE" ]; then
  echo " - aversion file: ${LATEST_AVERSION_FILE}"
fi
