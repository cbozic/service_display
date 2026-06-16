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

# Account = repo owner from the origin URL (e.g. github.com/cbozic/... -> cbozic).
# This avoids using whichever gh account happens to be "active" in the shell.
# Override with SLIDES_GH_USER if the owner != your gh account name.
GH_ACCOUNT="${SLIDES_GH_USER:-$(printf '%s' "$ORIGIN_URL" | sed -E 's#.*github\.com[:/]([^/]+)/.*#\1#')}"

if ! gh auth token --user "$GH_ACCOUNT" >/dev/null 2>&1; then
  echo "No gh account '$GH_ACCOUNT' is logged in. Run: gh auth login --hostname github.com" >&2
  echo "(or set SLIDES_GH_USER to the correct gh account name)" >&2
  exit 1
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

cd "$TMPDIR"
git init -q -b slides-assets
git remote add origin "$ORIGIN_URL"
cp "$SOURCE" slides.gif
git add slides.gif
git \
  -c user.name="$GH_ACCOUNT" \
  -c user.email="${GH_ACCOUNT}@users.noreply.github.com" \
  commit -q -m "Update slides asset"

# Push as $GH_ACCOUNT regardless of the active gh account. The leading empty
# credential.helper resets the inherited global helper (which returns the active
# account's token); our helper then fetches the token for $GH_ACCOUNT. The token
# is produced inside the helper and written only on git's credential protocol, so
# it never appears in the process list.
git \
  -c credential.helper= \
  -c credential.helper="!f() { test \"\$1\" = get && { echo username=x-access-token; echo \"password=\$(gh auth token --user $GH_ACCOUNT)\"; }; }; f" \
  push -f origin HEAD:slides-assets

echo
echo "Pushed $(basename "$SOURCE") to the slides-assets branch."
echo "URL: https://raw.githubusercontent.com/cbozic/service_display/slides-assets/slides.gif"
