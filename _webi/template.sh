#!/bin/sh
set -e
set -u

WEBI_PKG={{WEBI_PKG}}
WEBI_VERSION={{WEBI_VERSION}}
WEBI_TAG={{WEBI_TAG}}
WEBI_PKG_URL={{WEBI_PKG_URL}}
WEBI_HOST={{WEBI_HOST}}

WEBI_OPT_DIR="$HOME/.local/opt/${WEBI_PKG}-${WEBI_TAG}"
WEBI_BIN_DIR="$HOME/.local/bin"
WEBI_ENV_DIR="$HOME/.config/envman"
WEBI_TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/webi-${WEBI_PKG}.XXXXXX")"
WEBI_ARCHIVE="$WEBI_TMP_DIR/pkg.archive"
WEBI_EXTRACT_DIR="$WEBI_TMP_DIR/extract"

trap 'rm -rf "$WEBI_TMP_DIR"' EXIT INT TERM

webi_download() {
  mkdir -p "$WEBI_TMP_DIR" "$WEBI_BIN_DIR"
  printf 'Downloading %s (%s)...\n' "$WEBI_PKG" "$WEBI_TAG"
  if command -v curl >/dev/null 2>&1; then
    curl --proto '=https' --tlsv1.2 -fsSL -A 'opengadget.dev/1.0' "$WEBI_PKG_URL" -o "$WEBI_ARCHIVE"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$WEBI_ARCHIVE" --user-agent='opengadget.dev/1.0' "$WEBI_PKG_URL"
  else
    printf 'error: curl or wget is required\n' >&2
    exit 1
  fi
}

webi_extract() {
  mkdir -p "$WEBI_EXTRACT_DIR"
  case "$WEBI_PKG_URL" in
    *.zip|*/zipball/*)
      unzip -q "$WEBI_ARCHIVE" -d "$WEBI_EXTRACT_DIR"
      ;;
    *.tar.xz|*.txz)
      tar -xJf "$WEBI_ARCHIVE" -C "$WEBI_EXTRACT_DIR"
      ;;
    *)
      tar -xzf "$WEBI_ARCHIVE" -C "$WEBI_EXTRACT_DIR"
      ;;
  esac
}

webi_path_add() {
  mkdir -p "$WEBI_ENV_DIR"
  _env_file="$WEBI_ENV_DIR/PATH.env"
  _line='export PATH="$HOME/.local/bin:$PATH"'
  if [ ! -f "$_env_file" ] || ! grep -Fq '.local/bin' "$_env_file"; then
    printf '%s\n' "$_line" >> "$_env_file"
  fi
  _src='[ -s "$HOME/.config/envman/PATH.env" ] && . "$HOME/.config/envman/PATH.env"'
  for _rc in "$HOME/.profile" "$HOME/.bashrc" "$HOME/.zshrc"; do
    if [ -f "$_rc" ] && grep -Fq 'envman/PATH.env' "$_rc"; then
      continue
    fi
    if [ -f "$_rc" ] || [ "$_rc" = "$HOME/.profile" ]; then
      printf '\n# Generated for envman / opengadget.dev. Do not edit.\n%s\n' "$_src" >> "$_rc"
    fi
  done
}

pkg_install() {
  webi_extract
  rm -rf "$WEBI_OPT_DIR"
  mkdir -p "$WEBI_OPT_DIR"
  cp -R "$WEBI_EXTRACT_DIR"/. "$WEBI_OPT_DIR"/
  if [ -f "$WEBI_OPT_DIR/$WEBI_PKG" ]; then
    chmod +x "$WEBI_OPT_DIR/$WEBI_PKG"
    ln -sf "$WEBI_OPT_DIR/$WEBI_PKG" "$WEBI_BIN_DIR/$WEBI_PKG"
  fi
}

pkg_post_install() {
  webi_path_add
  printf 'Installed %s %s to %s\n' "$WEBI_PKG" "$WEBI_TAG" "$WEBI_BIN_DIR"
}

{{PKG_INSTALL_SCRIPT}}

webi_main() {
  webi_download
  pkg_install
  pkg_post_install
}

webi_main

