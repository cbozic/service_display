#!/usr/bin/env bash
# Push a single GIF to the `slides-assets` orphan branch as `slides.gif`.
# The deployed app fetches it from raw.githubusercontent.com, which (unlike
# release-download URLs) returns CORS headers browsers will accept.
#
# Usage: ./scripts/update-slides.sh path/to/your-slides.gif
#
# Re-run with a new file to replace the asset. The orphan branch carries no
# history relative to main, so updates don't bloat anything cloned with main.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <path/to/slides.gif>" >&2
  exit 1
fi

SOURCE="$1"
if [[ ! -f "$SOURCE" ]]; then
  echo "File not found: $SOURCE" >&2
  exit 1
fi
SOURCE=$(cd "$(dirname "$SOURCE")" && pwd)/$(basename "$SOURCE")

ORIG=$(pwd)
ORIGIN_URL=$(git -C "$ORIG" remote get-url origin)
USER_EMAIL=$(git -C "$ORIG" config user.email)
USER_NAME=$(git -C "$ORIG" config user.name)

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

cd "$TMPDIR"
git init -q -b slides-assets
git remote add origin "$ORIGIN_URL"
cp "$SOURCE" slides.gif
git add slides.gif
git \
  -c user.email="$USER_EMAIL" \
  -c user.name="$USER_NAME" \
  commit -q -m "Update slides asset"
git push -f origin HEAD:slides-assets

echo
echo "Pushed $(basename "$SOURCE") to the slides-assets branch."
echo "URL: https://raw.githubusercontent.com/cbozic/service_display/slides-assets/slides.gif"
