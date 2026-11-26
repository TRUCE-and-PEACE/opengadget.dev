#!/bin/sh
set -e
set -u

WEBI_HOST={{WEBI_HOST}}
WEBI_PKG={{WEBI_PKG}}
WEBI_VER={{WEBI_VER}}

_os="$(uname -s 2>/dev/null || printf 'unknown')"
case "$_os" in
  Darwin*) _os='macos' ;;
  Linux*)  _os='linux' ;;
  *)
    printf 'error: unsupported OS "%s"\n' "$_os" >&2
    exit 1
    ;;
esac

_arch="$(uname -m 2>/dev/null || printf 'unknown')"
case "$_arch" in
  x86_64|amd64)  _arch='amd64' ;;
  aarch64|arm64) _arch='arm64' ;;
  i386|i686|x86) _arch='x86' ;;
  *)             _arch='unknown' ;;
esac

_formats=''
if command -v tar >/dev/null 2>&1; then _formats="${_formats}tar,"; fi
if command -v unzip >/dev/null 2>&1; then _formats="${_formats}zip,"; fi
if command -v xz >/dev/null 2>&1; then _formats="${_formats}xz,"; fi
_formats="${_formats%,}"
if [ -z "$_formats" ]; then _formats='none'; fi

_ua="curl/opengadget-bootstrap (os=${_os}; arch=${_arch}; formats=${_formats})"
_url="${WEBI_HOST}/api/installers/${WEBI_PKG}@${WEBI_VER}.sh"

_tmp="$(mktemp "${TMPDIR:-/tmp}/opengadget.XXXXXX")"
trap 'rm -f "$_tmp"' EXIT INT TERM

if command -v curl >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -fsSL -A "$_ua" "$_url" -o "$_tmp"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$_tmp" --user-agent="$_ua" "$_url"
else
  printf 'error: curl or wget is required\n' >&2
  exit 1
fi

sh "$_tmp"

