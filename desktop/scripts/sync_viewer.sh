#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${VIEWER_SOURCE_DIR:-${ROOT_DIR}/../docs}"
TARGET_DIR="${ROOT_DIR}/www/viewer"

if [ ! -d "${SOURCE_DIR}" ]; then
  echo "Missing viewer docs at ${SOURCE_DIR}" >&2
  exit 1
fi

mkdir -p "${TARGET_DIR}"
shopt -s dotglob nullglob
rm -rf "${TARGET_DIR}"/*
if [[ -n "$(git -C "${ROOT_DIR}/.." ls-files --cached --ignored --exclude-from=.gitignore -- docs)" ]]; then
  echo "Ignored file tracked in docs/" >&2
  exit 1
fi
git -C "${SOURCE_DIR}" ls-files -z -- . |
  tar -C "${SOURCE_DIR}" -cf - --no-recursion --null -T - |
  tar -C "${TARGET_DIR}" -xf -

echo "Synced ${SOURCE_DIR} -> ${TARGET_DIR}"
