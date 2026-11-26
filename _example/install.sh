pkg_install() {
  webi_extract
  rm -rf "$WEBI_OPT_DIR"
  mkdir -p "$WEBI_OPT_DIR"
  cp -R "$WEBI_EXTRACT_DIR"/. "$WEBI_OPT_DIR"/

  chmod +x "$WEBI_OPT_DIR/mytool"
  ln -sf "$WEBI_OPT_DIR/mytool" "$WEBI_BIN_DIR/mytool"
}

pkg_post_install() {
  webi_path_add
  printf 'Installed %s %s to %s/%s\n' "$WEBI_PKG" "$WEBI_TAG" "$WEBI_BIN_DIR" "$WEBI_PKG"
}

